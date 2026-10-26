import { useId, useState } from 'react';
import { IoDocumentTextOutline, IoGlobeOutline, IoImageOutline, IoPulseOutline, IoSearchOutline } from 'react-icons/io5';
import ScriptWebSources from './ScriptWebSources';

export default function ScriptWorkspace({ channelContext, research, loading, children, onResearch, wordCount, estimatedMinutes }) {
  const [tab, setTab] = useState('draft');
  const id = useId();
  const sourceCount = new Set([...(research?.sources || []), ...(research?.searchResults || [])].map(source => source.url)).size;
  const tabs = [['draft', 'Draft', <IoDocumentTextOutline className="w-4 h-4" />], ['sources', sourceCount ? `Sources (${sourceCount})` : "Sources", <IoGlobeOutline className="w-4 h-4" />],
    ['images', research?.images?.length ? `Images (${research.images.length})` : "Images", <IoImageOutline className="w-4 h-4" />], ['activity', 'Activity', <IoPulseOutline className="w-4 h-4" />]];
  const search = mode => { setTab(mode); onResearch(mode); };
  return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
    <div className="border-b border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface px-3 pt-2">
      <div role="tablist" aria-label="Script workspace" className="script-workspace-tabs flex overflow-x-auto gap-1">
        {tabs.map(([value, label, icon]) => <button key={value} role="tab" type="button" id={`${id}-${value}`} aria-selected={tab === value}
          aria-controls={`${id}-panel`} onClick={() => setTab(value)} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = tabs.findIndex(item => item[0] === value);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            setTab(tabs[next][0]); document.getElementById(`${id}-${tabs[next][0]}`)?.focus();
          }} tabIndex={tab === value ? 0 : -1}
          className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === value ? 'border-primary-600 text-primary-700 dark:text-primary-300' : 'border-transparent text-text-muted hover:text-primary-600'}`}>
          {icon}{label}</button>)}
      </div>
      {channelContext && <p className="py-2 text-[11px] text-text-muted" role="status">
        {channelContext.status === 'available'
          ? `Using ${channelContext.channelTitle || 'your channel'} insights${channelContext.analyzedAt ? ` from ${new Date(channelContext.analyzedAt).toLocaleDateString()}` : ''}${channelContext.stale ? ' · Refresh channel analysis for newer insights' : ''}`
          : channelContext.status === 'missing'
            ? 'Analyze your connected channel in Insights to personalize scripts.'
            : 'Channel insights are temporarily unavailable. Try again shortly.'}
      </p>}
      {!!research?.warnings?.length && <button type="button" onClick={() => setTab('sources')}
        className="text-left text-[11px] text-amber-700 dark:text-amber-300 pb-2 w-full truncate" title={research.warnings.join(' ')}>
        Research needs attention · View sources
      </button>}
      {(loading || research?.status || wordCount > 0) && <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[11px] text-text-muted">
        <span role="status">{loading ? 'Working on your request…' : research?.status ? `Research: ${research.status.replaceAll('_', ' ')}` : ''}</span>
        {wordCount > 0 && <span>{wordCount.toLocaleString()} words · ~{estimatedMinutes} min</span>}
      </div>}

    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} className="flex-1 min-h-0 overflow-y-auto bg-surface-50/50 dark:bg-dark-surface-light/10">
      {tab === 'draft' ? children : <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {['sources', 'images'].includes(tab) && <div className="flex items-center justify-between gap-3 mb-5"><h3 className="text-base font-semibold">{tab === 'sources' ? 'References' : 'Image library'}</h3><button type="button" disabled={loading} onClick={() => search(tab)} className="app-button-secondary"><IoSearchOutline />{tab === 'sources' ? 'Find sources' : 'Find images'}</button></div>}
        {tab === 'activity' ? <div className="space-y-4"><h3 className="font-semibold">Research activity</h3>
          {loading && <p role="status" className="text-xs animate-pulse text-primary-700 dark:text-primary-300">Searching and preparing your response…</p>}
          {!(research?.activity?.length) && <p className="text-sm text-text-muted">Your research activity will appear here after a search.</p>}
          <ol className="space-y-3">{research?.activity?.map((entry, index) => <li key={index} className="border-l-2 border-primary-200 dark:border-primary-800 pl-4 py-1 text-xs">
            <p className="font-semibold">{entry.event.replaceAll('.', ' · ').replaceAll('_', ' ')}</p>
            <p className="mt-1 text-text-muted break-words">{[entry.provider, entry.query, entry.url, entry.status, entry.results !== undefined ? `${entry.results} results` : null,
              entry.error, entry.characters ? `${entry.characters} characters` : null].filter(Boolean).join(' · ')}</p>
          </li>)}</ol>
          {!!research?.queries?.length && <div><h4 className="font-semibold text-xs mb-2">Search queries</h4>{research.queries.map((query, index) => <p key={index} className="text-xs text-text-muted py-1">{query}</p>)}</div>}
        </div> : <ScriptWebSources research={research} loading={loading} view={tab} />}
      </div>}
    </div>
  </div>;
}
