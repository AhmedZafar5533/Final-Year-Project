import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { attachResearchIdentity, uniqueIdeas } from '../services/research/identity.js';
import { discover, selectCompetitors, publicHttpUrl, parseDuration, primaryLanguage } from '../services/research/discovery.js';
import { researchForScript } from '../services/research/queue.js';
import { validateReport } from '../services/research/analysis.js';
import { runResearch } from '../services/research/pipeline.js';
import { deepSeekJson } from '../services/research/providers.js';
import { videos, evidenceFixture, reportFixture } from './fixtures/research.js';

afterEach(() => mock.restoreAll());

test('duplicate recommendation representations share a key, while regenerated ideas have new keys', () => {
  const idea = { title: 'Study tools', hook: 'A practical example', angle: 'Exam revision' };
  const intelligence = attachResearchIdentity({ masterSummary: {
    overlap_recommendations: [{ ...idea }], next_video_recommendations: [{ ...idea }]
  } });
  assert.equal(uniqueIdeas(intelligence).length, 1);
  const previous = uniqueIdeas(intelligence)[0].ideaKey;
  attachResearchIdentity(intelligence);
  assert.equal(uniqueIdeas(intelligence)[0].ideaKey, previous);
  attachResearchIdentity(intelligence, true);
  assert.notEqual(uniqueIdeas(intelligence)[0].ideaKey, previous);
  intelligence.masterSummary.next_video_recommendations[0].angle = 'Different audience need';
  attachResearchIdentity(intelligence);
  assert.equal(uniqueIdeas(intelligence).length, 2);
});

test('discovery excludes the creator, deduplicates videos, and limits each competitor channel', () => {
  const sameChannel = Array.from({ length: 5 }, (_, index) => ({
    ...videos[0], id: 'samevid000' + index, snippet: { ...videos[0].snippet, channelId: 'same' }
  }));
  const selected = selectCompetitors([...sameChannel, ...videos, videos[0]], { title: 'Practical Study Tools' }, { ownChannelId: 'channel-1' });
  assert.equal(selected.filter(video => video.snippet.channelId === 'same').length, 2);
  assert.equal(selected.some(video => video.snippet.channelId === 'channel-1'), false);
  assert.equal(new Set(selected.map(video => video.id)).size, selected.length);
});

test('title-only combined recommendations resolve to structured category ideas without crashing', () => {
  const idea = { id: 'recap', title: 'Attack on Titan Season 4 Recap', hook: 'A concise recap', angle: 'Complete story', why_it_will_perform: 'Requested recap' };
  const intelligence = attachResearchIdentity({ masterSummary: {
    demand_recommendations: [{ ...idea }], next_video_recommendations: [idea.title]
  } });
  const combined = intelligence.masterSummary.next_video_recommendations[0];
  assert.equal(combined.hook, idea.hook);
  assert.equal(combined.why_it_will_perform, idea.why_it_will_perform);
  assert.equal(combined.ideaKey, intelligence.masterSummary.demand_recommendations[0].ideaKey);
  assert.equal(uniqueIdeas(intelligence).length, 1);
});

test('invalid recommendation entries are omitted and valid category ideas rebuild the combined list', () => {
  mock.method(console, 'warn', () => {});
  const intelligence = attachResearchIdentity({ masterSummary: {
    overlap_recommendations: { unexpected: true },
    demand_recommendations: [null, 42, false, [], { title: '' }, { title: 'Valid topic', hook: 'Existing hook' }],
    trend_recommendations: 'Not a recommendation list',
    next_video_recommendations: [null, 'Unknown title']
  } });
  assert.deepEqual(intelligence.masterSummary.overlap_recommendations, []);
  assert.deepEqual(intelligence.masterSummary.trend_recommendations, []);
  assert.equal(uniqueIdeas(intelligence).length, 1);
  assert.equal(intelligence.masterSummary.next_video_recommendations[0].title, 'Valid topic');
  assert.equal(intelligence.masterSummary.next_video_recommendations.some(idea => idea.title === 'Unknown title'), false);
});

