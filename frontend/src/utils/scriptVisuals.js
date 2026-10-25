export function referencedImages(text, images = []) {
  const known = new Map(images.map(image => [image.id, image]));
  return [...new Set([...text.matchAll(/\[(?:IMAGE:)?(I[a-f0-9]{12})\]/g)].map(match => match[1]))]
    .map(id => known.get(id)).filter(Boolean);
}

const publicLink = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
};
const escaped = value => String(value || '').replace(/[\r\n]/g, ' ').replace(/[[\]\\]/g, '\\$&');

export function exportScriptMarkdown(text, research) {
  const images = new Map((research?.images || []).map(image => [image.id, image]));
  const placements = new Map((research?.imagePlacements || []).map(item => [item.imageId, item]));
  const used = new Set();
  let references = false;
  return text.split('\n').flatMap(line => {
    if (/^##\s+Research references\s*$/i.test(line)) references = true;
    const matches = !references && (/\[IMAGE:I[a-f0-9]{12}\]/.test(line) || /\[VISUAL:/i.test(line)) ? referencedImages(line, [...images.values()]) : [];
    const output = [line.replace(/\[IMAGE:I[a-f0-9]{12}\]/g, '')];
    for (const image of matches) {
      const url = publicLink(image.imageUrl), source = publicLink(image.url);
      if (used.has(image.id) || !url || !source) continue;
      used.add(image.id);
      const placement = placements.get(image.id);
      output.push('', `![${escaped(placement?.alt || image.alt || image.title)}](${url.replace(/\(/g, '%28').replace(/\)/g, '%29')})`,
        '', `*${escaped(placement?.caption || image.caption || image.title)}* — [Original image source](${source.replace(/\(/g, '%28').replace(/\)/g, '%29')}). Licensing: ${escaped(image.license || 'Not verified')}.`, '');
    }
    return output;
  }).join('\n');
}
