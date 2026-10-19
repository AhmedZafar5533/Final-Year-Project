import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

let moduleId = 0;
let originalEnv;
const configKeys = ['DEEPSEEK_API_KEY', 'DEEPSEEK_API_URL', 'DEEPSEEK_MODEL'];
const loadService = () => import('../services/sentimentService.js?test=' + moduleId++);
const input = [
  { id: 'one', text: 'Great video!<br/>Loved it', author: 'Viewer', authorAvatar: 'avatar', likes: 2 },
  { id: 'two', text: 'What is the timestamp?' },
  { id: 'three', text: 'The audio is terrible.' }
];

function reply(comments, finishReason = 'stop') {
  return Response.json({
    choices: [{ finish_reason: finishReason, message: { content: JSON.stringify({ comments }) } }]
  });
}

function automaticReply(_url, options) {
  const comments = JSON.parse(JSON.parse(options.body).messages[1].content).comments;
  return Promise.resolve(reply(comments.map(comment => ({ id: comment.id, label: 'POSITIVE' }))));
}

beforeEach(() => {
  originalEnv = Object.fromEntries(configKeys.map(key => [key, process.env[key]]));
  process.env.DEEPSEEK_API_KEY = 'test-secret';
  delete process.env.DEEPSEEK_API_URL;
  delete process.env.DEEPSEEK_MODEL;
});

afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('empty input needs neither credentials nor an API call', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  const fetchMock = mock.method(globalThis, 'fetch', () => assert.fail('Unexpected API call'));
  const { getCommentsSentiment } = await loadService();
  for (const comments of [[], null, undefined]) {
    const result = await getCommentsSentiment(comments);
    assert.equal(result.comments.length, 0);
    assert.deepEqual(result.sentimentSummary, {
      positive_count: 0, neutral_count: 0, negative_count: 0,
      positive_percentage: 0, neutral_percentage: 0, negative_percentage: 0, total: 0
    });
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('missing or placeholder credentials fail without local or demo fallback', async () => {
  const { getCommentsSentiment } = await loadService();
  mock.method(globalThis, 'fetch', () => assert.fail('Unexpected API call'));
  for (const key of ['', '  ', 'your_deepseek_api_key_here']) {
    process.env.DEEPSEEK_API_KEY = key;
    await assert.rejects(getCommentsSentiment(input, 'vid1'), { code: 'SENTIMENT_UNAVAILABLE', statusCode: 503 });
  }
});

test('matches reordered results by ID, preserves metadata, and calculates counts locally', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => reply([
    { id: '2', label: 'NEGATIVE' },
    { id: '0', label: 'POSITIVE' },
    { id: '1', label: 'NEUTRAL' }
  ]));
  const { getCommentsSentiment } = await loadService();
  const result = await getCommentsSentiment(input, 'vid1');
  assert.deepEqual(result.comments.map(comment => comment.sentiment.label), ['POSITIVE', 'NEUTRAL', 'NEGATIVE']);
  assert.equal(result.comments[0].authorAvatar, 'avatar');
  assert.equal(result.comments[0].likes, 2);
  assert.equal(result.comments[0].sentiment.provider, 'deepseek');
  assert.equal(result.comments[0].sentiment.model, 'deepseek-flash');
  assert.equal('confidence' in result.comments[0].sentiment, false);
  assert.equal('sentiment' in input[0], false);
  assert.deepEqual(result.sentimentSummary, {
    positive_count: 1, neutral_count: 1, negative_count: 1,
    positive_percentage: 33.3, neutral_percentage: 33.3, negative_percentage: 33.3, total: 3
  });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  const body = JSON.parse(options.body);
  assert.equal(url, 'https://api.deepseek.com/chat/completions');
  assert.equal(options.headers.Authorization, 'Bearer test-secret');
  assert.equal(body.model, 'deepseek-flash');
  assert.equal(body.thinking.type, 'disabled');
  assert.equal(body.response_format.type, 'json_object');
  const sent = JSON.parse(body.messages[1].content).comments;
  assert.deepEqual(sent[0], { id: '0', text: 'Great video! Loved it' });
  assert.ok(options.signal instanceof AbortSignal);
});

test('uses configured endpoint, model, and trimmed API key', async () => {
  process.env.DEEPSEEK_API_KEY = ' test-secret ';
  process.env.DEEPSEEK_API_URL = 'https://deepseek.example/chat/completions';
  process.env.DEEPSEEK_MODEL = 'custom-deepseek';
  const fetchMock = mock.method(globalThis, 'fetch', automaticReply);
  const { getCommentsSentiment } = await loadService();
  const result = await getCommentsSentiment(input);
  assert.equal(fetchMock.mock.calls[0].arguments[0], process.env.DEEPSEEK_API_URL);
  assert.equal(result.comments[0].sentiment.model, 'custom-deepseek');
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers.Authorization, 'Bearer test-secret');
});