test('repeated normalization retains distinct angles and is stable for existing research identities', () => {
  mock.method(console, 'warn', () => {});
  const intelligence = attachResearchIdentity({ masterSummary: {
    demand_recommendations: [{ title: 'Study tools', angle: 'Beginners' }, { title: 'Study tools', angle: 'Advanced' }],
    next_video_recommendations: ['Study tools']
  } });
  const keys = uniqueIdeas(intelligence).map(idea => idea.ideaKey);
  assert.equal(keys.length, 2);
  attachResearchIdentity(intelligence);
  assert.deepEqual(uniqueIdeas(intelligence).map(idea => idea.ideaKey), keys);
});

test('discovery rejects unsafe URLs and parses public durations without made-up values', () => {
  for (const url of ['file:///etc/passwd', 'http://localhost/a', 'http://127.0.0.1/a', 'https://user:secret@example.org/a', 'https://example.org:9000/a']) {
    assert.equal(publicHttpUrl(url), null);
  }
  assert.equal(publicHttpUrl('https://example.org/article#fragment'), 'https://example.org/article');
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('unknown'), null);
});

test('equally relevant proven competitors outrank tiny uploads regardless of input order', () => {
  const items = Array.from({ length: 7 }, (_, index) => ({
    ...videos[0], id: 'rankvideo0' + index,
    snippet: { ...videos[0].snippet, channelId: 'rank-channel-' + index },
    statistics: { viewCount: index < 2 ? '15' : '100000' }
  }));
  const selected = selectCompetitors(items, { title: 'Practical Study Tools' }, {});
  assert.equal(selected.length, 5);
  assert.ok(selected.every(video => Number(video.statistics.viewCount) === 100000));
});

test('unrelated viral videos do not displace a sufficient topical competitor pool', () => {
  const viral = { ...videos[0], id: 'viralvideo0', statistics: { viewCount: '999999999' },
    snippet: { ...videos[0].snippet, channelId: 'viral-channel', title: 'Football final highlights' } };
  const selected = selectCompetitors([viral, ...videos], { title: 'Practical Study Tools' }, {});
  assert.equal(selected.some(video => video.id === viral.id), false);
});

test('niche competitors remain eligible and unknown views do not earn a performance bonus', () => {
  const items = videos.map((video, index) => ({ ...video, statistics: index === 0 ? {} : { viewCount: '20' } }));
  const selected = selectCompetitors(items, { title: 'Practical Study Tools' }, {});
  assert.equal(selected.length, 3);
  assert.notEqual(selected[0].id, items[0].id);
});

test('among equal reach and relevance, sustained daily views favor a newer competitor', () => {
  const items = videos.slice(0, 2).map((video, index) => ({ ...video,
    snippet: { ...video.snippet, publishedAt: new Date(Date.now() - (index === 0 ? 1000 : 10) * 86400000).toISOString() }
  }));
  const selected = selectCompetitors(items, { title: 'Practical Study Tools' }, {});
  assert.equal(selected[0].id, items[1].id);
});

test('regional language tags normalize to supported primary search languages', () => {
  assert.equal(primaryLanguage('en-US'), 'en');
  assert.equal(primaryLanguage('ur-PK'), 'ur');
  assert.equal(primaryLanguage('EN_gb'), 'en');
  assert.equal(primaryLanguage(null), 'en');
});

test('malformed script research references are rejected before database access', async () => {
  for (const reference of [null, { intelligenceId: '507f1f77bcf86cd799439011', ideaKey: { $ne: null } },
    { intelligenceId: 'invalid', ideaKey: 'saved-key' }]) {
    assert.equal(await researchForScript('any-user', reference), null);
  }
});

