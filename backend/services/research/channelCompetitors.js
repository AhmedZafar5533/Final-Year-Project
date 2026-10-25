import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import ChannelCompetitors from '../../models/ChannelCompetitors.js';
import { researchConfig, researchError } from '../../config/research.js';
import { fetchJson, withTransientRetry } from './providers.js';
import { mapLimited } from './evidence.js';
import { primaryLanguage, parseDuration } from './discovery.js';
import { publicHttpUrl } from './urls.js';
import { createResearchLogger } from './logger.js';

const pending = new Map();
const num = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const stop = new Set(['and', 'the', 'for', 'with', 'your', 'from', 'this', 'that', 'content', 'channel', 'videos', 'guides', 'official']);
const terms = text => [...new Set((String(text || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(word => !stop.has(word)))];
const median = values => { const sorted = values.filter(value => value !== null).sort((a, b) => a - b); return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : null; };

export function youtubeReader({ youtube, config = researchConfig(), run }) {
  return (method, params) => withTransientRetry(async () => {
    run.signal?.throwIfAborted();
    if (!youtube && (!config.youtubeKey || /^your_/.test(config.youtubeKey))) throw Object.assign(researchError('YouTube competitor discovery needs a connected channel or YOUTUBE_API_KEY.'), { retryable: false });
    run.usage.youtubeRequests = (run.usage.youtubeRequests || 0) + 1;
    if (youtube) {
      try {
        const response = await youtube[method].list(params, { timeout: 12000, signal: run.signal });
        return response.data;
      } catch (error) {
        error.upstreamStatus = error.response?.status;
        error.retryable = error.upstreamStatus === 429 || error.upstreamStatus >= 500 || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code);
        throw error;
      }
    }
    return fetchJson('https://www.googleapis.com/youtube/v3/' + method + '?' + new URLSearchParams({ ...params, key: config.youtubeKey }), {}, run.signal, 12000);
  }, { signal: run.signal, log: run.log, event: 'channel.youtube_retry', method });
}

export function summarizeCompetitor(channel, videos, { topicTerms, ownSubscribers, language }) {
  const content = [channel.snippet?.title, channel.snippet?.description,
    ...videos.map(video => video.snippet.title + ' ' + video.snippet.description)].join(' ').toLowerCase();
  const matchedTopics = topicTerms.filter(term => content.includes(term));
  const matchingUploads = videos.filter(video => topicTerms.some(term =>
    (video.snippet.title + ' ' + video.snippet.description).toLowerCase().includes(term)));
  const sampleLanguage = videos.map(video => video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage).filter(Boolean);
  if (sampleLanguage.length && sampleLanguage.every(value => primaryLanguage(value) !== language)) return null;
  if (!matchedTopics.length || !videos.length || !matchingUploads.length) return null;
  const subscriberCount = channel.statistics?.hiddenSubscriberCount ? null : num(channel.statistics?.subscriberCount);
  const ratio = ownSubscribers > 0 && subscriberCount !== null ? subscriberCount / ownSubscribers : null;
  const scaleSimilarity = ratio && ratio > 0 ? 1 / (1 + Math.abs(Math.log10(ratio))) : 0;
  const dates = videos.map(video => Date.parse(video.snippet.publishedAt)).filter(Number.isFinite).sort((a, b) => b - a);
  const medianViews = median(videos.map(video => num(video.statistics.viewCount)));
  return {
    channelId: channel.id, title: String(channel.snippet?.title || '').slice(0, 300),
    url: 'https://www.youtube.com/channel/' + channel.id,
    description: String(channel.snippet?.description || '').slice(0, 1600),
    thumbnailUrl: publicHttpUrl(channel.snippet?.thumbnails?.medium?.url) || null,
    subscriberCount, totalVideoCount: num(channel.statistics?.videoCount),
    matchedTopics, scale: ratio === null ? 'Size unavailable' : ratio >= 0.25 && ratio <= 4 ? 'Similar scale' : ratio > 4 ? 'Larger channel' : 'Smaller channel',
    selectionReason: 'Public channel and recent upload metadata match: ' + matchedTopics.slice(0, 8).join(', ') + '. Audience similarity is inferred from metadata, not private audience analytics.',
    sample: { videoCount: videos.length, relevantUploadCount: matchingUploads.length, medianViews,
      averageUploadSpacingDays: dates.length >= 2 ? Math.round((dates[0] - dates.at(-1)) / 86400000 / (dates.length - 1) * 10) / 10 : null,
      shortDurationVideos: videos.filter(video => (parseDuration(video.contentDetails.duration) ?? Infinity) <= 180).length },
    videos, score: matchedTopics.length + matchingUploads.length / videos.length * 2 + scaleSimilarity * 2
  };
}

export async function buildChannelCompetitors({ channel, niche, read, run }) {
  const language = primaryLanguage(channel.researchLanguage);
  const topicTerms = terms([niche.primary_niche, ...(niche.sub_niches || []), ...(niche.content_pillars || [])].join(' '));
  const queries = [...new Set([niche.primary_niche, niche.sub_niches?.[0] || niche.content_pillars?.[0]])]
    .filter(value => typeof value === 'string' && value.trim()).map(value => value.trim().slice(0, 140)).slice(0, 2);
  if (!queries.length) throw researchError('Analyze the channel niche before discovering competitors.', 400);
  const limitations = [];
  const candidateIds = new Set();
  let searchError;
  run.log?.('channels.discovery_started', { queries: queries.length });
  await mapLimited(queries, 2, async q => {
    try {
      const data = await read('search', { part: 'snippet', type: 'video', q, order: 'relevance', maxResults: '15', relevanceLanguage: language });
      for (const item of data.items || []) {
        const id = item.snippet?.channelId;
        if (typeof id === 'string' && /^[\w-]{1,64}$/.test(id) && id !== channel.youtubeChannelId && candidateIds.size < 20) candidateIds.add(id);
      }
    } catch (error) {
      searchError = error;
      run.log?.('channels.search_failed', { status: error.upstreamStatus, error: error.name });
      limitations.push('One niche discovery query was unavailable.');
    }
  });
  run.signal?.throwIfAborted();
  if (!candidateIds.size) throw searchError || researchError('No niche competitor channels could be discovered. Try refreshing later.');
  const details = await read('channels', { part: 'snippet,statistics,contentDetails', id: [...candidateIds].join(',') });
  const candidates = (details.items || []).filter(item => candidateIds.has(item.id) && item.contentDetails?.relatedPlaylists?.uploads)
    .map(item => ({ item, overlap: topicTerms.filter(term => (item.snippet?.title + ' ' + item.snippet?.description).toLowerCase().includes(term)).length }))
    .sort((a, b) => b.overlap - a.overlap).slice(0, 8).map(entry => entry.item);
  const uploadsByChannel = new Map();
  await mapLimited(candidates, 2, async candidate => {
    try {
      const uploads = await read('playlistItems', { part: 'contentDetails', playlistId: candidate.contentDetails.relatedPlaylists.uploads, maxResults: '6' });
      uploadsByChannel.set(candidate.id, new Set((uploads.items || []).map(item => item.contentDetails?.videoId).filter(id => /^[\w-]{11}$/.test(id || ''))));
    } catch { limitations.push('Recent uploads were unavailable for ' + candidate.snippet?.title + '.'); }
  });
  const videoIds = [...new Set([...uploadsByChannel.values()].flatMap(ids => [...ids]))].slice(0, 48);
  if (!videoIds.length) throw researchError('Competitor channels were found, but their recent uploads could not be collected.');
  const videoData = await read('videos', { part: 'snippet,statistics,contentDetails', id: videoIds.join(',') });
  const videos = (videoData.items || []).filter(video => videoIds.includes(video.id) && video.snippet?.title && video.snippet?.channelId && video.snippet.channelId !== channel.youtubeChannelId).map(video => ({
    id: video.id, snippet: { ...video.snippet, description: String(video.snippet.description || '').slice(0, 2000) },
    statistics: video.statistics || {}, contentDetails: video.contentDetails || {}, comments: []
  }));
  const channels = candidates.map(candidate => summarizeCompetitor(candidate,
    videos.filter(video => video.snippet.channelId === candidate.id && uploadsByChannel.get(candidate.id)?.has(video.id))
      .filter(video => !(video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage) || primaryLanguage(video.snippet.defaultAudioLanguage || video.snippet.defaultLanguage) === language),
    { topicTerms, ownSubscribers: num(channel.subscriberCount), language })).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 5);
  if (!channels.length) throw researchError('No channels with matching niche metadata and audience language were found.');
  await mapLimited(channels.flatMap(candidate => [...candidate.videos].sort((a, b) => (num(b.statistics.viewCount) || 0) - (num(a.statistics.viewCount) || 0)).slice(0, 2)), 2, async video => {
    try {
      const data = await read('commentThreads', { part: 'snippet', videoId: video.id, order: 'relevance', maxResults: '10', textFormat: 'plainText' });
      video.comments = (data.items || []).map(item => item.snippet?.topLevelComment).filter(item => item?.id && item.snippet).map(item => ({
        id: item.id, text: String(item.snippet.textOriginal || item.snippet.textDisplay || '').slice(0, 600),
        complete: String(item.snippet.textOriginal || item.snippet.textDisplay || '').length <= 600,
        likes: num(item.snippet.likeCount), publishedAt: item.snippet.publishedAt || null
      })).filter(item => item.text);
      video.commentsSampled = true;
    } catch { limitations.push('Top comments were unavailable for ' + video.id + '.'); }
  });
  const result = { schemaVersion: 1, basis: 'public_metadata', ownChannelId: channel.youtubeChannelId,
    niche: niche.primary_niche, language, analyzedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + researchConfig().freshnessMs).toISOString(),
    status: limitations.length ? 'partial' : 'completed', channels: channels.map(({ score: _score, ...candidate }) => candidate),
    limitations: [...new Set(limitations)], usage: run.usage };
  run.log?.('channels.discovery_completed', { channels: channels.length, videos: channels.reduce((sum, item) => sum + item.videos.length, 0) });
  return result;
}

