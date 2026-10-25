import { createHash } from 'node:crypto';
import { fetchJson, withTransientRetry } from './providers.js';
import { createSearchGate } from './searchGate.js';
import { researchError } from '../../config/research.js';
import { imagePreviewUrl, publicHttpUrl } from './urls.js';

const cache = new Map();
const searchGate = createSearchGate(2);

function engineFailures(data) {
  return (Array.isArray(data?.unresponsive_engines) ? data.unresponsive_engines : []).slice(0, 15).map(item => ({
    engine: String(Array.isArray(item) ? item[0] : item).slice(0, 80),
    reason: String(Array.isArray(item) ? item[1] || 'unavailable' : 'unavailable').slice(0, 120)
  }));
}

function failureDetails(error) {
  const code = error.code || error.cause?.code || (error.upstreamStatus ? 'HTTP_ERROR' :
    error.name === 'SyntaxError' ? 'INVALID_JSON' : error.name === 'TimeoutError' ? 'TIMEOUT' : 'REQUEST_FAILED');
  return { status: error.upstreamStatus, error: code, query: error.query,
    message: code === 'EMPTY_RESULTS' ? 'Search returned no usable results.' :
      code === 'INVALID_RESPONSE' ? 'Search JSON did not contain a results array.' :
        code === 'INVALID_JSON' ? 'Search returned invalid JSON.' : 'Search request failed.',
    ...(error.engineFailures?.length ? { engineFailures: error.engineFailures } : {}) };
}