test('valid reports retain sourced observations and derive qualitative evidence strength', () => {
  const evidence = evidenceFixture();
  const report = validateReport(reportFixture(evidence), evidence);
  assert.equal(report.gaps.length, 1);
  assert.equal(report.gaps[0].evidenceStrength, 'limited');
  assert.equal(report.gaps[0].scope, 'metadata_opportunity');
  assert.equal(report.partial, false);
  assert.equal(report.competitors[0].audienceNeeds[0].quote, 'How can I apply this to exam preparation?');
});

test('unsupported gaps are withheld when complete coverage is insufficient', () => {
  const evidence = evidenceFixture();
  evidence.coverage.videoCount = 1;
  const report = validateReport(reportFixture(evidence), evidence);
  assert.deepEqual(report.gaps, []);
  assert.equal(report.partial, true);
  assert.ok(report.limitations.some(value => value.includes('withheld')));
});

for (const [name, corrupt] of Object.entries({
  'unknown source': report => { report.summary.sourceIds = ['invented-source']; },
  'false quote': report => { report.competitors[0].audienceNeeds[0].quote = 'I guarantee this works'; },
  'cross-video evidence': report => { report.competitors[0].approach.sourceIds = [videos[1].id + ':description']; },
  'unsupported audience need': report => { report.competitors[0].audienceNeeds[0] = report.competitors[0].approach; },
  'unknown video': report => { report.coverageMatrix[0].coveredBy = ['invented-video']; },
  'missing competitor': report => { report.competitors.pop(); }
})) {
  test('rejects ' + name + ' in generated research', () => {
    const evidence = evidenceFixture(), report = reportFixture(evidence);
    corrupt(report);
    assert.throws(() => validateReport(report, evidence));
  });
}

test('empty source text cannot support a factual claim', () => {
  const evidence = evidenceFixture();
  evidence.sources[0].text = '';
  assert.throws(() => validateReport(reportFixture(evidence), evidence));
});

function providerMock({ captions = true, web = true } = {}) {
  return async (value, options) => {
    const url = new URL(value);
    if (url.hostname === 'deepseek.test') {
      const request = JSON.parse(options.body);
      const input = JSON.parse(request.messages[1].content);
      const content = input.schema ? reportFixture(input.evidence) :
        { youtubeQueries: ['study tools pipeline ' + captions + web], webQueries: ['study tools examples'] };
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }],
        usage: { prompt_tokens: 50, completion_tokens: 30 } });
    }
    if (url.hostname === 'www.googleapis.com') {
      if (url.pathname.endsWith('/search')) return Response.json({ items: videos.map(video => ({ id: { videoId: video.id } })) });
      if (url.pathname.endsWith('/videos')) return Response.json({ items: videos });
      if (url.pathname.endsWith('/commentThreads')) return Response.json({ items: [{
        snippet: { topLevelComment: { id: 'comment-1', snippet: { textOriginal: 'How can I apply this to exam preparation?' } } }
      }] });
    }
    if (url.hostname === 'transcript.test') assert.fail('Competitor research must not fetch transcripts');
    if (url.hostname === 'api.search.brave.com') return Response.json({ web: { results: [
      { title: 'Unsafe result', url: 'http://127.0.0.1/private' },
      { title: 'A study guide', url: 'https://example.org/study' }
    ] } });
    if (url.hostname === 'collector.test') return web
      ? Response.json({ url: 'https://example.org/study', title: 'Study guide', text: 'Study workflow examples. '.repeat(20), complete: true, mode: 'http' })
      : new Response('', { status: 502 });
    assert.fail('Unexpected outbound request: ' + url.hostname);
  };
}

