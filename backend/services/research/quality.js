import { publicHttpUrl } from './urls.js';

const hostOf = url => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const belongs = (host, domains) => domains.some(domain => host === domain || host.endsWith('.' + domain));
const papers = ['arxiv.org', 'biorxiv.org', 'medrxiv.org', 'openreview.net'];
const journals = ['nature.com', 'science.org', 'thelancet.com', 'nejm.org', 'bmj.com', 'plos.org', 'pnas.org', 'acm.org', 'ieee.org', 'aclweb.org', 'aclanthology.org', 'jmlr.org'];
const institutions = ['nasa.gov', 'esa.int', 'who.int', 'cern.ch', 'nih.gov', 'noaa.gov', 'nist.gov', 'royalsociety.org'];
const original = ['openai.com', 'anthropic.com', 'deepmind.google', 'research.google', 'ai.google', 'developers.google.com', 'docs.python.org', 'developer.mozilla.org', 'microsoft.com', 'github.com'];
const publications = ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'theguardian.com', 'nytimes.com', 'ft.com', 'economist.com', 'scientificamerican.com', 'arstechnica.com'];
const commentary = ['medium.com', 'substack.com', 'reddit.com', 'quora.com', 'linkedin.com'];

export function sourceQuality(url) {
  const host = hostOf(url);
  if (belongs(host, papers)) return { type: 'Preprint / research manuscript', priority: 75, caveat: 'Peer-review status is not verified.' };
  if (belongs(host, journals)) return { type: 'Research publisher', priority: 80, caveat: 'Check the article type, methods and publication status.' };
  if (belongs(host, institutions) || /\.gov(?:\.[a-z]{2})?$/.test(host) || /\.(edu|ac\.[a-z]{2})$/.test(host)) {
    return { type: 'Institutional / public source', priority: 75, caveat: 'Institutional origin does not independently verify a claim.' };
  }
  if (belongs(host, original)) return { type: 'Original documentation / organization', priority: 65, caveat: 'First-party claims can reflect the organization’s perspective.' };
  if (belongs(host, publications)) return { type: 'Established publication', priority: 50, caveat: 'Secondary reporting; prefer linked original evidence.' };
  if (belongs(host, commentary)) return { type: 'Community / commentary', priority: 5, caveat: 'Not a substitute for original research.' };
  return { type: 'Other web source', priority: 20, caveat: 'Publisher reputation and research quality are not verified.' };
}

const stop = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'how', 'what', 'your', 'official', 'research', 'sources', 'primary', 'paper', 'diagram', 'site', '2025', '2026']);
function relevance(item, topic) {
  const terms = [...new Set((topic.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(term => !stop.has(term)))];
  const content = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
  return terms.length ? terms.filter(term => content.includes(term)).length / terms.length : 0;
}

export function rankSourceCandidates(items, topic = '') {
  const seen = new Set();
  return items.flatMap((item, index) => {
    const url = publicHttpUrl(item.url);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    const quality = sourceQuality(url);
    return [{ ...item, url, sourceType: quality.type, sourceCaveat: quality.caveat,
      selectionReason: 'Ranked by source origin, topic match and search position; this is not a fact-check or peer-review guarantee.',
      priority: quality.priority * (topic && relevance(item, topic) === 0 ? 0.4 : 1) + relevance(item, topic) * 45 + 1 / (index + 1) }];
  }).sort((a, b) => b.priority - a.priority);
}

export function imageDimensions(item) {
  const resolution = String(item.resolution || '').replaceAll(',', '').match(/(\d{2,6})\s*[x×]\s*(\d{2,6})/i);
  const width = Number(item.width) || Number(resolution?.[1]);
  const height = Number(item.height) || Number(resolution?.[2]);
  return { width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null };
}

export function rankImageCandidates(items, topic = '') {
  const seen = new Set();
  return items.flatMap((item, index) => {
    const url = publicHttpUrl(item.url), imageUrl = publicHttpUrl(item.imageUrl);
    if (!url || !imageUrl || seen.has(imageUrl)) return [];
    const host = hostOf(url);
    if (belongs(host, ['pinterest.com', 'gettyimages.com', 'shutterstock.com', 'alamy.com', 'istockphoto.com', 'depositphotos.com'])) return [];
    if (/\b(logo|favicon|avatar|watermark)\b/i.test(item.title || '') && !/\b(logo|favicon|avatar|watermark)\b/i.test(topic)) return [];
    const dimensions = imageDimensions(item);
    // Exclude known small raster results; unknown dimensions are labeled, never invented.
    const vector = /\.svg(?:\?|$)/i.test(imageUrl);
    if (!vector && dimensions.width && dimensions.height && (dimensions.width < 800 || dimensions.height < 450)) return [];
    seen.add(imageUrl);
    const origin = sourceQuality(url);
    const originalMedia = belongs(host, ['commons.wikimedia.org', 'images.nasa.gov', 'science.nasa.gov', 'esa.int', 'esahubble.org']);
    const size = vector ? 22 : dimensions.width ? Math.min(25, Math.log2(dimensions.width / 800 + 1) * 12) : 0;
    return [{ ...item, url, imageUrl, ...dimensions,
      resolutionStatus: vector ? 'Vector image' : dimensions.width && dimensions.height ? 'Dimensions reported by search' : 'Dimensions unavailable',
      sourceType: originalMedia ? 'Original media archive' : origin.type,
      qualityReason: 'Prioritized topic match, original media sources and reported resolution. Image content and usage rights require review.',
      priority: relevance(item, topic) * 70 + (originalMedia ? 35 : origin.priority / 3) + size + 1 / (index + 1) }];
  }).sort((a, b) => b.priority - a.priority);
}
