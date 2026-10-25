import { useEffect, useState } from 'react';
import { IoImageOutline } from 'react-icons/io5';
import api from '../../services/api';

const imageUrl = value => {
  if (typeof value !== 'string') return null;
  if (value.length <= 256000 && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-zA-Z0-9+/=]+$/.test(value)) return value;
  try {
    const url = new URL(value.startsWith('//') ? 'https:' + value : value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};

export default function ResearchImage({ image, alt, className = '', thumbnailFirst = false }) {
  const candidates = [...new Set((thumbnailFirst ? [image.thumbnailUrl, image.imageUrl] : [image.imageUrl, image.thumbnailUrl]).map(imageUrl).filter(Boolean))];
  const [attempt, setAttempt] = useState(0);
  const [proxied, setProxied] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const needsProxy = attempt >= candidates.length;
  useEffect(() => {
    if (!needsProxy) return;
    const controller = new AbortController();
    let objectUrl;
    api.post('/youtube/script-studio/image', { imageId: image.id }, { responseType: 'blob', signal: controller.signal, timeout: 32000 })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(data);
        setProxied(objectUrl);
      }).catch(() => { if (!controller.signal.aborted) setUnavailable(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [needsProxy, image.id]);
  const picture = needsProxy ? proxied : candidates[attempt];
  const source = imageUrl(image.url);
  if (unavailable) return <a href={source} target="_blank" rel="noopener noreferrer" className="min-h-40 p-6 flex flex-col items-center justify-center gap-3 text-text-muted">
    <IoImageOutline className="w-8 h-8" /><span className="text-sm">View image on its source page</span><span className="text-xs underline">Open original source</span>
  </a>;
  if (!picture) return <div role="status" className="min-h-40 flex items-center justify-center text-sm text-text-muted animate-pulse">Loading visual…</div>;
  // Open the URL that actually rendered, including the thumbnail or collected blob.
  return <a href={picture.startsWith('data:') ? source : picture} target="_blank" rel="noopener noreferrer" aria-label={`Open image: ${image.title || 'Visual reference'}`} className="block">
    <img key={picture} src={picture} alt={alt || image.alt || image.title || 'Visual reference'} loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => { if (needsProxy) setUnavailable(true); else setAttempt(value => value + 1); }} className={className} />
  </a>;
}
