import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { buildChannelCompetitors, getChannelCompetitors, competitorDigest, summarizeCompetitor } from '../services/research/channelCompetitors.js';
import { discover } from '../services/research/discovery.js';
import { validateReport } from '../services/research/analysis.js';
import { evidenceFixture, reportFixture } from './fixtures/research.js';

afterEach(() => mock.restoreAll());
const niche = { primary_niche: 'Study tools', sub_niches: ['Exam revision'], content_pillars: ['Study workflows'] };
const channel = { youtubeChannelId: 'own-channel', subscriberCount: 10000, researchLanguage: 'en' };
const candidates = ['own-channel', 'peer', 'larger', 'unrelated', 'spanish'];
const candidateVideos = candidates.flatMap((id, index) => Array.from({ length: 3 }, (_, n) => ({
  id: `video${index}0000${n}`, snippet: { channelId: id, channelTitle: id, title: id === 'unrelated' ? 'Football highlights' : 'Study tools for exam revision',
    description: id === 'unrelated' ? 'Sports matches' : 'A practical study workflow.', defaultAudioLanguage: id === 'spanish' ? 'es' : 'en', publishedAt: `2026-10-${String(18 - n * 3).padStart(2, '0')}T00:00:00Z` },
  statistics: { viewCount: String((n + 1) * 1000), likeCount: '50', commentCount: '12' }, contentDetails: { duration: 'PT8M' }
})));

function reader(calls = []) {
  return async (method, params) => {
    calls.push({ method, params });
    if (method === 'search') return { items: [...candidates, 'peer'].map(id => ({ snippet: { channelId: id } })) };
    if (method === 'channels') return { items: candidates.map(id => ({ id,
      snippet: { title: id, description: id === 'unrelated' ? 'Football' : 'Study tools and exam revision' },
      statistics: { subscriberCount: id === 'larger' ? '900000' : '12000', videoCount: '80', hiddenSubscriberCount: id === 'larger' },
      contentDetails: { relatedPlaylists: { uploads: id } } })) };
    if (method === 'playlistItems') return { items: candidateVideos.filter(video => video.snippet.channelId === params.playlistId).map(video => ({ contentDetails: { videoId: video.id } })) };
    if (method === 'videos') return { items: candidateVideos.filter(video => params.id.split(',').includes(video.id)) };
    if (method === 'commentThreads') return { items: [{ snippet: { topLevelComment: { id: 'question-1', snippet: { textOriginal: 'Can you demonstrate exam revision?', likeCount: 7 } } } }] };
    assert.fail('Unexpected method ' + method);
  };
}

test('niche discovery excludes self, unrelated uploads and mismatched language; samples real metadata and top comments', async () => {
  const calls = [];
  const result = await buildChannelCompetitors({ channel, niche, read: reader(calls), run: { usage: {}, signal: AbortSignal.timeout(5000) } });
  assert.deepEqual(result.channels.map(item => item.channelId).sort(), ['larger', 'peer']);
  const peer = result.channels.find(item => item.channelId === 'peer');
  assert.equal(peer.scale, 'Similar scale');
  assert.equal(peer.sample.medianViews, 2000);
  assert.equal(peer.sample.averageUploadSpacingDays, 3);
  assert.equal(peer.videos.filter(video => video.commentsSampled).length, 2);
  assert.equal(peer.videos.flatMap(video => video.comments)[0].likes, 7);
  assert.equal(result.channels.find(item => item.channelId === 'larger').subscriberCount, null);
  assert.ok(calls.filter(call => call.method === 'commentThreads').every(call => call.params.order === 'relevance'));
  assert.equal(competitorDigest(result).channels[0].videos[0].url.startsWith('https://www.youtube.com/watch?v='), true);
});

test('fresh channel baselines are scoped to owner, channel and niche and avoid new upstream calls', async () => {
  const queries = [];
  const store = { findOne(query) { queries.push(query); return { lean: async () => ({ expiresAt: new Date(Date.now() + 60000), data: { channels: [{ channelId: query.userId + '-peer' }] } }) }; } };
  mock.method(globalThis, 'fetch', async () => assert.fail('Fresh baseline must not call upstream services'));
  const a = await getChannelCompetitors({ userId: 'owner-a', channel, niche, store });
  const b = await getChannelCompetitors({ userId: 'owner-b', channel, niche, store });
  await getChannelCompetitors({ userId: 'owner-a', channel, niche: { ...niche, primary_niche: 'Cooking' }, store });
  assert.equal(a.channels[0].channelId, 'owner-a-peer');
  assert.equal(b.channels[0].channelId, 'owner-b-peer');
  assert.equal(queries[0].ownChannelId, 'own-channel');
  assert.notEqual(queries[0].contextKey, queries[2].contextKey);
});

