import ScriptWebResearch from '../models/ScriptWebResearch.js';
import { researchConfig } from '../config/research.js';
import { publicHttpUrl } from '../services/research/urls.js';

const cache = new Map();
const inFlight = new Map();
const MAX_BYTES = 6 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']);

async function retrieve(image, config) {
  for (const url of new Set([image.imageUrl, image.thumbnailUrl].map(publicHttpUrl).filter(Boolean))) {
    try {
      const response = await fetch(config.serviceUrl.replace(/\/$/, '') + '/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.serviceToken },
        body: JSON.stringify({ url, source_url: image.url }), signal: AbortSignal.timeout(14000)
      });
      const type = response.headers.get('content-type')?.split(';')[0].trim();
      if (!response.ok || !imageTypes.has(type)) { await response.body?.cancel(); continue; }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_BYTES) throw new Error('Image too large');
        chunks.push(chunk);
      }
      if (!size) continue;
      return { body: Buffer.concat(chunks), type, expires: Date.now() + 3600000 };
    } catch { /* Try the search-engine thumbnail if the original cannot be fetched. */ }
  }
  throw new Error('Image unavailable');
}

export async function getScriptImage(req, res) {
  const imageId = req.body?.imageId;
  if (typeof imageId !== 'string' || !/^I[a-f0-9]{12}$/.test(imageId)) return res.status(400).json({ error: 'Invalid image reference.' });
  try {
    // Only fetch URLs already saved in this user's research, never arbitrary request URLs.
    const saved = await ScriptWebResearch.findOne({ userId: req.user._id, 'images.id': imageId, expiresAt: { $gt: new Date() } }).lean();
    const image = saved?.images?.find(item => item.id === imageId);
    if (!image || !publicHttpUrl(image.url)) return res.status(404).json({ error: 'Image reference has expired. Find images again.' });
    const config = researchConfig();
    if (!config.serviceToken) return res.status(503).json({ error: 'Image collector is not configured.' });
    const key = JSON.stringify([String(req.user._id), image.imageUrl, image.thumbnailUrl]);
    let result = cache.get(key);
    if (!result || result.expires <= Date.now()) {
      if (!inFlight.has(key)) inFlight.set(key, retrieve(image, config));
      const pending = inFlight.get(key);
      try { result = await pending; } finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
      cache.delete(key);
      cache.set(key, result);
      // Keep the process cache bounded to 24 MB; browser blobs handle repeated viewing.
      let size = [...cache.values()].reduce((sum, entry) => sum + entry.body.length, 0);
      while (size > 24 * 1024 * 1024) {
        const oldest = cache.keys().next().value;
        size -= cache.get(oldest).body.length;
        cache.delete(oldest);
      }
    }
    res.set({ 'Content-Type': result.type, 'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
    return res.send(result.body);
  } catch {
    return res.status(502).json({ error: 'Image could not be loaded. Open the source page or find another image.' });
  }
}
