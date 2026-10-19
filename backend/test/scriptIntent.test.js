import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { classifyScriptRequest } from '../services/research/scriptIntent.js';
import { createResearchLogger } from '../services/research/logger.js';

afterEach(() => mock.restoreAll());

test('manual request modes do not need classification or permit Ask only to edit', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', () => assert.fail('No classification call expected'));
  const input = { messages: [{ role: 'user', content: 'Shorten the hook' }], currentScript: '# Draft' };
  assert.equal(await classifyScriptRequest({ ...input, requestMode: 'chat' }), 'chat');
  assert.equal(await classifyScriptRequest({ ...input, requestMode: 'edit' }), 'refine');
  assert.equal(await classifyScriptRequest({ ...input, currentScript: '', requestMode: 'edit' }), 'generate');
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('research logging records stages while removing credentials and URL query strings', () => {
  const original = process.env.RESEARCH_LOGGING;
  process.env.RESEARCH_LOGGING = '1';
  try {
    const lines = [];
    mock.method(console, 'log', (...parts) => lines.push(parts.join(' ')));
    const logger = createResearchLogger('script', 'safe-request');
    logger('search.failed', { endpoint: 'https://user:password@example.org/search?key=secret',
      apiKey: 'private-key', authorization: 'Bearer sensitive', cookie: 'sensitive', status: 403 });
    const output = lines.join('\n');
    assert.ok(output.includes('search.failed'));
    assert.ok(output.includes('https://example.org/search'));
    assert.ok(output.includes('403'));
    for (const value of ['private-key', 'password', 'sensitive', '?key']) assert.ok(!output.includes(value));
  } finally {
    if (original === undefined) delete process.env.RESEARCH_LOGGING; else process.env.RESEARCH_LOGGING = original;
  }
});