async function withConfig(action, { brave = true, searxng = false } = {}) {
  const config = {
    DEEPSEEK_API_KEY: 'test-key', DEEPSEEK_API_URL: 'https://deepseek.test/chat/completions',
    YOUTUBE_API_KEY: 'test-key', BRAVE_SEARCH_API_KEY: brave ? 'test-key' : '',
    WEB_SEARCH_PROVIDER: 'auto', SEARXNG_URL: searxng ? 'http://searxng.test:8080' : '',
    RESEARCH_SERVICE_URL: 'http://collector.test:8001', RESEARCH_SERVICE_TOKEN: 'test-token',
    SENTIMENT_SERVICE_URL: 'http://transcript.test:8000'
  };
  const old = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  try { return await action(); }
  finally {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('discovery mixes relevance and view-ranked searches within the existing query budget', async () => {
  const searches = [];
  const base = providerMock();
  mock.method(globalThis, 'fetch', async (value, options) => {
    const url = new URL(value);
    if (url.hostname === 'deepseek.test') return Response.json({ choices: [{ finish_reason: 'stop',
      message: { content: JSON.stringify({ youtubeQueries: ['rank-test topic', 'rank-test examples', 'rank-test recent'], webQueries: ['rank-test guide'] }) } }] });
    if (url.pathname.endsWith('/search')) searches.push(url.searchParams);
    return base(value, options);
  });
  await withConfig(async () => {
    const result = await discover({ title: 'Study tools' }, {}, { youtubeKey: 'test-key' },
      { signal: AbortSignal.timeout(10000), usage: {} });
    assert.deepEqual(searches.map(params => params.get('order')), ['relevance', 'viewCount', 'relevance']);
    assert.ok(searches.every(params => params.get('maxResults') === '16'));
    assert.equal(searches[1].has('publishedAfter'), false);
    assert.equal(searches[2].has('publishedAfter'), true);
    assert.equal(result.queries.youtube[1].order, 'viewCount');
  });
});

test('idea-to-report pipeline collects actual source IDs, deduplicates comment samples and accounts for usage', async () => {
  await withConfig(async () => {
    mock.method(globalThis, 'fetch', providerMock());
    const stages = [];
    const result = await runResearch({
      idea: { title: 'Practical Study Tools', suggested_format: '10 minutes' }, context: { language: 'en' }
    }, { signal: AbortSignal.timeout(10000), stage: async stage => stages.push(stage) });
    assert.equal(result.status, 'completed');
    assert.equal(result.evidence.coverage.commentCount, 3);
    assert.equal(result.evidence.coverage.pageCount, 1);
    assert.equal(result.evidence.competitors[0].metrics.views, 10000);
    assert.equal(result.usage.deepseekCalls, 2);
    assert.equal(result.usage.promptTokens, 100);
    assert.deepEqual(stages, ['planning', 'collecting', 'analyzing', 'saving']);
    const sources = new Set(result.evidence.sources.map(source => source.id));
    assert.ok(result.report.summary.sourceIds.every(id => sources.has(id)));
  });
});

test('missing web credentials produce explicitly partial YouTube-only research', async () => {
  await withConfig(async () => {
    mock.method(globalThis, 'fetch', providerMock());
    const result = await runResearch({ idea: { title: 'Study tools' }, context: {} },
      { signal: AbortSignal.timeout(10000) });
    assert.equal(result.status, 'partial');
    assert.ok(result.report.limitations.some(value => value.includes('YouTube-only')));
    assert.equal(result.evidence.coverage.pageCount, 0);
  }, { brave: false });
});

test('SearXNG powers the full report with collected Reddit evidence and bounded diverse pages', async () => {
  const base = providerMock();
  const searches = [];
  mock.method(globalThis, 'fetch', async (value, options) => {
    const url = new URL(value);
    if (url.hostname === 'searxng.test') {
      const query = url.searchParams.get('q');
      searches.push(query);
      return Response.json({ results: query.startsWith('site:reddit.com') ? [
        { url: 'http://127.0.0.1/private', title: 'Unsafe' },
        { url: 'https://reddit.com.evil.org/r/test/comments/fake/', title: 'Fake Reddit' },
        { url: 'https://www.reddit.com/r/study/', title: 'Not a thread' },
        { url: 'https://www.reddit.com/r/study/comments/abc/question/', title: 'Study questions', content: 'UNSEEN SEARCH SNIPPET' }
      ] : [
        { url: 'https://example.org/a', title: 'Guide' },
        { url: 'https://example.org/b', title: 'Same domain' },
        { url: 'https://example.net/c', title: 'Another guide' },
        { url: 'https://example.edu/d', title: 'Third guide' }
      ] });
    }
    if (url.hostname === 'collector.test') {
      const page = JSON.parse(options.body);
      return Response.json({ url: page.url, title: 'Collected page',
        text: 'How can I prepare for exams? Practical examples help. '.repeat(10), complete: true, mode: 'http' });
    }
    if (url.hostname === 'deepseek.test') {
      const input = JSON.parse(JSON.parse(options.body).messages[1].content);
      if (input.schema) {
        const report = reportFixture(input.evidence);
        const discussion = input.evidence.sources.find(source => source.kind === 'discussion');
        report.communitySignals = [{ text: 'A participant asks about exam preparation.',
          sourceIds: [discussion.id], quote: 'How can I prepare for exams?' }];
        return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(report) } }] });
      }
    }
    return base(value, options);
  });
  await withConfig(async () => {
    const result = await runResearch({ idea: { title: 'Study tools' }, context: { language: 'en-US' } },
      { signal: AbortSignal.timeout(10000) });
    assert.equal(searches.length, 2); // One generated general query plus one community query.
    assert.ok(searches.some(query => query.startsWith('site:reddit.com')));
    assert.equal(result.evidence.coverage.pageCount, 3);
    assert.equal(result.evidence.coverage.discussionCount, 1);
    assert.equal(result.report.communitySignals.length, 1);
    assert.equal(result.status, 'partial'); // Honest Reddit coverage limitation.
    assert.ok(!JSON.stringify(result.evidence.sources).includes('UNSEEN SEARCH SNIPPET'));
    assert.ok(!result.evidence.sources.some(source => source.url.includes('evil.org')));
    assert.ok(result.evidence.queries.web.every(query => query.provider === 'searxng'));
    assert.equal(result.usage.searxngRequests, 2);
    assert.equal(result.usage.braveRequests, undefined);
  }, { brave: false, searxng: true });
});

