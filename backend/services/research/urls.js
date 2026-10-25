export function publicHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    // DNS and redirect checks are enforced again by the collector.
    if (url.port && !['80', '443'].includes(url.port)) return null;
    if (!url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(url.hostname)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function imagePreviewUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Some image engines return an embedded raster thumbnail instead of a URL.
  if (trimmed.length <= 256000 && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-zA-Z0-9+/=]+$/.test(trimmed)) return trimmed;
  return publicHttpUrl(trimmed.startsWith('//') ? 'https:' + trimmed : trimmed);
}
