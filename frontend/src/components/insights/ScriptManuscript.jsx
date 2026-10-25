import DOMPurify from 'dompurify';
import { IoOpenOutline } from 'react-icons/io5';
import { referencedImages } from '../../utils/scriptVisuals';
import ResearchImage from './ResearchImage';

const safeLink = value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
};
const inline = text => DOMPurify.sanitize(text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`(.*?)`/g, '<code>$1</code>'),
{ ALLOWED_TAGS: ['strong', 'em', 'code'], ALLOWED_ATTR: [] });

function ScriptFigure({ image, placement, number }) {
  const source = safeLink(image.url);
  const caption = placement?.caption || image.caption || image.title || 'Visual reference';
  return <figure aria-label={`Script visual: ${caption}`} className="my-7 overflow-hidden rounded-2xl border border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-sm">
    <div className="relative bg-gradient-to-br from-surface-100 to-primary-50 dark:from-dark-border dark:to-dark-surface">
      <div className="absolute top-3 left-3 z-10 rounded-full bg-white/95 dark:bg-dark-surface/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-800 dark:text-primary-300 shadow-sm">Visual {String(number).padStart(2, '0')}</div>
      <ResearchImage key={`${image.id}:${image.imageUrl}:${image.thumbnailUrl}`} image={image} alt={placement?.alt || image.alt || image.title}
        className="w-full max-h-[520px] min-h-40 object-contain py-3" />
    </div>
    <figcaption className="p-4 sm:p-5 space-y-2">
      <p className="font-semibold text-sm text-text-primary dark:text-dark-text leading-relaxed">{caption}</p>
      <div className="flex justify-between flex-wrap gap-2 text-[11px] text-text-muted">
        <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-700 dark:text-primary-300 underline">Original source <IoOpenOutline /></a>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed">{image.attribution && `${image.attribution} · `}Licensing: {image.license || 'Not verified'}. Review the original page before use.</p>
    </figcaption>
  </figure>;
}

export default function ScriptManuscript({ text = '', research }) {
  const used = new Set();
  const placements = new Map((research?.imagePlacements || []).map(item => [item.imageId, item]));
  let references = false;
  return text.split('\n').map((raw, index) => {
    if (/^##\s+Research references\s*$/i.test(raw)) references = true;
    const images = !references && (/\[IMAGE:I[a-f0-9]{12}\]/.test(raw) || /\[VISUAL:/i.test(raw)) ? referencedImages(raw, research?.images).filter(image => !used.has(image.id)) : [];
    const figures = images.map(image => { used.add(image.id); return <ScriptFigure key={image.id} image={image} placement={placements.get(image.id)} number={used.size} />; });
    const line = raw.replace(/\[IMAGE:I[a-f0-9]{12}\]/g, '').trim();
    let content;
    if (line.startsWith('# ')) content = <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight mt-2 mb-6 pb-5 border-b border-surface-200 dark:border-dark-border">{line.slice(2)}</h1>;
    else if (line.startsWith('## ')) content = <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-primary-800 dark:text-primary-300 border-b border-surface-200 dark:border-dark-border pb-3">{line.slice(3)}</h2>;
    else if (line.startsWith('### ')) content = <h3 className="mt-5 mb-2 font-semibold text-base">{line.slice(4)}</h3>;
    else if (line.startsWith('---')) content = <hr className="my-6 border-surface-200 dark:border-dark-border" />;
    else if (line.includes('[VISUAL:')) content = <aside aria-label="Director's visual cue" className="my-4 rounded-lg border-l-2 border-primary-400 bg-primary-50/60 dark:bg-primary-950/20 px-4 py-3 text-xs leading-relaxed text-primary-900 dark:text-primary-300" dangerouslySetInnerHTML={{ __html: inline(line) }} />;
    else if (line.startsWith('- ')) content = <p className="my-2 pl-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: '• ' + inline(line.slice(2)) }} />;
    else if (line) content = <p className="my-2 text-sm sm:text-[0.95rem] leading-[1.85] text-text-secondary dark:text-dark-text" dangerouslySetInnerHTML={{ __html: inline(line) }} />;
    return <div key={index}>{content}{figures}</div>;
  });
}
