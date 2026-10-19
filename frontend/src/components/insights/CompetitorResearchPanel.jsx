import { useEffect, useRef, useState } from "react";
import ideaResearchService from "../../services/ideaResearchService";

const pending = job => ["queued", "running"].includes(job?.status);
const date = value => value ? new Date(value).toLocaleString() : "Not yet checked";
const link = value => {
  try { return ["http:", "https:"].includes(new URL(value).protocol) ? value : undefined; }
  catch { return undefined; }
};

function EvidenceClaim({ claim, sources }) {
  if (!claim) return null;
  return <span>{claim.text}{" "}
    {(claim.sourceIds || []).map(id => {
      const source = sources.get(id);
      return source ? <a key={id} href={link(source.url)} target="_blank" rel="noopener noreferrer"
        className="text-primary-700 dark:text-primary-300 underline text-xs ml-1" title={source.title}>
        [{source.number}]
      </a> : null;
    })}
    {claim.quote && <q className="block italic mt-1 text-text-muted">{claim.quote}</q>}
  </span>;
}

export default function CompetitorResearchPanel({ researchId, title, onClose, onUpdated }) {
  const [state, setState] = useState({ id: null, job: null, error: null });
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function keydown(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = panelRef.current?.querySelectorAll("button:not(:disabled), a[href], summary");
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus?.();
    };
  }, [onClose]);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        const job = await ideaResearchService.get(researchId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ id: researchId, job, error: null });
        if (pending(job)) timer = setTimeout(load, 4000);
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({
          id: researchId, job: previous.id === researchId ? previous.job : null,
          error: error.response?.data?.error || "This research report is unavailable.",
        }));
      }
    }
    timer = setTimeout(load, 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [researchId, version]);
  const job = state.id === researchId ? state.job : null;
  const report = job?.report;
  const evidence = job?.evidence;
  const sources = new Map((evidence?.sources || []).map((source, index) => [source.id, { ...source, number: index + 1 }]));
  const summaries = new Map((report?.competitors || []).map(video => [video.videoId, video]));
  async function refresh() {
    setRefreshing(true);
    try {
      const updated = await ideaResearchService.refresh(researchId);
      setState({ id: researchId, job: updated, error: null });
      onUpdated(updated);
      setVersion(value => value + 1);
    } catch (error) {
      setState(previous => ({ ...previous, error: error.response?.data?.error || "Refresh could not be started." }));
    } finally { setRefreshing(false); }
  }
  return <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-8 flex items-center justify-center"
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="research-title"
      className="w-full max-w-5xl max-h-full overflow-y-auto bg-white dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border shadow-2xl text-text-primary dark:text-dark-text">
      <header className="sticky top-0 z-10 bg-white dark:bg-dark-surface border-b border-surface-200 dark:border-dark-border p-5 flex items-start justify-between gap-4">
        <div><p className="text-xs uppercase tracking-wider text-text-muted">Competitor research</p>
          <h2 id="research-title" className="font-bold text-xl mt-1">{title}</h2>
          <p className="text-xs text-text-muted mt-2">Last checked: {date(job?.completedAt)}</p>
        </div>
        <button ref={closeRef} onClick={onClose} aria-label="Close research" className="rounded-lg border px-3 py-2">Close</button>
      </header>
      <div className="p-5 space-y-7">
        {(state.id === researchId && state.error) && <p role="alert" className="text-error-600">{state.error}</p>}
        {!job && !state.error && <p role="status">Loading research…</p>}
        {job && <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
          <p role="status">{pending(job) ? "Researching: " + job.stage + "…" :
            job.status === "partial" ? "Partial research — see coverage and limitations." :
            job.status === "failed" ? (job.error || "Research could not finish.") : "Research complete."}
            {job.stale && " This saved report is out of date."}
            {pending(job) && report && " Showing the previous report while it refreshes."}
            {job.status === "failed" && report && " Showing the last successful report."}
          </p>
          <button onClick={refresh} disabled={pending(job) || refreshing}
            className="border rounded-lg px-3 py-2 disabled:opacity-50">
            {refreshing ? "Queuing…" : "Refresh research"}
          </button>
        </div>}
        {report && <>
          <div><h3 className="font-bold mb-2">What we found</h3>
            <p className="text-sm leading-relaxed"><EvidenceClaim claim={report.summary} sources={sources} /></p>
            <p className="text-xs text-text-muted mt-3">
              {report.coverage.videoCount} videos · {report.coverage.channelCount} channels ·{" "}
              {report.coverage.completeTranscripts} complete captions · {report.coverage.commentCount} sampled comments ·{" "}
              {report.coverage.pageCount} web pages
            </p>
          </div>
          {!!report.communitySignals?.length && <div><h3 className="font-bold mb-2">Questions from community discussions</h3>
            <ul className="list-disc pl-5 text-sm space-y-2">{report.communitySignals.map((item, index) =>
              <li key={index}><EvidenceClaim claim={item} sources={sources} /></li>)}</ul>
            <p className="text-xs text-text-muted mt-2">Observations from collected discussion text. These do not represent the whole audience.</p>
          </div>}
          <div><h3 className="font-bold mb-3">Competing videos</h3>
            <div className="grid sm:grid-cols-2 gap-4">{(evidence?.competitors || []).map(video => {
              const summary = summaries.get(video.videoId);
              return <article key={video.videoId} className="border border-surface-200 dark:border-dark-border rounded-xl p-4 space-y-3 text-sm">
                <a href={link(video.url)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{video.title}</a>
                <p className="text-xs text-text-muted">{video.channelTitle} · Published {date(video.publishedAt)}</p>
                <p className="text-xs">Views: {video.metrics.views?.toLocaleString() ?? "unavailable"} · Likes: {video.metrics.likes?.toLocaleString() ?? "unavailable"}</p>
                <p className="text-xs text-text-muted">Observed {date(video.observedAt)} · Average views/day since publication: {video.averageViewsPerDay?.toLocaleString() ?? "unavailable"}</p>
                <p><EvidenceClaim claim={summary?.approach} sources={sources} /></p>
                <div><h4 className="font-semibold">Observed topics</h4>
                  <ul className="list-disc pl-5 mt-1 space-y-1">{summary?.coveredTopics.map((item, index) =>
                    <li key={index}><EvidenceClaim claim={item} sources={sources} /></li>)}</ul></div>
                {!!summary?.audienceNeeds.length && <div><h4 className="font-semibold">Questions in sampled comments</h4>
                  <ul className="list-disc pl-5 mt-1 space-y-2">{summary.audienceNeeds.map((item, index) =>
                    <li key={index}><EvidenceClaim claim={item} sources={sources} /></li>)}</ul></div>}
                <p className="text-xs text-text-muted">{video.commentSampleSize} comments sampled · Captions:{" "}
                  {video.transcriptComplete ? "complete" : video.transcriptAvailable ? "partial" : "unavailable"}</p>
              </article>;
            })}</div>
          </div>
          {!!report.coverageMatrix.length && <div className="overflow-x-auto"><h3 className="font-bold mb-2">Coverage in the examined material</h3>
            <table className="text-sm w-full"><thead><tr className="border-b text-left"><th className="p-2">Topic</th><th className="p-2">Observed in</th></tr></thead>
              <tbody>{report.coverageMatrix.map((row, index) => <tr key={index} className="border-b border-surface-200 dark:border-dark-border">
                <td className="p-2">{row.topic}</td><td className="p-2">
                  {row.coveredBy.map(id => evidence.competitors.find(video => video.videoId === id)?.channelTitle).join(", ") || "Not established"}{" "}
                  <EvidenceClaim claim={{ text: "", sourceIds: row.sourceIds }} sources={sources} />
                </td></tr>)}</tbody></table>
          </div>}
          <div><h3 className="font-bold mb-3">Potential gaps</h3>
            {!report.gaps.length && <p className="text-sm text-text-muted">The collected evidence does not establish a supported gap. Suggestions below are creative directions.</p>}
            {report.gaps.map((gap, index) => <article key={index} className="rounded-xl border border-primary-200 dark:border-primary-800 p-4 mb-3 space-y-2 text-sm">
              <h4 className="font-semibold">{gap.title}</h4>
              <p><EvidenceClaim claim={gap.finding} sources={sources} /></p>
              <p><EvidenceClaim claim={gap.comparison} sources={sources} /></p>
              <p className="text-xs text-text-muted">Evidence strength: {gap.evidenceStrength}. An opportunity hypothesis, not a performance guarantee.</p>
              <p>Suggested approach: {gap.suggestedApproach}</p>
            </article>)}
          </div>
          <div className="bg-surface-50 dark:bg-dark-surface-light rounded-xl p-4 space-y-3 text-sm">
            <h3 className="font-bold">Suggested direction for your script</h3>
            <p>{report.refinedIdea.angle}</p><p className="italic">{report.refinedIdea.hook}</p>
            <ul className="list-disc pl-5">{report.refinedIdea.titleOptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <ol className="list-decimal pl-5">{report.refinedIdea.outline.map((item, index) => <li key={index}>{item}</li>)}</ol>
            <p className="text-xs text-text-muted">Script Studio uses this saved research when writing or updating the linked idea.</p>
          </div>
          <div><h3 className="font-bold mb-2">Limitations</h3>
            <ul className="list-disc pl-5 text-sm text-text-muted space-y-1">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
            <p className="text-xs text-text-muted mt-2">Public metrics do not reveal competitor CTR, watch time or retention. Comment samples do not represent every viewer.</p>
          </div>
          <details className="text-sm"><summary className="cursor-pointer font-semibold">Sources and excerpts ({sources.size})</summary>
            <ol className="mt-3 space-y-3">{[...sources.values()].map(source => <li key={source.id}>
              <a href={link(source.url)} target="_blank" rel="noopener noreferrer" className="underline">[{source.number}] {source.title}</a>
              <p className="text-xs text-text-muted">{source.kind} · Collected {date(source.collectedAt)}{!source.complete && " · Partial extraction"}</p>
              {source.publishedAt && <p className="text-xs text-text-muted">Page publication date: {source.publishedAt}</p>}
              <p className="mt-1 text-xs whitespace-pre-wrap">{source.text}</p>
            </li>)}</ol>
          </details>
        </>}
      </div>
    </section>
  </div>;
}
