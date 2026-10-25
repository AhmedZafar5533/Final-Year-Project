import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { searchWeb, searchImages, webSearchProviders } from '../services/research/webSearch.js';
import { collectEvidence } from '../services/research/evidence.js';
import { validateReport } from '../services/research/analysis.js';
import { evidenceFixture, reportFixture } from './fixtures/research.js';

afterEach(() => mock.restoreAll());
const run = () => ({ usage: {}, signal: AbortSignal.timeout(10000) });
const config = { searxngUrl: 'http://search.test:8080/instance', braveKey: 'test', webProvider: 'auto' };

test('provider configuration selects explicit providers, supports disabled mode and rejects typos', () => {
  assert.deepEqual(webSearchProviders(config), ['searxng', 'brave']);
  assert.deepEqual(webSearchProviders({ ...config, webProvider: 'brave' }), ['brave']);
  assert.deepEqual(webSearchProviders({ ...config, webProvider: 'none' }), []);
  assert.deepEqual(webSearchProviders({}), []);
  assert.throws(() => webSearchProviders({ webProvider: 'searxng' }));
  assert.throws(() => webSearchProviders({ webProvider: 'typo' }));
});

test('SearXNG uses JSON with encoded queries, normalizes results and counts only cache misses', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async value => {
    const url = new URL(value);
    assert.equal(url.pathname, '/instance/search');
    assert.equal(url.searchParams.get('q'), 'site:reddit.com tools & workflow');
    assert.equal(url.searchParams.get('format'), 'json');
    assert.equal(url.searchParams.get('language'), 'en');
    return Response.json({ results: [{ url: 'https://reddit.com/r/tools/comments/test/thread', title: 'Question', content: 'Snippet only' }] });
  });
  const execution = run();
  const first = await searchWeb('site:reddit.com tools & workflow', 'en', config, execution);
  first.results[0].title = 'mutated';
  const second = await searchWeb('site:reddit.com tools & workflow', 'en', config, execution);
  assert.equal(second.results[0].title, 'Question');
  assert.equal(second.results[0].snippet, 'Snippet only');
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(execution.usage.searxngRequests, 1);
  assert.equal(execution.usage.webRequests, 1);
});

for (const failure of ['forbidden', 'empty', 'malformed']) {
  test('auto falls back to Brave after SearXNG ' + failure, async () => {
    mock.method(globalThis, 'fetch', async value => {
      if (new URL(value).hostname === 'search.test') {
        return failure === 'forbidden' ? new Response('', { status: 403 }) :
          Response.json(failure === 'empty' ? { results: [] } : { unexpected: [] });
      }
      return Response.json({ web: { results: [{ url: 'https://example.org/article', title: 'Article' }] } });
    });
    const execution = run();
    const result = await searchWeb('fallback ' + failure, 'en', config, execution);
    assert.equal(result.provider, 'brave');
    assert.equal(result.warnings.length, 1);
    assert.equal(execution.usage.webRequests, 2);
  });
}

test('explicit SearXNG failure does not silently call Brave', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async value => {
    assert.equal(new URL(value).hostname, 'search.test');
    return new Response('', { status: 503 });
  });
  const result = await searchWeb('explicit failed search', 'en', { ...config, webProvider: 'searxng' }, run());
  assert.deepEqual(result.results, []);
  assert.equal(fetchMock.mock.callCount(), 2); // One bounded transient retry, still SearXNG only.
});

test('an empty restrictive search retries a broader query once and records engine failure reasons', async () => {
  const events = [];
  const queries = [];
  mock.method(globalThis, 'fetch', async value => {
    const query = new URL(value).searchParams.get('q');
    queries.push(query);
    return Response.json(query.includes('site:')
      ? { results: [], unresponsive_engines: [['bing', 'CAPTCHA']] }
      : { results: [{ url: 'https://support.google.com/youtube/answer/example', title: 'YouTube audience retention' }] });
  });
  const execution = { ...run(), log: (event, details) => events.push({ event, ...details }) };
  const result = await searchWeb('YouTube audience retention original study site:research.google', 'en', { ...config, webProvider: 'searxng' }, execution);
  assert.equal(result.results.length, 1);
  assert.deepEqual(queries, ['YouTube audience retention original study site:research.google', 'YouTube audience retention']);
  assert.equal(execution.usage.webRequests, 2);
  assert.equal(events.find(item => item.event === 'search.failed').error, 'EMPTY_RESULTS');
  assert.deepEqual(events.find(item => item.event === 'search.failed').engineFailures, [{ engine: 'bing', reason: 'CAPTCHA' }]);
  assert.ok(events.some(item => item.event === 'search.retry'));
});

