import { publicHttpUrl } from './discovery.js';
import { sourceQuality } from './quality.js';
import { collectPublicPage } from './pages.js';

export async function mapLimited(items, limit, action) {
  const result = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await action(items[index], index);
    }
  }));
  return result;
}

const numberOrNull = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);

export async function collectEvidence(discovery, config, run) {
  const sources = [];
  const limitations = [...discovery.limitations];
  const competitors = await mapLimited(discovery.videos, 2, async video => {
    run.signal.throwIfAborted();
    const id = video.id;
    run.log?.('video.started', { videoId: id });
    const url = 'https://www.youtube.com/watch?v=' + id;
    const observedAt = new Date().toISOString();
    const sourceIds = [];
    const add = source => {
      const record = { ...source, videoId: id, url: source.url || url, title: video.snippet.title, collectedAt: source.collectedAt || observedAt };
      sources.push(record);
      sourceIds.push(record.id);
    };
    const stats = {
      views: numberOrNull(video.statistics?.viewCount), likes: numberOrNull(video.statistics?.likeCount),
      comments: numberOrNull(video.statistics?.commentCount)
    };
    const days = (Date.now() - Date.parse(video.snippet.publishedAt)) / 86400000;
    add({ id: id + ':title', kind: 'title', text: video.snippet.title, complete: true });
    if (video.snippet.description?.trim()) add({ id: id + ':description', kind: 'description',
      text: video.snippet.description.slice(0, 6000), complete: video.snippet.description.length <= 6000 });
    add({ id: id + ':metadata', kind: 'metadata', complete: true,
      text: JSON.stringify({ publishedAt: video.snippet.publishedAt, duration: video.contentDetails?.duration, ...stats }) });
    const comments = new Map();
    const orders = [];
    if (Array.isArray(video.sampledComments)) {
      orders.push('relevance');
      for (const comment of video.sampledComments) if (comment.id && comment.text) comments.set(comment.id, {
        textOriginal: comment.text, likeCount: comment.likes, publishedAt: comment.publishedAt, complete: comment.complete
      });
    }
    for (const order of (Array.isArray(video.sampledComments) ? [] : ['relevance'])) {
      try {
        const result = await discovery.google('commentThreads', {
          part: 'snippet', videoId: id, maxResults: '20', order, textFormat: 'plainText'
        });
        orders.push(order);
        for (const item of result.items || []) {
          const comment = item.snippet?.topLevelComment;
          if (comment?.id && !comments.has(comment.id)) comments.set(comment.id, comment.snippet);
        }
      } catch { limitations.push('The ' + order + ' comment sample is unavailable for ' + id + '.'); }
    }
    for (const [commentId, comment] of comments) {
      const raw = String(comment.textOriginal || comment.textDisplay || '');
      add({ id: id + ':comment:' + commentId, kind: 'comment',
        text: raw.slice(0, 600), likes: numberOrNull(comment.likeCount), publishedAt: comment.publishedAt || null,
        ...(video.commentsObservedAt ? { collectedAt: video.commentsObservedAt } : {}),
        url: url + '&lc=' + encodeURIComponent(commentId), complete: comment.complete !== false && raw.length <= 600 });
    }
    run.log?.('video.completed', { videoId: id, basis: 'public_metadata', comments: comments.size });
    return {
      videoId: id, url, title: video.snippet.title, channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle, publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails?.duration, metrics: stats, observedAt,
      averageViewsPerDay: stats.views == null || !Number.isFinite(days) || days < 1 ? null : Math.round(stats.views / days),
      thumbnailUrl: publicHttpUrl(video.snippet.thumbnails?.medium?.url) || null,
      selectionReason: 'Selected using topic relevance, total views, average views per day, audience language and duration similarity, with channel diversity. Missing performance metrics receive no performance bonus.',
      commentSampleSize: comments.size, commentOrders: orders, fromChannelBaseline: Boolean(video.fromChannelBaseline), sourceIds
    };
  });

  let collectedPages = 0;
  const collectedUrls = new Set();
  await mapLimited((discovery.pageCandidates || discovery.pages).slice(0, 6), 2, async (page, index) => {
    if (collectedPages >= 3 || run.signal?.aborted) return;
    if (!config.serviceToken) {
      limitations.push('Web page collection is not configured.');
      return;
    }
    try {
      run.log?.('page.started', { url: page.url });
      const result = await collectPublicPage(page, config, run);
      const url = publicHttpUrl(result.url);
      if (!url || typeof result.text !== 'string' || result.text.length < 100) throw new Error('Unusable page');
      if (collectedPages >= 3 || collectedUrls.has(url)) return;
      collectedPages++;
      collectedUrls.add(url);
      const discussion = /(^|\.)reddit\.com$/i.test(new URL(url).hostname) && /\/comments\//.test(new URL(url).pathname);
      sources.push({ id: 'web:' + index, kind: discussion ? 'discussion' : 'web', url, title: String(result.title || page.title).slice(0, 300),
        sourceType: sourceQuality(url).type, sourceCaveat: sourceQuality(url).caveat,
        text: result.text.slice(0, 12000), complete: result.complete === true && result.text.length <= 12000,
        searchProvider: page.provider || null,
        publishedAt: typeof result.publishedAt === 'string' ? result.publishedAt.slice(0, 40) : null,
        collectedAt: typeof result.collectedAt === 'string' ? result.collectedAt.slice(0, 40) : new Date().toISOString(), mode: result.mode });
      if (!result.complete || result.text.length > 12000) limitations.push('Only partial page text was examined: ' + url);
      if (discussion) limitations.push('Reddit evidence includes only readable text collected from the linked page; it does not establish full comment coverage or representative audience demand.');
      run.log?.('page.completed', { url, characters: Math.min(result.text.length, 12000), complete: result.complete });
    } catch (error) {
      run.log?.('page.failed', { url: page.url, status: error.upstreamStatus, error: error.cause?.code || error.name });
      limitations.push('A discovered web page could not be examined: ' + page.url);
    }
  });
  return {
    competitors, sources, channelBaseline: discovery.channelBaseline || null, basis: 'public_metadata', queries: discovery.queries,
    limitations: [...new Set(limitations)],
    coverage: {
      videoCount: competitors.length,
      channelCount: new Set(competitors.map(video => video.channelId)).size,
      metadataVideoCount: competitors.length,
      pageCount: sources.filter(source => ['web', 'discussion'].includes(source.kind)).length,
      discussionCount: sources.filter(source => source.kind === 'discussion').length,
      commentCount: competitors.reduce((sum, video) => sum + video.commentSampleSize, 0)
    }
  };
}
