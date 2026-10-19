import { useState } from 'react';
import { IoOpenOutline, IoImageOutline, IoWarningOutline, IoSearchOutline } from 'react-icons/io5';

const safeLink = value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
};
const domain = value => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return 'Source'; } };

function ImageCandidate({ image }) {
  const [failed, setFailed] = useState(false);
  return <article className="overflow-hidden rounded-xl border border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface">
    <a href={safeLink(image.url)} target="_blank" rel="noopener noreferrer" className="block bg-surface-100 dark:bg-dark-border">
      {!failed && safeLink(image.thumbnailUrl) ? <img src={safeLink(image.thumbnailUrl)} alt={image.title || 'Candidate visual reference'}
        loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-40 w-full object-contain" /> :
        <span className="h-40 flex flex-col items-center justify-center text-text-muted gap-2 text-xs"><IoImageOutline className="w-8 h-8" />Preview unavailable · open original</span>}
    </a>
    <div className="p-3 space-y-2">
      <a href={safeLink(image.url)} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline line-clamp-2">{image.title || 'Original source page'}</a>
      <p className="text-xs text-text-muted">{domain(image.url)}</p>
      <a href={safeLink(image.imageUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-700 dark:text-primary-300 underline">Open full image <IoOpenOutline /></a>
      <p className="text-xs text-text-muted">Licensing reported by search: {image.license || 'Not verified'}{image.attribution && ` · ${image.attribution}`}</p>
    </div>
  </article>;
}

export default function ScriptWebSources({ research, loading, view = 'all' }) {
  const sources = research?.sources || [], images = research?.images || [];
  const discovered = (research?.searchResults || []).filter(item => !sources.some(source => source.url === item.url));
  return <section aria-label="Script web references" className="space-y-5 text-text-primary dark:text-dark-text">
    {loading && <p role="status" className="text-sm text-primary-700 dark:text-primary-300 animate-pulse">Searching and preparing your response…</p>}
    {!!research?.warnings?.length && <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs space-y-2">
      <p className="font-semibold flex items-center gap-2"><IoWarningOutline />Research limitations</p>
      {research.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
    </div>}
    {view !== 'images' && <>
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Source library</h3>
        <span className="text-xs text-text-muted">{sources.length} collected · {discovered.length} discovered</span></div>
      {!sources.length && !discovered.length && <div className="text-center border border-dashed border-surface-300 dark:border-dark-border rounded-xl p-8 text-text-muted">
        <IoSearchOutline className="w-7 h-7 mx-auto mb-3" /><p className="text-sm font-medium">Build a reference library</p>
        <p className="text-xs mt-2">Use Find sources to search for references. Links appear here even when the full page cannot be collected.</p>
      </div>}
      {sources.map((source, index) => <article key={source.id} className="rounded-xl border border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 space-y-2">
        <div className="flex items-start justify-between gap-3"><a href={safeLink(source.url)} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:underline">[{source.id}] {source.title}</a>
          <span className="shrink-0 rounded-md bg-primary-50 dark:bg-primary-950/40 px-2 py-1 text-[10px] text-primary-700 dark:text-primary-300">{source.cited ? 'Referenced' : `Source ${index + 1}`}</span></div>
        <p className="text-xs text-text-muted">{domain(source.url)} · {source.complete ? 'Collected page text' : 'Partial page excerpt'}</p>
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{source.excerpt}</p>
        <p className="text-[11px] text-text-muted">Collected {new Date(source.collectedAt).toLocaleString()}{source.publishedAt && ` · Published ${source.publishedAt}`}</p>
      </article>)}
      {!!discovered.length && <div className="space-y-3"><h4 className="text-xs uppercase tracking-wider font-semibold text-text-muted">Discovered links · full text not collected</h4>
        {discovered.map(item => <article key={item.url} className="border border-surface-200 dark:border-dark-border rounded-xl p-4 space-y-2">
          <a href={safeLink(item.url)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">{item.title || domain(item.url)}</a>
          <p className="text-xs text-text-muted">{domain(item.url)} · {item.provider}</p>
          <p className="text-xs leading-relaxed">{item.snippet}</p><p className="text-[10px] text-text-muted">Search snippet only. Open the page to check the claim.</p>
        </article>)}
      </div>}
    </>}
    {view !== 'sources' && <>
      <h3 className="font-semibold">Candidate images</h3>
      <p className="text-xs text-text-muted">Check the original page for accuracy, licensing and attribution before use.</p>
      {!images.length ? <div className="rounded-xl border border-dashed border-surface-300 dark:border-dark-border p-8 text-center text-text-muted"><IoImageOutline className="w-8 h-8 mx-auto mb-3" />
        <p className="text-sm font-medium">Find visual references for your video</p><p className="text-xs mt-2">Choose Find images to search SearXNG. Results will appear here.</p></div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{images.map(image => <ImageCandidate key={image.id} image={image} />)}</div>}
    </>}
  </section>;
}
