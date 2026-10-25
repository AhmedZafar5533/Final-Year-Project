import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import ScriptWebResearch from '../models/ScriptWebResearch.js';
import { getScriptImage } from '../controllers/scriptImageController.js';
import { imagePreviewUrl } from '../services/research/urls.js';
import { searchImages } from '../services/research/webSearch.js';

afterEach(() => mock.restoreAll());
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, set(headers) { this.headers = headers; }, send(body) { this.body = body; return this; } });

test('preview normalization preserves embedded raster thumbnails and protocol-relative URLs safely', async () => {
  assert.equal(imagePreviewUrl('//images.example.org/photo.jpg'), 'https://images.example.org/photo.jpg');
  assert.equal(imagePreviewUrl('data:image/png;base64,aGVsbG8='), 'data:image/png;base64,aGVsbG8=');
  for (const value of ['data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 'http://127.0.0.1/a']) assert.equal(imagePreviewUrl(value), null);
  mock.method(globalThis, 'fetch', async () => Response.json({ results: [{ url: 'https://example.org/source', img_src: '//images.example.org/photo.jpg', thumbnail_src: 'data:image/png;base64,aGVsbG8=' }] }));
  const result = await searchImages('image normalization fixture', 'en', { searxngUrl: 'https://search.example.org', webProvider: 'searxng' }, { usage: {} });
  assert.equal(result.results[0].imageUrl, 'https://images.example.org/photo.jpg');
  assert.equal(result.results[0].thumbnailUrl, 'data:image/png;base64,aGVsbG8=');
});

test('image fallback only retrieves saved owner-scoped URLs and caches successful thumbnail bytes', async () => {
  const oldToken = process.env.RESEARCH_SERVICE_TOKEN;
  process.env.RESEARCH_SERVICE_TOKEN = 'test-token';
  try {
    mock.method(ScriptWebResearch, 'findOne', query => {
      assert.equal(query.userId, 'owner');
      assert.equal(query['images.id'], 'Iabcdef123456');
      assert.ok(query.expiresAt.$gt instanceof Date);
      return { lean: async () => ({ images: [{ id: 'Iabcdef123456', url: 'https://example.org/source', imageUrl: 'https://example.org/blocked.jpg', thumbnailUrl: 'https://example.org/good.jpg' }] }) };
    });
    const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
      assert.ok(url.endsWith('/image'));
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      const data = JSON.parse(options.body);
      assert.equal(data.source_url, 'https://example.org/source');
      return data.url.endsWith('/blocked.jpg') ? new Response('Forbidden', { status: 403 }) : new Response('fixture image', { headers: { 'Content-Type': 'image/png' } });
    });
    for (let i = 0; i < 2; i++) {
      const res = response();
      await getScriptImage({ user: { _id: 'owner' }, body: { imageId: 'Iabcdef123456', url: 'http://127.0.0.1/private' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.toString(), 'fixture image');
      assert.equal(res.headers['Content-Type'], 'image/png');
    }
    assert.equal(fetchMock.mock.callCount(), 2);
  } finally { if (oldToken === undefined) delete process.env.RESEARCH_SERVICE_TOKEN; else process.env.RESEARCH_SERVICE_TOKEN = oldToken; }
});

test('missing research and malformed IDs never request external images', async () => {
  mock.method(ScriptWebResearch, 'findOne', () => ({ lean: async () => null }));
  const fetchMock = mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch'); });
  for (const [imageId, code] of [['invalid', 400], ['Iabcdef123456', 404]]) {
    const res = response();
    await getScriptImage({ user: { _id: 'another-owner' }, body: { imageId } }, res);
    assert.equal(res.statusCode, code);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
