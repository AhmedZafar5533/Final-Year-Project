import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { fetchJson, withTransientRetry } from '../services/research/providers.js';
import { createSearchGate } from '../services/research/searchGate.js';
import { collectEvidence } from '../services/research/evidence.js';
import { collectScriptWebResearch } from '../services/research/scriptWebResearch.js';
import { collectPublicPage } from '../services/research/pages.js';
import { discover } from '../services/research/discovery.js';
import { videos } from './fixtures/research.js';

afterEach(() => mock.restoreAll());

test('a temporary connection failure is retryable and recovers once', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => {
    if (++calls === 1) throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
    return Response.json({ recovered: true });
  });
  const result = await withTransientRetry(() => fetchJson('https://provider.example.org'));
  assert.deepEqual(result, { recovered: true });
  assert.equal(calls, 2);
});

test('credentials and long Retry-After cooldowns do not trigger immediate retries', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
  await assert.rejects(withTransientRetry(() => fetchJson('https://provider.example.org')), error => error.retryable === false);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }));
  await assert.rejects(withTransientRetry(() => fetchJson('https://provider.example.org')), error => error.retryAfterMs === 60000);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('search concurrency is bounded and cancelling a waiting search never starts it', async () => {
  const gate = createSearchGate(1);
  let release;
  const first = gate(() => new Promise(resolve => { release = resolve; }));
  await Promise.resolve();
  const controller = new AbortController();
  let started = false;
  const second = gate(() => { started = true; }, controller.signal);
  const rejected = assert.rejects(second, /cancelled/);
  controller.abort(new Error('cancelled'));
  await rejected;
  release('done');
  assert.equal(await first, 'done');
  assert.equal(started, false);
  assert.equal(await gate(async () => 'third'), 'third');
});

test('backup pages replace inaccessible candidates while retaining only three collected sources', async () => {
  const requests = [];
  mock.method(globalThis, 'fetch', async (value, options) => {
    const url = JSON.parse(options.body).url;
    requests.push(url);
    if (url.includes('blocked')) return new Response('', { status: 502 });
    return Response.json({ url, title: 'Collected research', text: 'Actual collected evidence. '.repeat(20), complete: true });
  });
  const pages = ['blocked-a', 'blocked-b', 'good-a', 'good-b', 'good-c', 'good-d'].map(name => ({ url: `https://${name}.example.org/article`, title: name }));
  const result = await collectEvidence({ videos: [], pages: pages.slice(0, 3), pageCandidates: pages, limitations: [], queries: {} },
    { serviceToken: 'test', serviceUrl: 'http://collector.test' }, { usage: {}, signal: AbortSignal.timeout(5000) });
  assert.equal(result.coverage.pageCount, 3);
  assert.ok(result.sources.every(source => !source.url.includes('blocked')));
  assert.ok(requests.length <= 6);
  assert.equal(requests.filter(url => url.includes('blocked')).length, 2);
});

test('an interrupted script research request retains its existing evidence as partial', async () => {
  const controller = new AbortController();
  controller.abort(new Error('deadline'));
  const previous = { sources: [{ id: 'S123456abcdef', url: 'https://example.org/study', text: 'Previously collected real evidence.' }], images: [] };
  const pack = await collectScriptWebResearch({ config: { webProvider: 'searxng', searxngUrl: 'http://search.test' }, previous, signal: controller.signal });
  assert.equal(pack.status, 'partial');
  assert.equal(pack.sources[0].text, previous.sources[0].text);
  assert.ok(pack.warnings.some(warning => warning.includes('time limit')));
});

test('collector page failures are not repeatedly retried but transport resets recover', async () => {
  const run = { usage: {}, signal: AbortSignal.timeout(5000) };
  const config = { serviceUrl: 'http://collector.test', serviceToken: 'test' };
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('', { status: 502 }));
  await assert.rejects(collectPublicPage({ url: 'https://example.org/blocked' }, config, run));
  assert.equal(fetchMock.mock.callCount(), 1);
  let attempts = 0;
  fetchMock.mock.mockImplementation(async () => {
    if (++attempts === 1) throw new TypeError('reset', { cause: { code: 'ECONNRESET' } });
    return Response.json({ text: 'Recovered' });
  });
  assert.equal((await collectPublicPage({ url: 'https://example.org/recover' }, config, run)).text, 'Recovered');
  assert.equal(run.usage.pageRequests, 3);
});

test('a failed query planner falls back to topic discovery instead of failing the job', async () => {
  const old = { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY, DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL };
  process.env.DEEPSEEK_API_KEY = 'test';
  process.env.DEEPSEEK_API_URL = 'https://planner-resilience.test/chat/completions';
  try {
    mock.method(globalThis, 'fetch', async value => {
      const url = new URL(value);
      if (url.hostname === 'planner-resilience.test') return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] });
      if (url.pathname.endsWith('/search')) return Response.json({ items: videos.map(video => ({ id: { videoId: video.id } })) });
      if (url.pathname.endsWith('/videos')) return Response.json({ items: videos });
      assert.fail('Unexpected outbound request');
    });
    const result = await discover({ title: 'Resilient Study Tools' }, {}, { youtubeKey: 'test', webProvider: 'none' }, { signal: AbortSignal.timeout(5000), usage: {} });
    assert.equal(result.videos.length, 3);
    assert.equal(result.queries.youtube[0].query, 'Resilient Study Tools');
    assert.ok(result.limitations.some(item => item.includes('Query planning')));
  } finally {
    for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('saved top comments and public metadata are sufficient without any transcript request', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => assert.fail('No external requests expected'));
  const discovery = { videos: videos.map(video => ({ ...video, sampledComments: [{ id: 'saved-comment', text: 'Can you show an example?', likes: 7 }] })),
    pages: [], limitations: [], queries: {}, google: async () => assert.fail('Saved comments should be reused') };
  const usage = {};
  const result = await collectEvidence(discovery, {}, { usage, signal: AbortSignal.timeout(5000) });
  assert.equal(result.competitors.length, videos.length);
  assert.equal(result.coverage.commentCount, videos.length);
  assert.equal(usage.transcriptRequests, undefined);
  assert.ok(result.sources.every(source => source.kind !== 'transcript'));
  assert.equal(result.sources.find(source => source.kind === 'comment').likes, 7);
  assert.equal(fetchMock.mock.callCount(), 0);
});
