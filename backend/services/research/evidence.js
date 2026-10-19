import { fetchJson } from './providers.js';
import { publicHttpUrl, primaryLanguage } from './discovery.js';

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
      const record = { ...source, videoId: id, url: source.url || url, title: video.snippet.title, collectedAt: observedAt };
      sources.push(record);
      sourceIds.push(record.id);
    };
    const stats = {
      views: numberOrNull(video.statistics?.viewCount), likes: numberOrNull(video.statistics?.likeCount),
      comments: numberOrNull(video.statistics?.commentCount)
    };
    const days = (Date.now() - Date.parse(video.snippet.publishedAt)) / 86400000;
    add({ id: id + ':description', kind: 'description',
      text: (video.snippet.description || '').slice(0, 6000), complete: (video.snippet.description || '').length <= 6000 });
    let transcriptComplete = false;
    let transcriptAvailable = false;
    try {
      run.usage.transcriptRequests = (run.usage.transcriptRequests || 0) + 1;
      const data = await fetchJson(config.transcriptUrl + '/transcript?' +
        new URLSearchParams({ videoId: id, languages: primaryLanguage(run.language) }), {}, run.signal);
      const segments = (data.transcript || []).filter(segment => typeof segment.text === 'string');
      const rawLength = segments.reduce((sum, segment) => sum + segment.text.length, 0);
      let consumed = 0;
      const selected = [];
      for (const segment of segments) {
        const room = 16000 - consumed;
        if (room <= 0) break;
        const bounded = segment.text.slice(0, room);
        selected.push({ ...segment, text: bounded });
        consumed += bounded.length;
      }
      transcriptAvailable = consumed >= 300;
      transcriptComplete = transcriptAvailable && consumed === rawLength && selected.length === segments.length;
      // Timestamped blocks provide small, verifiable evidence references.
      let block = '', start = 0, blockIndex = 0;
      const flush = () => {
        if (!block) return;
        add({ id: id + ':transcript:' + blockIndex++, kind: 'transcript', text: block,
          start, url: url + '&t=' + Math.floor(start), complete: transcriptComplete });
      };
      for (const segment of selected) {
        if (block && block.length + segment.text.length > 1800) { flush(); block = ''; }
        if (!block) start = Number(segment.start) || 0;
        block += (block ? ' ' : '') + segment.text;
      }
      flush();
      if (!segments.length) limitations.push('Captions unavailable for ' + id + '.');
      else if (consumed < rawLength) limitations.push('Only the beginning of captions was examined for ' + id + '.');
    } catch (error) {
      run.log?.('captions.failed', { videoId: id, status: error.upstreamStatus, error: error.cause?.code || error.name });
      limitations.push('Captions could not be collected for ' + id + '.');
    }

    const comments = new Map();
    const orders = [];
    for (const order of ['relevance', 'time']) {
      try {
        const result = await discovery.google('commentThreads', {
          part: 'snippet', videoId: id, maxResults: '25', order, textFormat: 'plainText'
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
        text: raw.slice(0, 600),
        url: url + '&lc=' + encodeURIComponent(commentId), complete: raw.length <= 600 });
    }
    run.log?.('video.completed', { videoId: id, transcriptComplete, comments: comments.size });
    return {
      videoId: id, url, title: video.snippet.title, channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle, publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails?.duration, metrics: stats, observedAt,
      averageViewsPerDay: stats.views == null || !Number.isFinite(days) || days < 1 ? null : Math.round(stats.views / days),
      thumbnailUrl: publicHttpUrl(video.snippet.thumbnails?.medium?.url) || null,
      selectionReason: 'Selected using topic relevance, total views, average views per day, audience language and duration similarity, with channel diversity. Missing performance metrics receive no performance bonus.',
      commentSampleSize: comments.size, commentOrders: orders, transcriptAvailable, transcriptComplete, sourceIds
    };
  });

  await mapLimited(discovery.pages, 2, async (page, index) => {
    if (!config.serviceToken) {
      limitations.push('Web page collection is not configured.');
      return;
    }
    try {
      run.log?.('page.started', { url: page.url });
      run.usage.pageRequests = (run.usage.pageRequests || 0) + 1;
      const result = await fetchJson(config.serviceUrl + '/collect', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.serviceToken },
        body: JSON.stringify({ url: page.url })
      }, run.signal);
      const url = publicHttpUrl(result.url);
      if (!url || typeof result.text !== 'string' || result.text.length < 100) throw new Error('Unusable page');
      const discussion = /(^|\.)reddit\.com$/i.test(new URL(url).hostname) && /\/comments\//.test(new URL(url).pathname);
      sources.push({ id: 'web:' + index, kind: discussion ? 'discussion' : 'web', url, title: String(result.title || page.title).slice(0, 300),
        text: result.text.slice(0, 12000), complete: result.complete === true && result.text.length <= 12000,
        searchProvider: page.provider || null,
        publishedAt: typeof result.publishedAt === 'string' ? result.publishedAt.slice(0, 40) : null,
        collectedAt: new Date().toISOString(), mode: result.mode });
      if (!result.complete || result.text.length > 12000) limitations.push('Only partial page text was examined: ' + url);
      if (discussion) limitations.push('Reddit evidence includes only readable text collected from the linked page; it does not establish full comment coverage or representative audience demand.');
      run.log?.('page.completed', { url, characters: Math.min(result.text.length, 12000), complete: result.complete });
    } catch (error) {
      run.log?.('page.failed', { url: page.url, status: error.upstreamStatus, error: error.cause?.code || error.name });
      limitations.push('A discovered web page could not be examined: ' + page.url);
    }
  });
  return {
    competitors, sources, queries: discovery.queries,
    limitations: [...new Set(limitations)],
    coverage: {
      videoCount: competitors.length,
      channelCount: new Set(competitors.map(video => video.channelId)).size,
      completeTranscripts: competitors.filter(video => video.transcriptComplete).length,
      pageCount: sources.filter(source => ['web', 'discussion'].includes(source.kind)).length,
      discussionCount: sources.filter(source => source.kind === 'discussion').length,
      commentCount: competitors.reduce((sum, video) => sum + video.commentSampleSize, 0)
    }
  };
}