export async function getChannelCompetitors({ userId, channel, niche, youtube, config = researchConfig(), force = false,
  signal: callerSignal, log = createResearchLogger('channels'), usage = {},
  store = mongoose.connection.readyState === 1 ? ChannelCompetitors : null }) {
  if (!channel?.youtubeChannelId || !userId) return null;
  const ownChannelId = channel.youtubeChannelId;
  const signal = callerSignal ? AbortSignal.any([callerSignal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000);
  const contextKey = createHash('sha256').update(JSON.stringify([niche.primary_niche,
    [...(niche.sub_niches || [])].sort(), [...(niche.content_pillars || [])].sort(), primaryLanguage(channel.researchLanguage)])).digest('hex');
  const key = JSON.stringify([String(userId), ownChannelId, contextKey]);
  let previous;
  if (store) {
    previous = await store.findOne({ userId, ownChannelId, contextKey }).lean();
    if (!force && previous?.expiresAt > new Date()) { log('channels.cache_hit', { channels: previous.data.channels.length }); return previous.data; }
  }
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    try {
      const run = { signal, usage, log };
      const data = await buildChannelCompetitors({ channel, niche, run, read: youtubeReader({ youtube, config, run }) });
      callerSignal?.throwIfAborted();
      if (store) {
        const update = { $set: { contextKey, data, expiresAt: new Date(data.expiresAt) } };
        try { await store.findOneAndUpdate({ userId, ownChannelId }, update, { upsert: true, returnDocument: 'after' }); }
        catch (error) {
          if (error.code !== 11000) throw error;
          await store.findOneAndUpdate({ userId, ownChannelId }, update, { returnDocument: 'after' });
        }
      }
      return data;
    } catch (error) {
      callerSignal?.throwIfAborted();
      if (previous?.data?.channels?.length) return { ...previous.data, stale: true, status: 'partial', limitations: [...previous.data.limitations, 'Refresh failed; showing the previous competitor channel sample.'] };
      throw error;
    } finally { pending.delete(key); }
  })();
  pending.set(key, task);
  return task;
}

export function competitorDigest(landscape) {
  if (!landscape?.channels?.length) return null;
  return { basis: 'Titles, descriptions, public metrics and sampled top comments; videos were not watched.',
    analyzedAt: landscape.analyzedAt, stale: Boolean(landscape.stale), limitations: landscape.limitations,
    channels: landscape.channels.map(channel => ({ title: channel.title, url: channel.url, matchedTopics: channel.matchedTopics,
      scale: channel.scale, sample: channel.sample,
      videos: channel.videos.map(video => ({ title: video.snippet.title, description: video.snippet.description.slice(0, 700),
        url: 'https://www.youtube.com/watch?v=' + video.id, publishedAt: video.snippet.publishedAt, statistics: video.statistics,
        comments: video.comments })) })) };
}
