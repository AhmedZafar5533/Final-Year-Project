import { researchError } from '../../config/research.js';
const headingKey = value => value.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function embedScriptImages(response, images = []) {
  if (!response.script) { response.imagePlacements = []; return; }
  const library = new Map(images.map(image => [image.id, image]));
  const placements = response.imagePlacements ?? [];
  if (!Array.isArray(placements) || placements.length > 4) throw researchError('Invalid script image placements. Please retry.');
  const lines = response.script.split('\n');
  const used = new Set([...response.script.matchAll(/\[IMAGE:(I[a-f0-9]{12})\]/g)].map(match => match[1]));
  if ([...used].some(id => !library.has(id))) throw researchError('Unknown embedded image reference. Please retry.');
  const validated = [];
  const afterHeading = new Map();
  const headings = new Map();
  let references = false;
  for (const [index, line] of lines.entries()) {
    if (/^##\s+Research references\s*$/i.test(line)) references = true;
    if (!references && /^#{1,3}\s+/.test(line)) {
      const key = headingKey(line.replace(/^#{1,3}\s+/, ''));
      headings.set(key, headings.has(key) ? null : index);
    }
  }
  for (const item of placements) {
    if (!item || !library.has(item.imageId) || typeof item.sectionHeading !== 'string' || item.sectionHeading.length > 300 ||
      typeof item.caption !== 'string' || item.caption.length > 300 || typeof item.alt !== 'string' || item.alt.length > 200) {
      throw researchError('Invalid script image reference or caption. Please retry.');
    }
    const index = headings.get(headingKey(item.sectionHeading));
    if (index == null || validated.some(placement => placement.imageId === item.imageId)) continue;
    validated.push({ imageId: item.imageId, sectionHeading: item.sectionHeading.trim(), caption: item.caption.trim(), alt: item.alt.trim() });
    if (used.has(item.imageId)) continue;
    if (!afterHeading.has(index)) afterHeading.set(index, []);
    afterHeading.get(index).push(`[IMAGE:${item.imageId}]`);
    used.add(item.imageId);
  }
  response.script = lines.flatMap((line, index) => [line, ...(afterHeading.get(index) || [])]).join('\n');
  response.imagePlacements = validated;
}
