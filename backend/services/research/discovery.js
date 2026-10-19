import { createHash } from 'node:crypto';
import { researchError } from '../../config/research.js';
import { fetchJson, deepSeekJson } from './providers.js';
import { searchWeb, webSearchProviders } from './webSearch.js';

const searchCache = new Map();
const validVideoId = id => /^[a-zA-Z0-9_-]{11}$/.test(id || '');
export function primaryLanguage(value) {
  const language = typeof value === 'string' ? value.split(/[-_]/)[0].toLowerCase() : 'en';
  return /^[a-z]{2}$/.test(language) ? language : 'en';
}
export function publicHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    // DNS and redirect checks are enforced again by the collector.
    if (url.port && !['80', '443'].includes(url.port)) return null;
    if (!url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(url.hostname)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

async function cachedJson(url, options, signal, onMiss = () => {}) {
  const key = createHash('sha256').update(url).digest('hex');
  const cached = searchCache.get(key);
  if (cached?.expires > Date.now()) return structuredClone(cached.data);
  onMiss();
  const data = await fetchJson(url, options, signal);
  if (searchCache.size >= 100) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { data, expires: Date.now() + 3600000 });
  return data;
}

export function parseDuration(value = '') {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : null;
}

export function selectCompetitors(items, idea, context) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'how', 'your', 'you', 'are', 'why', 'what', 'from', 'into']);
  const terms = new Set(((idea.title || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter(term => !stopWords.has(term)));
  const language = primaryLanguage(context.language);
  const preferShort = /\bshorts?\b/i.test(idea.suggested_format || '');
  const candidates = items.filter(video => validVideoId(video.id) && video.snippet?.channelId !== context.ownChannelId)
    .filter(video => !video.snippet?.defaultAudioLanguage || primaryLanguage(video.snippet.defaultAudioLanguage) === language)
    .map((video, index) => {
      const title = video.snippet?.title || '';
      const matches = [...terms].filter(term => title.toLowerCase().includes(term)).length;
      const duration = parseDuration(video.contentDetails?.duration);
      const formatMatch = duration != null && (preferShort ? duration <= 180 : duration > 180);
      const rawViews = video.statistics?.viewCount;
      const views = rawViews == null || rawViews === '' ? null : Number(rawViews);
      const knownViews = Number.isFinite(views) && views >= 0;
      const ageDays = (Date.now() - Date.parse(video.snippet?.publishedAt)) / 86400000;
      // Logarithms reward demonstrated performance without letting a viral outlier dominate relevance.
      const reach = knownViews ? Math.min(6, Math.log10(1 + views)) : 0;
      const dailyViews = knownViews && ageDays >= 1 ? views / ageDays : 0;
      const momentum = Math.min(1.5, Math.log10(1 + dailyViews) / 3);
      const topic = terms.size ? matches / terms.size : 0;
      return { video, matches, score: topic * 8 + (formatMatch ? 2 : 0) + reach + momentum + 0.1 / (index + 1) };
    });
  // Keep broad search hits from displacing topical videos when there is enough topical evidence.
  const topical = candidates.filter(candidate => candidate.matches > 0);
  const ranked = (new Set(topical.map(candidate => candidate.video.id)).size >= 3 ? topical : candidates)
    .sort((a, b) => b.score - a.score);
  const seen = new Set();
  const perChannel = new Map();
  const selected = [];
  for (const { video } of ranked) {
    const channel = video.snippet.channelId;
    if (seen.has(video.id) || (perChannel.get(channel) || 0) >= 2) continue;
    seen.add(video.id);
    perChannel.set(channel, (perChannel.get(channel) || 0) + 1);
    selected.push(video);
    if (selected.length === 5) break;
  }
  return selected;
}

export async function discover(idea, context, config, run) {
  if (!config.youtubeKey || config.youtubeKey === 'your_youtube_api_key') {
    throw researchError('YouTube research is not configured. Set the backend YouTube API key.');
  }
  const queries = await deepSeekJson(
    'Generate focused competitor discovery queries for this YouTube idea and audience. Return JSON ' +
    '{"youtubeQueries":["exact topic","audience question","recent topic"],"webQueries":["topic explanation","practical topic guide"]}. ' +
    'Use one to three YouTube queries and one or two web queries, each at most 160 characters. Do not supply URLs.',
    { idea, context }, run, result => {
      for (const [field, max] of [['youtubeQueries', 3], ['webQueries', 2]]) {
        if (!Array.isArray(result?.[field]) || !result[field].length || result[field].length > max ||
          result[field].some(q => typeof q !== 'string' || !q.trim() || q.length > 160 || /https?:\/\//i.test(q))) {
          throw new Error('Invalid research queries');
        }
        result[field] = [...new Set(result[field].map(q => q.trim()))];
      }
      return result;
    }
  );
  const limitations = [];
  const ids = new Set();
  let lastSearchError;
  const google = async (method, params) => {
    run.log?.('youtube.request', { method, query: params.q });
    const url = 'https://www.googleapis.com/youtube/v3/' + method + '?' +
      new URLSearchParams({ ...params, key: config.youtubeKey });
    const count = () => { run.usage.youtubeRequests = (run.usage.youtubeRequests || 0) + 1; };
    if (method === 'search') return cachedJson(url, {}, run.signal, count);
    // A report refresh gets fresh metrics and comment samples, not cached observations.
    count();
    return fetchJson(url, {}, run.signal);
  };
  const searches = [];
  for (const [index, q] of queries.youtubeQueries.entries()) {
    // Mix topical results with proven performers. At most 48 unique IDs fit one details request.
    const order = index === 1 || queries.youtubeQueries.length === 1 ? 'viewCount' : 'relevance';
    const params = { part: 'snippet', type: 'video', q, order, maxResults: '16', relevanceLanguage: primaryLanguage(context.language) };
    if (index === 2) params.publishedAfter = new Date(Date.now() - 180 * 86400000).toISOString();
    searches.push({ query: q, order, publishedAfter: params.publishedAfter || null });
    try {
      const data = await google('search', params);
      for (const item of data.items || []) if (validVideoId(item.id?.videoId)) ids.add(item.id.videoId);
    } catch (error) {
      lastSearchError = error;
      limitations.push('One YouTube discovery query could not be completed.');
    }
  }
  if (!ids.size) throw lastSearchError || researchError('No competing videos were found for this idea.');
  const details = await google('videos', { part: 'snippet,statistics,contentDetails', id: [...ids].join(',') });
  const videos = selectCompetitors(details.items || [], idea, context);
  run.log?.('videos.selected', { count: videos.length, views: videos.map(video => Number(video.statistics?.viewCount) || 0) });
  if (!videos.length) throw researchError('No suitable competing videos were found for this audience.');

  const candidates = [];
  const webSearches = [];
  let providers = [];
  try { providers = webSearchProviders(config); }
  catch (error) { limitations.push(error.message); }
  if (providers.length) {
    // A separate community query keeps audience questions from being crowded out by articles.
    const communityQuery = 'site:reddit.com ' + queries.webQueries[0];
    for (const q of [...queries.webQueries, communityQuery]) {
      const result = await searchWeb(q, primaryLanguage(context.language), config, run);
      limitations.push(...result.warnings);
      webSearches.push({ query: q, provider: result.provider });
      for (const item of result.results) {
        const url = publicHttpUrl(item.url);
        if (!url) continue;
        const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) continue;
        const discussion = /(^|\.)reddit\.com$/.test(host);
        // Search engines may ignore site: filters; verify the returned host and thread path.
        if (q === communityQuery && !discussion) continue;
        if (discussion && !/\/comments\//.test(new URL(url).pathname)) continue;
        candidates.push({ url, host, title: item.title, provider: result.provider,
          kind: discussion ? 'discussion' : 'web' });
      }
    }
  } else limitations.push('General web search is not configured; this is YouTube-only research.');
  const pages = [];
  const domains = new Set();
  const addPage = page => {
    if (!page || domains.has(page.host) || pages.length >= 3) return;
    domains.add(page.host);
    pages.push(page);
  };
  // Reserve one of the three collection slots for a discussion when one is found.
  candidates.filter(page => page.kind === 'web').forEach(page => {
    if (pages.length < 2) addPage(page);
  });
  addPage(candidates.find(page => page.kind === 'discussion'));
  candidates.forEach(addPage);
  if (providers.length && !pages.length) limitations.push('No usable general web pages or discussions were discovered.');
  return { videos, pages, queries: { youtube: searches, web: webSearches }, limitations: [...new Set(limitations)], google };
}
