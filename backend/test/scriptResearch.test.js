import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

let originalKey, moduleId = 0;
beforeEach(() => { originalKey = process.env.DEEPSEEK_API_KEY; process.env.DEEPSEEK_API_KEY = 'test-script-key'; });
afterEach(() => {
  mock.restoreAll();
  if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = originalKey;
});
const context = {
  idea: { title: 'Study workflow' }, researchedAt: '2026-10-18T00:00:00Z', stale: false,
  findings: { summary: { text: 'A sourced viewer question', sourceIds: ['comment-1'] } },
  sources: [{ id: 'comment-1', url: 'https://example.org/source', title: 'Source' }]
};
const service = () => import('../services/deepseekService.js?script-research-test=' + moduleId++);

test('initial script generation receives saved research without mutating the original conversation', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({
    choices: [{ message: { content: JSON.stringify({ reply: 'Drafted using research', script: '# A practical workflow' }) } }]
  }));
  const { chatScriptStudio } = await service();
  const messages = [{ role: 'user', content: 'Generate a script.' }];
  const response = await chatScriptStudio({ idea: context.idea, messages, researchContext: context });
  assert.equal(response.researchUsed, true);
  assert.equal(messages[0].content, 'Generate a script.');
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.ok(request.messages.some(message => message.content.includes('A sourced viewer question')));
  assert.ok(request.messages.at(-1).content.includes('VIDEO CONCEPT DETAILS'));
  assert.equal(request.messages[0].role, 'system');
});

test('follow-up editing retains the research context and existing draft', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({
    choices: [{ message: { content: JSON.stringify({ reply: 'Updated', script: '# Updated draft' }) } }]
  }));
  const { chatScriptStudio } = await service();
  await chatScriptStudio({
    idea: context.idea, researchContext: context, currentScript: '# Existing draft',
    messages: [{ role: 'user', content: 'Draft' }, { role: 'assistant', content: 'Done', intent: 'chat', scriptUpdated: false }, { role: 'user', content: 'Improve the examples' }]
  });
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.ok(request.messages.some(message => message.content.includes('A sourced viewer question')));
  assert.ok(request.messages.some(message => message.content.includes('# Existing draft')));
  assert.ok(request.messages.every(message => Object.keys(message).every(key => ['role', 'content'].includes(key))));
});

test('failed research-informed generation does not pretend an offline fallback used evidence', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const { chatScriptStudio } = await service();
  await assert.rejects(chatScriptStudio({
    idea: context.idea, researchContext: context, messages: [{ role: 'user', content: 'Draft' }]
  }), { statusCode: 503 });
});

test('script drafting receives collected web evidence and image candidates as untrusted user data', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({
    choices: [{ message: { content: JSON.stringify({ reply: 'Drafted', script: 'Claim [S123456abcdef]' }) } }]
  }));
  const { chatScriptStudio } = await service();
  await chatScriptStudio({ messages: [{ role: 'user', content: 'Draft a video.' }],
    webResearchContext: { sources: [{ id: 'S123456abcdef', text: 'Collected original research' }], images: [{ id: 'I123456abcdef', title: 'Candidate image' }] } });
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.ok(request.messages.some(message => message.role === 'user' && message.content.includes('Collected original research')));
  assert.ok(request.messages[0].content.includes('[CHECK SOURCE]'));
  assert.ok(request.messages[0].content.includes('Their pixels were'));
});

test('failed web-informed generation does not return an offline script', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  const { chatScriptStudio } = await service();
  await assert.rejects(chatScriptStudio({ messages: [{ role: 'user', content: 'Draft' }],
    webResearchContext: { sources: [], images: [], warnings: ['Search unavailable'] } }), { statusCode: 503 });
});