test('competitor research completes from metadata and comments without a transcript service', async () => {
  await withConfig(async () => {
    mock.method(globalThis, 'fetch', providerMock({ captions: false }));
    const result = await runResearch({ idea: { title: 'Study tools' }, context: {} },
      { signal: AbortSignal.timeout(10000) });
    assert.equal(result.status, 'completed');
    assert.equal(result.usage.transcriptRequests, undefined);
    assert.ok(result.evidence.sources.every(source => source.kind !== 'transcript'));
    assert.equal(result.report.gaps[0].scope, 'metadata_opportunity');
  });
});

test('web collection failure preserves a labeled partial report', async () => {
  await withConfig(async () => {
    mock.method(globalThis, 'fetch', providerMock({ web: false }));
    const result = await runResearch({ idea: { title: 'Study tools' }, context: {} },
      { signal: AbortSignal.timeout(10000) });
    assert.equal(result.status, 'partial');
    assert.ok(result.report.limitations.some(value => value.includes('could not be examined')));
  });
});

test('malformed DeepSeek output retries once and does not return unvalidated research', async () => {
  await withConfig(async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] }));
    await assert.rejects(deepSeekJson('Return JSON', {}, { signal: AbortSignal.timeout(5000) }));
    assert.equal(fetchMock.mock.callCount(), 2);
  });
});

test('invalid provider credentials fail without a retry storm', async () => {
  await withConfig(async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
    await assert.rejects(deepSeekJson('Return JSON', {}, { signal: AbortSignal.timeout(5000) }));
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