test('image searches retry a shorter query and stop after a second empty response', async () => {
  const queries = [];
  mock.method(globalThis, 'fetch', async value => {
    queries.push(new URL(value).searchParams.get('q'));
    return Response.json({ results: [], unresponsive_engines: [['google images', 'timeout']] });
  });
  const result = await searchImages('YouTube Analytics audience retention graph screenshot', 'en', config, run());
  assert.deepEqual(queries, ['YouTube Analytics audience retention graph screenshot', 'YouTube Analytics audience retention graph']);
  assert.equal(result.results.length, 0);
  assert.match(result.warnings[0], /google images: timeout/);
});

test('HTTP failures do not trigger broader-query retries and invalid JSON is diagnosed', async () => {
  const events = [];
  const execution = { ...run(), log: (event, details) => events.push({ event, ...details }) };
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('Forbidden', { status: 403 }));
  await searchWeb('YouTube retention site:example.org', 'en', { ...config, webProvider: 'searxng' }, execution);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(events.at(-1).error, 'HTTP_ERROR');
  fetchMock.mock.mockImplementation(async () => new Response('<html>Not JSON</html>'));
  const invalid = await searchImages('unique malformed image search', 'en', config, execution);
  assert.equal(events.at(-1).error, 'INVALID_JSON');
  assert.match(invalid.warnings[0], /invalid response/);
});

test('cancellation prevents provider fallback', async () => {
  const controller = new AbortController();
  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    controller.abort();
    throw new Error('aborted');
  });
  await assert.rejects(searchWeb('cancelled query', 'en', config, { usage: {}, signal: controller.signal }));
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('Reddit evidence uses collected text only and labels discussion coverage', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({
    url: 'https://www.reddit.com/r/study/comments/abc/question/', title: 'Study question',
    text: 'I need practical study examples. '.repeat(10), complete: true, mode: 'http'
  }));
  const result = await collectEvidence({ videos: [], limitations: [], queries: {}, pages: [{
    url: 'https://www.reddit.com/r/study/comments/abc/question/', kind: 'discussion',
    snippet: 'UNSEEN COMMENT', provider: 'searxng'
  }] }, { serviceToken: 'test', serviceUrl: 'http://collector.test' }, run());
  assert.equal(result.sources[0].kind, 'discussion');
  assert.equal(result.sources[0].searchProvider, 'searxng');
  assert.equal(result.coverage.pageCount, 1);
  assert.equal(result.coverage.discussionCount, 1);
  assert.ok(!JSON.stringify(result.sources).includes('UNSEEN COMMENT'));
  assert.ok(result.limitations.some(item => item.includes('full comment coverage')));
});

test('community observations require collected discussion citations and exact quotations', () => {
  const evidence = evidenceFixture();
  evidence.sources.push({ id: 'reddit:1', kind: 'discussion', text: 'How do I revise for exams?', url: 'https://reddit.com/r/test/comments/abc/question/' });
  const report = reportFixture(evidence);
  report.communitySignals = [{ text: 'A participant asks about exam revision.', quote: 'How do I revise for exams?', sourceIds: ['reddit:1'] }];
  assert.equal(validateReport(report, evidence).communitySignals.length, 1);
  report.communitySignals[0].sourceIds = [evidence.sources[0].id];
  delete report.communitySignals[0].quote;
  assert.throws(() => validateReport(report, evidence), /discussion evidence/);
  report.communitySignals[0].sourceIds = ['reddit:1'];
  report.communitySignals[0].quote = 'An invented complaint';
  assert.throws(() => validateReport(report, evidence), /Quote absent/);
});
