import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { collectScriptWebResearch, scriptResearchResponse, validateScriptSearchPlan } from '../services/research/scriptWebResearch.js';

const config = { webProvider: 'searxng', searxngUrl: 'http://script-search.test:8080',
  serviceUrl: 'http://script-collector.test:8001', serviceToken: 'test' };
let old;
beforeEach(() => {
  old = { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY, DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL };
  process.env.DEEPSEEK_API_KEY = 'test-key';
  process.env.DEEPSEEK_API_URL = 'https://script-planner.test/chat/completions';
});
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(old)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
const source = { id: 'S123456abcdef', url: 'https://example.org/study', title: 'Original study',
  text: 'Collected study details. '.repeat(20), collectedAt: '2026-10-18T00:00:00Z' };
const json = content => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] });

test('script search plans are bounded and can skip research for wording-only edits', () => {
  assert.deepEqual(validateScriptSearchPlan({ queries: [], imageQueries: [] }), { queries: [], imageQueries: [] });
  for (const plan of [{ queries: ['https://example.org'], imageQueries: [] },
    { queries: ['one', 'two', 'three'], imageQueries: [] }, { queries: [], imageQueries: ['a', 'b'] },
    { queries: [], imageQueries: [null] }]) assert.throws(() => validateScriptSearchPlan(plan));
});

test('disabled internet search performs no outbound requests and exposes the limitation', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => assert.fail('No network expected'));
  const pack = await collectScriptWebResearch({ idea: { title: 'Test' }, config: { webProvider: 'none' } });
  assert.equal(pack.status, 'disabled');
  assert.equal(pack.sources.length, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('wording-only edits retain saved server evidence without fresh search or image requests', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => json({ queries: [], imageQueries: [] }));
  const pack = await collectScriptWebResearch({ config, previous: { sources: [source] },
    messages: [{ role: 'user', content: 'Make the hook shorter' }], currentScript: '# Current draft' });
  assert.equal(pack.status, 'not_needed');
  assert.equal(pack.sources[0].id, source.id);
  assert.equal(fetchMock.mock.callCount(), 1);
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.ok(request.messages[0].content.includes('primary sources'));
  assert.ok(request.messages[1].content.includes('Make the hook shorter'));
});

test('script research collects actual page text and optional image metadata with stable references', async () => {
  const categories = [];
  mock.method(globalThis, 'fetch', async (value, options) => {
    const url = new URL(value);
    if (url.hostname === 'script-planner.test') return json({ queries: ['fusion official reference test'], imageQueries: ['fusion device diagram test'] });
    if (url.hostname === 'script-search.test') {
      categories.push(url.searchParams.get('categories'));
      return Response.json({ results: url.searchParams.get('categories') === 'images' ? [
        { url: 'https://example.org/image-page', img_src: 'https://example.org/fusion.jpg', thumbnail_src: 'https://example.org/thumb.jpg', title: 'Fusion device' },
        { url: 'https://example.org/bad-image', img_src: 'http://127.0.0.1/private' }
      ] : [
        { url: 'https://example.org/study', title: 'Study', content: 'UNSEEN SNIPPET' },
        { url: 'https://example.org/duplicate', title: 'Same domain' },
        { url: 'http://127.0.0.1/private', title: 'Unsafe' }
      ] });
    }
    if (url.hostname === 'script-collector.test') return Response.json({
      url: JSON.parse(options.body).url, title: 'Original research', text: 'Collected paper text. '.repeat(200),
      complete: true, publishedAt: '2026-10-18'
    });
    assert.fail('Unexpected request');
  });
  const pack = await collectScriptWebResearch({ config, idea: { title: 'Fusion' }, messages: [{ role: 'user', content: 'Draft' }] });
  assert.deepEqual(categories.sort(), ['general', 'images']);
  assert.equal(pack.sources.length, 1);
  assert.equal(pack.sources[0].text.length, 3000);
  assert.equal(pack.sources[0].complete, false);
  assert.ok(!pack.sources[0].text.includes('UNSEEN SNIPPET'));
  assert.match(pack.sources[0].id, /^S[a-f0-9]{12}$/);
  assert.equal(pack.images.length, 1);
  assert.match(pack.images[0].id, /^I[a-f0-9]{12}$/);
  assert.equal(pack.images[0].license, 'Not verified');
  assert.equal(pack.images[0].url, 'https://example.org/image-page');
  const response = scriptResearchResponse(pack, { reply: 'Drafted', script: `Fact [${pack.sources[0].id}]. [VISUAL: device [${pack.images[0].id}]]` });
  assert.equal(response.sources[0].cited, true);
  assert.equal(response.images[0].cited, true);
  assert.equal(response.sources[0].text, undefined);
  assert.ok(response.sources[0].excerpt.length <= 500);
});