test('an old niche description does not qualify a channel whose sampled uploads are unrelated', () => {
  const candidate = { id: 'pivoted', snippet: { title: 'Study tools', description: 'Study workflows' }, statistics: {} };
  const unrelated = candidateVideos.filter(video => video.snippet.channelId === 'unrelated');
  assert.equal(summarizeCompetitor(candidate, unrelated, { topicTerms: ['study', 'tools'], ownSubscribers: 10000, language: 'en' }), null);
});

test('failed channel refresh retains its saved sample with an explicit stale label', async () => {
  const store = { findOne() { return { lean: async () => ({ expiresAt: new Date(0), data: { channels: [{ channelId: 'saved-peer' }], limitations: [] } }) }; } };
  const result = await getChannelCompetitors({ userId: 'stale-owner', channel, niche, store, config: { youtubeKey: '' } });
  assert.equal(result.stale, true);
  assert.equal(result.status, 'partial');
  assert.equal(result.channels[0].channelId, 'saved-peer');
});

test('forced refresh persists a new channel sample under the authenticated owner and channel', async () => {
  const writes = [];
  const read = reader();
  const youtube = Object.fromEntries(['search', 'channels', 'playlistItems', 'videos', 'commentThreads'].map(method => [method, { list: async params => ({ data: await read(method, params) }) }]));
  const store = {
    findOne() { return { lean: async () => ({ expiresAt: new Date(Date.now() + 60000), data: { channels: [{ channelId: 'old' }] } }) }; },
    async findOneAndUpdate(query, update) { writes.push({ query, update }); }
  };
  const result = await getChannelCompetitors({ userId: 'refresh-owner', channel, niche, youtube, store, force: true });
  assert.equal(result.channels.length, 2);
  assert.deepEqual(writes[0].query, { userId: 'refresh-owner', ownChannelId: 'own-channel' });
  assert.ok(writes[0].update.$set.expiresAt > new Date());
  assert.equal(writes[0].update.$set.data.channels.length, 2);
});

test('idea discovery reuses channel uploads and performs only one supplementary topic query', async () => {
  const old = { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY, DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL };
  Object.assign(process.env, { DEEPSEEK_API_KEY: 'test', DEEPSEEK_API_URL: 'https://baseline-planner.test/chat' });
  try {
    let searches = 0;
    const baselineVideos = candidateVideos.filter(video => ['peer', 'larger'].includes(video.snippet.channelId));
    baselineVideos[0] = { ...baselineVideos[0], commentsSampled: true, comments: [{ id: 'saved', text: 'Actual question' }] };
    mock.method(globalThis, 'fetch', async value => {
      const url = new URL(value);
      if (url.hostname === 'baseline-planner.test') return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ youtubeQueries: ['baseline one', 'baseline two', 'baseline three'], webQueries: ['study guide'] }) } }] });
      if (url.pathname.endsWith('/search')) { searches++; return Response.json({ items: [] }); }
      if (url.pathname.endsWith('/videos')) {
        assert.ok(url.searchParams.get('id').includes(baselineVideos[0].id));
        return Response.json({ items: baselineVideos });
      }
      assert.fail('Unexpected request');
    });
    const baseline = { analyzedAt: new Date().toISOString(), channels: ['peer', 'larger'].map(id => ({ channelId: id, videos: baselineVideos.filter(video => video.snippet.channelId === id) })) };
    const result = await discover({ title: 'Study tools' }, { channelCompetitors: baseline, language: 'en' }, { youtubeKey: 'test', webProvider: 'none' }, { usage: {}, signal: AbortSignal.timeout(5000) });
    assert.equal(searches, 1);
    assert.ok(result.videos.every(video => video.fromChannelBaseline));
    assert.equal(result.channelBaseline.channels.length, 2);
  } finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('metadata opportunity validation requires actual audience evidence and two-channel comparisons', () => {
  const evidence = evidenceFixture();
  const result = validateReport(reportFixture(evidence), evidence);
  assert.equal(result.basis, 'public_metadata');
  assert.equal(result.gaps[0].evidenceStrength, 'limited');
  const noQuestion = reportFixture(evidence);
  noQuestion.gaps[0].finding.sourceIds = [evidence.competitors[0].videoId + ':description'];
  assert.equal(validateReport(noQuestion, evidence).gaps.length, 0);
  evidence.competitors.forEach(video => { video.channelId = 'same-channel'; });
  assert.equal(validateReport(reportFixture(evidence), evidence).gaps.length, 0);
  const commentOnly = reportFixture();
  commentOnly.competitors[0].coveredTopics[0].sourceIds = ['video000001:comment:comment-1'];
  assert.throws(() => validateReport(commentOnly, evidenceFixture()), /Advertised topic requires/);
});