function broaderQuery(query, category) {
  return query.replace(/(?:^|\s)-?site:\S+/gi, ' ').replace(/["“”]/g, '')
    .replace(/\b(?:original study|official documentation|primary sources|high resolution)\b/gi, ' ')
    .trim().split(/\s+/).slice(0, category === 'images' ? 5 : 8).join(' ');
}

async function searchWithRecovery(provider, query, language, config, run, category = 'general') {
  try { return await withTransientRetry(() => queryProvider(provider, query, language, config, run, category),
    { signal: run.signal, log: run.log, event: 'search.retry', provider, category, query, reason: 'transient_failure' }); }
  catch (error) {
    run.signal?.throwIfAborted();
    error.query = query;
    const broader = broaderQuery(query, category);
    // Retry an empty search once, without a restrictive site filter or excess keywords.
    // Network failures, invalid JSON and HTTP errors need service repair or another provider.
    if (provider !== 'searxng' || error.code !== 'EMPTY_RESULTS' || !broader || broader === query.trim()) throw error;
    run.log?.('search.failed', { provider, category, ...failureDetails(error) });
    run.log?.('search.retry', { provider, category, query: broader, originalQuery: query, reason: 'broader_query', attempt: 2 });
    try { return await queryProvider(provider, broader, language, config, run, category); }
    catch (retryError) { retryError.query = broader; throw retryError; }
  }
}

export function webSearchProviders(config) {
  const mode = config.webProvider || 'auto';
  if (!['auto', 'searxng', 'brave', 'none'].includes(mode)) {
    throw researchError('WEB_SEARCH_PROVIDER must be auto, searxng, brave or none.');
  }
  if (mode === 'none') return [];
  const providers = [];
  if ((mode === 'auto' || mode === 'searxng') && config.searxngUrl) providers.push('searxng');
  if ((mode === 'auto' || mode === 'brave') && config.braveKey) providers.push('brave');
  if (mode !== 'auto' && !providers.length) throw researchError('The selected web search provider is not configured.');
  return providers;
}

async function queryProvider(provider, query, language, config, run, category = 'general') {
  let url, headers = {};
  if (provider === 'searxng') {
    // The endpoint is server configuration, never a user-supplied destination.
    const base = new URL(config.searxngUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      throw researchError('SEARXNG_URL must be an HTTP(S) instance URL without credentials or query parameters.');
    }
    base.pathname = base.pathname.replace(/\/$/, '') + '/search';
    base.search = new URLSearchParams({ q: query, format: 'json', categories: category, language, safesearch: '1' }).toString();
    url = base.href;
  } else {
    url = 'https://api.search.brave.com/res/v1/web/search?' + new URLSearchParams({ q: query, count: '10' });
    headers = { 'X-Subscription-Token': config.braveKey };
  }
  const key = createHash('sha256').update(JSON.stringify([url, headers])).digest('hex');
  const hit = cache.get(key);
  if (hit?.expires > Date.now()) {
    run.log?.('search.cache_hit', { provider, category, query, results: hit.results.length });
    return structuredClone(hit.results);
  }
  const data = await searchGate(async () => {
    run.log?.('search.started', { provider, category, query, endpoint: url });
    run.usage.webRequests = (run.usage.webRequests || 0) + 1;
    run.usage[provider + 'Requests'] = (run.usage[provider + 'Requests'] || 0) + 1;
    return fetchJson(url, { headers }, run.signal, 12000);
  }, run.signal);
  const items = provider === 'searxng' ? data?.results : data?.web?.results;
  if (!Array.isArray(items)) throw Object.assign(researchError('Web search returned an invalid response.'), { code: 'INVALID_RESPONSE' });
  const failures = engineFailures(data);
  const results = items.slice(0, category === 'images' ? 60 : 20).filter(item => item && typeof item.url === 'string').map(item => ({
    url: item.url, title: String(item.title || '').slice(0, 300),
    // Discovery metadata only. Snippets never become collected source evidence.
    snippet: String(item.content || item.description || '').slice(0, 1000), provider,
    ...(category === 'images' ? {
      imageUrl: publicHttpUrl(typeof item.img_src === 'string' && item.img_src.startsWith('//') ? 'https:' + item.img_src : item.img_src) || '',
      thumbnailUrl: imagePreviewUrl(item.thumbnail_src) || imagePreviewUrl(item.thumbnail) || '',
      attribution: typeof item.author === 'string' ? item.author.slice(0, 200) : '',
      license: typeof item.license === 'string' ? item.license.slice(0, 200) : '',
      resolution: typeof item.resolution === 'string' ? item.resolution.slice(0, 80) : '',
      width: Number(item.width) || null, height: Number(item.height) || null
    } : {})
  }));
  // Empty or wholly failed engine responses should allow a configured fallback.
  if (!results.length) throw Object.assign(researchError('Web search returned no usable results.'), { code: 'EMPTY_RESULTS', engineFailures: failures });
  run.log?.('search.completed', { provider, category, results: results.length,
    unavailableEngines: failures.length, ...(failures.length ? { engineFailures: failures } : {}) });
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(key, { results, expires: Date.now() + 3600000 });
  return structuredClone(results);
}

export async function searchImages(query, language, config, run) {
  if (!config.searxngUrl || !['auto', 'searxng'].includes(config.webProvider || 'auto')) {
    return { results: [], warnings: ['Image discovery requires a configured SearXNG instance.'] };
  }
  try {
    run.signal?.throwIfAborted();
    return { results: await searchWithRecovery('searxng', query, language, config, run, 'images'), warnings: [] };
  } catch (error) {
    run.signal?.throwIfAborted();
    run.log?.('search.failed', { provider: 'searxng', category: 'images', ...failureDetails(error) });
    return { results: [], warnings: [searchWarning(error, 'Image search')] };
  }
}

export async function searchWeb(query, language, config, run) {
  const providers = webSearchProviders(config);
  const warnings = [];
  for (const provider of providers) {
    run.signal?.throwIfAborted();
    try {
      return { results: await searchWithRecovery(provider, query, language, config, run), provider, warnings };
    } catch (error) {
      run.signal?.throwIfAborted();
      run.log?.('search.failed', { provider, category: 'general', ...failureDetails(error) });
      warnings.push(searchWarning(error, provider === 'searxng' ? 'SearXNG search' : 'Brave web search'));
    }
  }
  return { results: [], provider: null, warnings };
}

function searchWarning(error, label) {
  const details = failureDetails(error);
  const engines = error.engineFailures?.map(item => `${item.engine}: ${item.reason}`).join('; ');
  if (details.error === 'EMPTY_RESULTS') return `${label} returned no usable results.${engines ? ' Engine failures: ' + engines + '.' : ' Try a broader query or check the enabled engines.'}`;
  if (['INVALID_JSON', 'INVALID_RESPONSE'].includes(details.error)) return `${label} returned an invalid response. Check SearXNG JSON output and the configured service URL.`;
  return `${label} was unavailable (${error.upstreamStatus ? 'HTTP ' + error.upstreamStatus : details.error}). Check the service and enabled engines.`;
}