test('unavailable page collection never promotes a search snippet into factual evidence', async () => {
  mock.method(globalThis, 'fetch', async value => {
    if (new URL(value).hostname === 'script-planner.test') return json({ queries: ['snippet-only test'], imageQueries: [] });
    return Response.json({ results: [{ url: 'https://example.net/article', title: 'Article', content: 'Uncollected claim' }] });
  });
  const pack = await collectScriptWebResearch({ config: { ...config, serviceToken: '' } });
  assert.equal(pack.sources.length, 0);
  assert.equal(pack.status, 'unavailable');
  assert.ok(pack.warnings.some(warning => warning.includes('snippets')));
});

test('web outage returns an explicit unavailable state rather than fake evidence', async () => {
  mock.method(globalThis, 'fetch', async value => new URL(value).hostname === 'script-planner.test'
    ? json({ queries: ['outage test'], imageQueries: [] }) : new Response('', { status: 503 }));
  const pack = await collectScriptWebResearch({ config });
  assert.equal(pack.status, 'unavailable');
  assert.equal(pack.sources.length, 0);
  assert.ok(pack.warnings.length);
});

test('draft references reject fabricated IDs and warn when collected evidence is not cited', () => {
  const pack = { status: 'collected', sources: [source], images: [], warnings: [], queries: [] };
  for (const citation of ['Sdeadbeefcafe', 'S1', 'I123456abcdef']) {
    assert.throws(() => scriptResearchResponse(pack, { reply: 'Done', script: `Claim [${citation}]` }), /unknown research reference/);
  }
  const response = scriptResearchResponse(pack, { reply: 'Done', script: '# An uncited draft' });
  assert.ok(response.warnings.some(warning => warning.includes('unverified')));
  assert.equal(response.sources[0].cited, false);
  assert.throws(() => scriptResearchResponse(pack, { script: {}, reply: 'Done' }), /invalid draft/);
});

test('explicit search exposes discovered links even when full page collection is unavailable', async () => {
  const categories = [];
  mock.method(globalThis, 'fetch', async value => {
    const url = new URL(value);
    if (url.hostname === 'script-planner.test') return json({ queries: [], imageQueries: [] });
    categories.push(url.searchParams.get('categories'));
    return Response.json({ results: [{ url: 'https://example.org/search-only', title: 'Discovered document', content: 'A search excerpt' }] });
  });
  const pack = await collectScriptWebResearch({ config: { ...config, serviceToken: '' }, intent: 'chat', researchMode: 'sources',
    idea: { title: 'A specific scientific topic' } });
  assert.deepEqual(categories, ['general']);
  assert.equal(pack.searchResults.length, 1);
  assert.equal(pack.sources.length, 0);
  assert.equal(pack.searchResults[0].title, 'Discovered document');
  assert.ok(pack.activity.some(entry => entry.event === 'plan.completed'));
});

test('explicit image action and initial generation do not silently skip empty search plans', async () => {
  const categories = [];
  mock.method(globalThis, 'fetch', async value => {
    const url = new URL(value);
    if (url.hostname === 'script-planner.test') return json({ queries: [], imageQueries: [] });
    categories.push(url.searchParams.get('categories'));
    return Response.json({ results: [{ url: 'https://example.org/visual', title: 'Diagram', img_src: 'https://example.org/diagram.png' }] });
  });
  const pack = await collectScriptWebResearch({ config, intent: 'chat', researchMode: 'images', idea: { title: 'Image action test' } });
  assert.deepEqual(categories, ['images']);
  assert.equal(pack.images.length, 1);
  categories.length = 0;
  await collectScriptWebResearch({ config: { ...config, serviceToken: '' }, intent: 'generate', idea: { title: 'New draft search test' } });
  assert.deepEqual(categories.sort(), ['general', 'images']);
});

test('new image searches refresh unused candidates while retaining images cited in the draft', async () => {
  const images = Array.from({ length: 8 }, (_, index) => ({ id: 'I' + index.toString(16).padStart(12, '0'),
    url: 'https://example.org/old-' + index, imageUrl: 'https://example.org/old-' + index + '.png' }));
  mock.method(globalThis, 'fetch', async value => new URL(value).hostname === 'script-planner.test'
    ? json({ queries: [], imageQueries: ['refreshed image search test'] })
    : Response.json({ results: [{ url: 'https://example.org/new-image', title: 'New candidate', img_src: 'https://example.org/new-image.png' }] }));
  const pack = await collectScriptWebResearch({ config, previous: { images }, intent: 'chat', researchMode: 'images',
    currentScript: `[VISUAL: Keep this [${images[0].id}]]` });
  assert.equal(pack.images.length, 8);
  assert.ok(pack.images.some(image => image.id === images[0].id));
  assert.ok(pack.images.some(image => image.title === 'New candidate'));
});