test('splits larger input into batches while keeping missing or duplicate source IDs distinct', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', automaticReply);
  const { getCommentsSentiment } = await loadService();
  const comments = Array.from({ length: 61 }, (_, index) => ({
    id: index % 2 ? undefined : 'duplicate', textDisplay: 'Comment ' + index
  }));
  const result = await getCommentsSentiment(comments);
  assert.equal(fetchMock.mock.callCount(), 3);
  assert.equal(result.sentimentSummary.positive_count, 61);
  for (const call of fetchMock.mock.calls) {
    const sent = JSON.parse(JSON.parse(call.arguments[1].body).messages[1].content).comments;
    assert.ok(sent.length <= 25);
    assert.ok(sent.every(comment => comment.text.startsWith('Comment ')));
  }
  assert.deepEqual(result.comments.map(comment => comment.id), comments.map(comment => comment.id));
});

test('shares concurrent requests and cached labels while retaining each callers metadata', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', automaticReply);
  const { getCommentsSentiment } = await loadService();
  const [first, second] = await Promise.all([
    getCommentsSentiment(input, 'same-video'),
    getCommentsSentiment(input.map(comment => ({ ...comment, likes: 99 })), 'same-video')
  ]);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(first.comments[0].likes, 2);
  assert.equal(second.comments[0].likes, 99);
  await getCommentsSentiment(input, 'same-video');
  assert.equal(fetchMock.mock.callCount(), 1);
  await getCommentsSentiment([{ ...input[0], text: 'Edited comment' }], 'same-video');
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('expires cached labels after five minutes', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', automaticReply);
  let now = 1000;
  mock.method(Date, 'now', () => now);
  const { getCommentsSentiment } = await loadService();
  await getCommentsSentiment(input);
  now += 5 * 60 * 1000;
  await getCommentsSentiment(input);
  assert.equal(fetchMock.mock.callCount(), 2);
});

const invalidResponses = {
  missing: [{ id: '0', label: 'POSITIVE' }],
  duplicate: [{ id: '0', label: 'POSITIVE' }, { id: '0', label: 'NEUTRAL' }, { id: '2', label: 'NEGATIVE' }],
  unknown: [{ id: '0', label: 'POSITIVE' }, { id: '1', label: 'NEUTRAL' }, { id: '99', label: 'NEGATIVE' }],
  invalidLabel: [{ id: '0', label: 'MIXED' }, { id: '1', label: 'NEUTRAL' }, { id: '2', label: 'NEGATIVE' }],
  nullItem: [null, { id: '1', label: 'NEUTRAL' }, { id: '2', label: 'NEGATIVE' }]
};

for (const [name, response] of Object.entries(invalidResponses)) {
  test('rejects ' + name + ' classifications without inventing neutral labels', async () => {
    mock.method(globalThis, 'fetch', async () => reply(response));
    const { getCommentsSentiment } = await loadService();
    await assert.rejects(getCommentsSentiment(input), { code: 'SENTIMENT_UNAVAILABLE' });
  });
}

test('rejects truncated, empty, and malformed JSON responses', async () => {
  const { getCommentsSentiment } = await loadService();
  const responses = [
    reply([], 'length'),
    Response.json({ choices: [{ finish_reason: 'stop', message: { content: '' } }] }),
    Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] })
  ];
  mock.method(globalThis, 'fetch', async () => responses.shift());
  for (let index = 0; index < 3; index++) {
    await assert.rejects(getCommentsSentiment(input), { code: 'SENTIMENT_UNAVAILABLE' });
  }
});

for (const status of [401, 429, 500]) {
  test('surfaces HTTP ' + status + ' and allows a subsequent request to recover', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('Upstream error', { status }));
    const { getCommentsSentiment } = await loadService();
    await assert.rejects(getCommentsSentiment(input), { code: 'SENTIMENT_UNAVAILABLE', statusCode: 503 });
    fetchMock.mock.mockImplementation(automaticReply);
    assert.equal((await getCommentsSentiment(input)).sentimentSummary.total, 3);
    assert.equal(fetchMock.mock.callCount(), 2);
  });
}

test('handles network errors, timeouts, and response-body failures', async () => {
  const { getCommentsSentiment } = await loadService();
  const failures = [
    () => { throw new TypeError('Network unavailable'); },
    () => { throw new DOMException('Timed out', 'TimeoutError'); },
    () => ({ ok: true, json: async () => { throw new Error('Body failed'); } })
  ];
  mock.method(globalThis, 'fetch', (...args) => failures.shift()(...args));
  for (let index = 0; index < 3; index++) {
    await assert.rejects(getCommentsSentiment(input), { code: 'SENTIMENT_UNAVAILABLE' });
  }
});
