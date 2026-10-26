import { useState } from 'react';
import { IoOpenOutline, IoRefresh, IoPeopleOutline } from 'react-icons/io5';
import api from '../../services/api';

const count = value => value == null ? 'Unavailable' : Number(value).toLocaleString();
const safe = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } };

export default function ChannelCompetitorsPanel({ intelligenceId, landscape, isDemo, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const channels = landscape?.channels || [];
  const stale = landscape?.stale || (landscape?.expiresAt && new Date(landscape.expiresAt) < new Date());
  async function refresh() {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/youtube/channel-competitors/refresh', { intelligenceId }, { timeout: 65000 });
      onUpdated(data);
    } catch (error) { setError(error.response?.data?.error || 'Competitor discovery could not finish. Try again.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Niche competitor channels" className="rounded-2xl border border-surface-200 dark:border-dark-border bg-white dark:bg-dark-surface p-5 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-lg font-semibold text-text-primary dark:text-dark-text flex items-center gap-2"><IoPeopleOutline />Similar channels</h2>
        <p className="text-sm text-text-muted mt-2 max-w-2xl">See what similar creators are publishing.</p>
      </div>
      <button onClick={refresh} disabled={busy || isDemo || !intelligenceId} className="inline-flex items-center gap-2 rounded-xl border border-surface-200 dark:border-dark-border px-4 py-2 text-sm font-medium disabled:opacity-50 text-text-primary dark:text-dark-text">
        <IoRefresh className={busy ? 'animate-spin' : ''} />{busy ? 'Discovering channels…' : channels.length ? 'Refresh competitors' : 'Find competitors'}
      </button>
    </div>
    {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
    {busy && <p role="status" className="text-sm text-primary-700 dark:text-primary-300">Checking niche matches, recent uploads and top comments…</p>}
    {!channels.length && !busy && <p className="rounded-xl bg-surface-50 dark:bg-dark-surface-light p-4 text-sm text-text-muted">{isDemo ? 'Connect your channel to discover its niche competitors.' : 'Find similar channels to inform your next ideas.'}</p>}
    {!!channels.length && <>
      <p className="text-xs text-text-muted">{channels.length} {channels.length === 1 ? 'channel' : 'channels'} · Checked {new Date(landscape.analyzedAt).toLocaleString()}{stale ? ' · Saved sample is out of date' : ''}. Refresh insights to use an updated sample.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{channels.map(channel => <article key={channel.channelId} className="rounded-2xl border border-surface-200 dark:border-dark-border p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3"><a href={safe(channel.url)} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-text-primary dark:text-dark-text hover:underline inline-flex gap-2 items-center">{channel.title}<IoOpenOutline className="shrink-0 w-4 h-4" /></a>
          <span className="text-[10px] rounded-full px-2 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 shrink-0">{channel.scale}</span></div>
        <p className="text-xs text-text-muted leading-relaxed">{channel.selectionReason}</p>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-50 dark:bg-dark-surface-light p-3 text-xs text-text-muted">
          <div><strong className="block text-sm text-text-primary dark:text-dark-text">{count(channel.subscriberCount)}</strong>Subscribers</div>
          <div><strong className="block text-sm text-text-primary dark:text-dark-text">{count(channel.sample.medianViews)}</strong>Median views</div>
          <div><strong className="block text-sm text-text-primary dark:text-dark-text">{channel.sample.videoCount}</strong>Recent uploads</div>
        </div>
        {channel.sample.averageUploadSpacingDays != null && <p className="text-xs text-text-muted">Average spacing in this upload sample: {channel.sample.averageUploadSpacingDays} days.</p>}
        <details><summary className="cursor-pointer text-sm font-semibold text-primary-700 dark:text-primary-300">Videos & viewer questions</summary>
          <ul className="mt-3 space-y-4">{channel.videos.map(video => <li key={video.id} className="border-t border-surface-100 dark:border-dark-border pt-3">
            <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-text-primary dark:text-dark-text">{video.snippet.title}</a>
            <p className="text-xs text-text-muted mt-1">{count(video.statistics.viewCount)} views · {new Date(video.snippet.publishedAt).toLocaleDateString()}</p>
            {(video.comments || []).slice(0, 2).map(comment => <a key={comment.id} href={`https://www.youtube.com/watch?v=${video.id}&lc=${encodeURIComponent(comment.id)}`} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-text-secondary dark:text-dark-text-muted border-l-2 border-primary-200 pl-3 italic hover:underline">“{comment.text}”</a>)}
          </li>)}</ul>
        </details>
      </article>)}</div>
      <p className="text-xs text-text-muted">Based on titles, descriptions, public metrics and sampled top comments. Niche and audience matches are inferred; full video coverage and private analytics are not measured.</p>
    </>}
    {!!landscape?.limitations?.length && <details className="text-xs text-text-muted"><summary className="cursor-pointer">Sample limitations</summary><ul className="list-disc pl-5 mt-2 space-y-1">{landscape.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
  </section>;
}
