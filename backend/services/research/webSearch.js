import { createHash } from 'node:crypto';
import { fetchJson } from './providers.js';
import { researchError } from '../../config/research.js';

const cache = new Map();

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
  run.log?.('search.started', { provider, category, query, endpoint: url });
  run.usage.webRequests = (run.usage.webRequests || 0) + 1;
  run.usage[provider + 'Requests'] = (run.usage[provider + 'Requests'] || 0) + 1;
  const data = await fetchJson(url, { headers }, run.signal, 12000);
  const items = provider === 'searxng' ? data?.results : data?.web?.results;
  if (!Array.isArray(items)) throw researchError('Web search returned an invalid response.');
  const results = items.slice(0, 20).filter(item => item && typeof item.url === 'string').map(item => ({
    url: item.url, title: String(item.title || '').slice(0, 300),
    // Discovery metadata only. Snippets never become collected source evidence.
    snippet: String(item.content || item.description || '').slice(0, 1000), provider,
    ...(category === 'images' ? {
      imageUrl: typeof item.img_src === 'string' ? item.img_src : '',
      thumbnailUrl: typeof item.thumbnail_src === 'string' ? item.thumbnail_src :
        typeof item.thumbnail === 'string' ? item.thumbnail : '',
      attribution: typeof item.author === 'string' ? item.author.slice(0, 200) : '',
      license: typeof item.license === 'string' ? item.license.slice(0, 200) : ''
    } : {})
  }));
  // Empty or wholly failed engine responses should allow a configured fallback.
  if (!results.length) throw researchError('Web search returned no usable results.');
  run.log?.('search.completed', { provider, category, results: results.length,
    unavailableEngines: Array.isArray(data.unresponsive_engines) ? data.unresponsive_engines.length : 0 });
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
    return { results: await queryProvider('searxng', query, language, config, run, 'images'), warnings: [] };
  } catch (error) {
    run.signal?.throwIfAborted();
    run.log?.('search.failed', { provider: 'searxng', category: 'images', status: error.upstreamStatus, error: error.cause?.code || error.name });
    return { results: [], warnings: ['Image search was unavailable or empty. Check that SearXNG is running with JSON output and image engines enabled.'] };
  }
}

export async function searchWeb(query, language, config, run) {
  const providers = webSearchProviders(config);
  const warnings = [];
  for (const provider of providers) {
    run.signal?.throwIfAborted();
    try {
      return { results: await queryProvider(provider, query, language, config, run), provider, warnings };
    } catch (error) {
      run.signal?.throwIfAborted();
      run.log?.('search.failed', { provider, category: 'general', status: error.upstreamStatus, error: error.cause?.code || error.name });
      warnings.push(provider === 'searxng'
        ? 'SearXNG search was unavailable or empty' + (error.upstreamStatus ? ' (HTTP ' + error.upstreamStatus + ')' : '') + '. Check that it is running, and check its URL, enabled engines and JSON output.'
        : 'Brave web search was unavailable or empty.');
    }
  }
  return { results: [], provider: null, warnings };
}
