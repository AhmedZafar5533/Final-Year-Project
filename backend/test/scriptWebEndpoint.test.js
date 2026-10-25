import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import ScriptWebResearch from '../models/ScriptWebResearch.js';

let old, handler;
beforeEach(async () => {
  const values = { DEEPSEEK_API_KEY: 'endpoint-test-key', DEEPSEEK_API_URL: 'https://endpoint-model.test/chat', WEB_SEARCH_PROVIDER: 'none' };
  old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  handler = (await import('../controllers/youtubeController.js')).handleScriptStudioChat;
});
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(old)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('script endpoint loads and saves sources under the authenticated owner and exports actual citations', async () => {
  const source = { id: 'S123456abcdef', url: 'https://example.org/actual-paper', title: 'Original paper', text: 'Real collected text', collectedAt: new Date().toISOString() };
  const reads = [], writes = [];
  mock.method(ScriptWebResearch, 'findOne', query => {
    reads.push(query);
    return { lean: async () => query.userId === 'owner-one' ? { sources: [source] } : {} };
  });
  mock.method(ScriptWebResearch, 'init', async () => {});
  mock.method(ScriptWebResearch, 'updateOne', async (query, update) => { writes.push({ query, update }); });
  mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://endpoint-model.test/chat');
    const messages = JSON.parse(options.body).messages;
    const data = messages.find(message => message.content.startsWith('SCRIPT WEB RESEARCH'));
    assert.ok(!data.content.includes('client-forged-source'));
    const cited = data.content.includes(source.id);
    return Response.json({ choices: [{ message: { content: JSON.stringify({
      reply: 'Drafted', script: cited ? 'A supported claim [S123456abcdef]' : 'Provisional draft [CHECK SOURCE]', suggested_followups: []
    }) } }] });
  });
  for (const owner of ['owner-one', 'owner-two']) {
    const res = response();
    await handler({ user: { _id: owner }, body: { sessionId: 'same-session', requestMode: 'edit', messages: [{ role: 'user', content: 'Shorten this draft' }],
      webResearchContext: { sources: [{ text: 'client-forged-source' }] } } }, res);
    assert.equal(res.code, 200);
    if (owner === 'owner-one') {
      assert.ok(res.body.script.includes('## Research references'));
      assert.ok(res.body.script.includes(source.url));
      assert.equal(res.body.webResearch.sources[0].cited, true);
    } else assert.equal(res.body.webResearch.sources.length, 0);
  }
  assert.deepEqual(reads.map(query => query.userId), ['owner-one', 'owner-two']);
  assert.ok(reads.every(query => query.expiresAt.$gt instanceof Date));
  assert.deepEqual(writes.map(item => item.query), [
    { userId: 'owner-one', sessionId: 'same-session' }, { userId: 'owner-two', sessionId: 'same-session' }
  ]);
});

test('invalid script sessions and malformed messages fail before search or database access', async () => {
  mock.method(globalThis, 'fetch', () => assert.fail('No provider calls expected'));
  mock.method(ScriptWebResearch, 'findOne', () => assert.fail('No database call expected'));
  for (const body of [{ sessionId: { $ne: null } }, { messages: [null] }, { currentScript: {} }, { sessionId: 'bad/session' },
    { requestMode: 'unknown' }, { researchMode: 'unknown' }]) {
    const res = response();
    await handler({ user: { _id: 'owner-one' }, body }, res);
    assert.equal(res.code, 400);
  }
});

test('automatic questions return chat answers and discard a model-proposed rewrite', async () => {
  const calls = [];
  mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    const content = body.messages[0].content.startsWith('Classify') ? { intent: 'chat' } :
      { reply: 'Gravity is an interaction.', script: '# An unauthorized replacement', suggested_followups: [] };
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] });
  });
  const res = response();
  const original = '# My script\nKeep this exact text.';
  await handler({ user: { _id: 'owner-one' }, body: { currentScript: original,
    messages: [{ role: 'user', content: 'What is gravity?' }] } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.intent, 'chat');
  assert.equal(res.body.script, null);
  assert.equal(res.body.scriptUpdated, false);
  assert.equal(res.body.reply, 'Gravity is an interaction.');
  assert.equal(calls.length, 2);
  assert.ok(calls.at(-1).messages[0].content.includes('REQUEST INTENT: chat'));
});

test('Ask only overrides edit-like wording and Edit script applies the changed draft', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: JSON.stringify({
    reply: 'Here is the result.', script: '# Revised draft', suggested_followups: []
  }) } }] }));
  for (const mode of ['chat', 'edit']) {
    const res = response();
    await handler({ user: { _id: 'owner-one' }, body: { requestMode: mode, currentScript: '# Original draft',
      messages: [{ role: 'user', content: 'Make the hook shorter' }] } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.scriptUpdated, mode === 'edit');
    assert.equal(res.body.script, mode === 'edit' ? '# Revised draft' : null);
  }
});

test('automatic refinement classification applies the requested script change', async () => {
  mock.method(globalThis, 'fetch', async (_url, options) => {
    const messages = JSON.parse(options.body).messages;
    const content = messages[0].content.startsWith('Classify') ? { intent: 'refine' } :
      { reply: 'Shortened the hook.', script: '# Draft\nA shorter hook.', suggested_followups: [] };
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] });
  });
  const res = response();
  await handler({ user: { _id: 'owner-one' }, body: { currentScript: '# Draft\nA lengthy original hook.',
    messages: [{ role: 'user', content: 'Shorten the hook in the script.' }] } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.intent, 'refine');
  assert.equal(res.body.scriptUpdated, true);
  assert.equal(res.body.script, '# Draft\nA shorter hook.');
});

test('image placements embed in the draft and persist captions for subsequent chat-only answers', async () => {
  const image = { id: 'I123456abcdef', title: 'Original diagram', url: 'https://example.org/diagram', imageUrl: 'https://example.org/diagram.png' };
  const writes = [];
  mock.method(ScriptWebResearch, 'findOne', () => ({ lean: async () => ({ sources: [], images: [image] }) }));
  mock.method(ScriptWebResearch, 'init', async () => {});
  mock.method(ScriptWebResearch, 'updateOne', async (query, update) => { writes.push({ query, update }); });
  mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: JSON.stringify({
    reply: 'Added a relevant visual.', script: '# Video\n## The mechanism\nAn explanation.',
    imagePlacements: [{ imageId: image.id, sectionHeading: 'The mechanism', caption: 'Mechanism diagram', alt: 'A mechanism diagram' }]
  }) } }] }));
  const res = response();
  await handler({ user: { _id: 'owner-one' }, body: { sessionId: 'image-session', requestMode: 'edit', currentScript: '# Video',
    messages: [{ role: 'user', content: 'Embed a relevant image in the script.' }] } }, res);
  assert.equal(res.code, 200);
  assert.ok(res.body.script.includes('## The mechanism\n[IMAGE:I123456abcdef]'));
  assert.equal(res.body.webResearch.images[0].caption, 'Mechanism diagram');
  assert.equal(writes.at(-1).update.$set.images[0].alt, 'A mechanism diagram');
  assert.deepEqual(writes.at(-1).query, { userId: 'owner-one', sessionId: 'image-session' });
});
