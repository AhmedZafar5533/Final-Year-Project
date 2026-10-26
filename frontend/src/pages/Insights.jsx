import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoRefresh, IoArrowForward, IoChevronDown, IoCheckmarkCircleOutline, IoTimeOutline } from "react-icons/io5";
import PageHeader from "../components/common/PageHeader";
import ViewTabs from "../components/common/ViewTabs";
import Disclosure from "../components/common/Disclosure";
import { DashboardSkeleton } from "../components/common/Loader";
import RecommendationCard from "../components/insights/RecommendationCard";
import ChannelCompetitorsPanel from "../components/insights/ChannelCompetitorsPanel";
import CompetitorResearchPanel from "../components/insights/CompetitorResearchPanel";
import trendsService from "../services/trendsService";
import useRecommendations from "../hooks/useRecommendations";
import useIdeaResearch from "../hooks/useIdeaResearch";

const EMPTY = [];
const TYPES = {
  overlap: { label: "Trend + viewer interest", dot: "bg-primary-500" },
  demand: { label: "Viewer request", dot: "bg-sky-500" },
  trend: { label: "Trending topic", dot: "bg-amber-500" },
};

function researchStatus(job) {
  if (!job) return null;
  const labels = { queued: "Research queued", running: "Research in progress", completed: "Research ready", partial: "Partial research", failed: "Research needs attention" };
  return `${labels[job.status] || "Research available"}${job.stale ? " · Out of date" : ""}`;
}

function IdeaCard({ idea, onLaunch, research, researchBusy, researchEnabled, onResearch, onViewResearch }) {
  const [expanded, setExpanded] = useState(false);
  const type = TYPES[idea.recommendation_type];
  const reason = idea.why_it_will_perform || idea.overlap_rationale || idea.audience_demand_source || idea.angle || idea.hook;
  const status = researchStatus(research);
  const fields = [
    ["Suggested hook", idea.hook], ["Angle", idea.angle], ["Format", idea.suggested_format],
    ["Why this idea", idea.why_it_will_perform], ["Viewer interest", idea.audience_demand_source],
    ["Trend evidence", idea.trend_source], ["Connection", idea.overlap_rationale],
  ].filter(([, value]) => value);
  return <article className="idea-card">
    <div className="idea-meta">
      {type && <span className="idea-category"><span className={`h-1.5 w-1.5 rounded-full ${type.dot}`} />{type.label}</span>}
      {idea.suggested_format && <span>{idea.suggested_format}</span>}
    </div>
    <div className="space-y-2">
      <h3>{idea.title}</h3>
      {reason && <p className="idea-reason">{reason}</p>}
    </div>
    {status && <div className="idea-research-status" data-attention={research.stale || ["failed", "partial"].includes(research.status)} role="status">
      {["running", "queued"].includes(research.status) ? <IoTimeOutline className="shrink-0" /> : <IoCheckmarkCircleOutline className="shrink-0" />}
      <button type="button" onClick={() => onViewResearch(idea, research)} className="text-left hover:underline">{status}</button>
    </div>}
    <div className="idea-card-footer">
      <button type="button" onClick={() => onLaunch(idea)} className="app-button" aria-label={`Draft script for ${idea.title}`}>
        Draft script <IoArrowForward aria-hidden="true" />
      </button>
      <button type="button" className="app-button-quiet" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        {expanded ? "Less detail" : "View idea"}<IoChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </div>
    {expanded && <div className="idea-details">
      <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        {idea.estimated_potential && <div><dt>Estimated potential</dt><dd>{idea.estimated_potential} · AI estimate</dd></div>}
      </dl>
      <button type="button" disabled={!researchEnabled || researchBusy} className="app-button-secondary"
        onClick={() => research ? onViewResearch(idea, research) : onResearch(idea)}>
        {researchBusy ? "Queuing…" : research ? "View research" : "Research competitors"}
      </button>
      {!researchEnabled && <p className="mt-2 text-xs text-text-muted">Refresh insights to enable research for this idea.</p>}
    </div>}
  </article>;
}

function Strategy({ niche, summary, recommendations, recommendationsError }) {
  const friction = summary?.growth_friction_points || summary?.friction_points || EMPTY;
  const roadmap = summary?.strategic_growth_roadmap || summary?.growth_roadmap || EMPTY;
  const tips = summary?.content_quality_suggestions || EMPTY;
  return <div className="space-y-5">
    <section className="app-panel space-y-4">
      <div><h2 className="section-heading">Channel summary</h2>{niche?.primary_niche && <p className="section-note mt-1">{niche.primary_niche}</p>}</div>
      <p className="text-sm leading-7 text-text-secondary">{summary?.executive_overview || "Refresh insights to build your channel strategy."}</p>
      {niche && <dl className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-surface-200 dark:border-dark-border text-sm">
        {[["Audience", niche.target_audience], ["Tone", niche.content_tone]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted mb-1">{label}</dt><dd>{value}</dd></div>)}
        {niche.niche_positioning_statement && <div className="sm:col-span-2"><dt className="text-xs text-text-muted mb-1">Positioning</dt><dd className="leading-relaxed">{niche.niche_positioning_statement}</dd></div>}
        {!!niche.content_pillars?.length && <div className="sm:col-span-2"><dt className="text-xs text-text-muted mb-2">Topics</dt><dd className="flex flex-wrap gap-2">{niche.content_pillars.map((pillar, index) => <span key={index} className="idea-category">{pillar}</span>)}</dd></div>}
      </dl>}
    </section>
    {!!summary?.high_performing_patterns?.length && <Disclosure title="What's working" description="Patterns in your strongest videos">
      <ul className="space-y-3 text-sm leading-relaxed text-text-secondary">{summary.high_performing_patterns.map((pattern, index) => <li key={index} className="flex gap-3"><IoCheckmarkCircleOutline className="mt-1 shrink-0 text-primary-500" />{pattern}</li>)}</ul>
    </Disclosure>}
    {!!friction.length && <Disclosure title="What to improve" description={`${friction.length} areas to focus on`}>
      <ul className="list-disc pl-5 space-y-3 text-sm leading-relaxed text-text-secondary">{friction.map((item, index) => <li key={index}>{typeof item === "string" ? item : item.point || item.description}</li>)}</ul>
    </Disclosure>}
    {!!roadmap.length && <Disclosure title="Next steps" description="Your channel growth plan" defaultOpen>
      <ol className="space-y-5">{roadmap.map((step, index) => <li key={index} className="flex gap-4">
        <span className="h-7 w-7 shrink-0 rounded-full bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-200 text-xs font-semibold flex items-center justify-center">{index + 1}</span>
        <div className="text-sm leading-relaxed"><h3 className="font-semibold">{typeof step === "string" ? `Step ${index + 1}` : step.phase || step.title || `Step ${index + 1}`}</h3>
          <p className="text-text-muted mt-1">{typeof step === "string" ? step : step.objective || step.actions?.join(" · ") || step.description}</p></div>
      </li>)}</ol>
    </Disclosure>}
    {!!tips.length && <Disclosure title="Content improvements" description="Hooks, pacing, thumbnails, and engagement">
      <div className="divide-y divide-surface-200 dark:divide-dark-border">{tips.map((tip, index) => <div key={index} className="py-4 first:pt-0 last:pb-0 space-y-2">
        <h3 className="font-semibold text-sm">{tip.category}</h3><p className="text-sm leading-relaxed text-text-secondary">{tip.suggestion}</p>
        {tip.metric_target && <p className="text-xs text-text-muted">Target: {tip.metric_target}</p>}
        {!!tip.action_items?.length && <ul className="list-disc pl-5 text-sm text-text-muted space-y-1">{tip.action_items.map((action, i) => <li key={i}>{action}</li>)}</ul>}
      </div>)}</div>
    </Disclosure>}
    <RecommendationCard recommendations={recommendations?.contentTips} suggestedTags={recommendations?.suggestedTags} isPlaceholder={Boolean(recommendationsError)} />
  </div>;
}

export default function Insights() {
  const navigate = useNavigate();
  const [channelIntel, setChannelIntel] = useState(() => trendsService.getCachedIntelligence());
  const [loading, setLoading] = useState(() => !trendsService.getCachedIntelligence());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("ideas");
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState(null);
  const { recommendations, error: recommendationsError } = useRecommendations();
  const { jobs, start, record, busyKey, error: researchError } = useIdeaResearch(channelIntel?._id, channelIntel?.researchRevision);
  const fetchIntelligence = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError("");
    try {
      const data = await trendsService.getChannelIntelligence(refresh);
      if (data) setChannelIntel(data);
    } catch (err) { setError(err.response?.data?.error || "Couldn't refresh insights. Try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchIntelligence(); }, [fetchIntelligence]);
  const summary = channelIntel?.masterSummary;
  const overlap = summary?.overlap_recommendations || EMPTY;
  const demand = summary?.demand_recommendations || EMPTY;
  const trend = summary?.trend_recommendations || EMPTY;
  const ideas = useMemo(() => {
    const categorized = [...overlap.map(item => ({ ...item, recommendation_type: "overlap" })), ...demand.map(item => ({ ...item, recommendation_type: "demand" })), ...trend.map(item => ({ ...item, recommendation_type: "trend" }))];
    return categorized.length ? categorized : summary?.next_video_recommendations || EMPTY;
  }, [overlap, demand, trend, summary]);
  const filtered = filter === "all" ? ideas : ideas.filter(idea => idea.recommendation_type === filter);
  const visible = showAll ? filtered : filtered.slice(0, 3);
  const closeResearch = useCallback(() => setSelectedResearch(null), []);
  const viewResearch = useCallback((idea, job) => setSelectedResearch({ id: job._id, title: idea.title }), []);
  const researchIdea = useCallback(async idea => { const job = await start(idea.ideaKey); if (job) viewResearch(idea, job); }, [start, viewResearch]);
  const launch = idea => navigate("/studio", { state: { idea: { ...idea, researchRef: channelIntel?._id && idea.ideaKey ? { intelligenceId: channelIntel._id, ideaKey: idea.ideaKey } : undefined } } });
  if (loading) return <DashboardSkeleton />;
  return <div className="page-stack">
    <PageHeader title="Insights" description="Find your next video idea and turn it into a script." eyebrow={channelIntel?.channelTitle}
      actions={<button type="button" onClick={() => fetchIntelligence(true)} disabled={refreshing} className="app-button-secondary compact-action" aria-label="Refresh insights"><IoRefresh className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh insights"}</span></button>} />
    {(error || researchError) && <p role="alert" className="rounded-xl border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-950/20 p-4 text-sm text-error-700 dark:text-error-300">{error || researchError}</p>}
    {channelIntel?.isDemo && <p className="section-note rounded-lg bg-surface-200/60 px-4 py-2.5">Sample insights. Connect your YouTube channel in Settings for your own recommendations.</p>}
    <ViewTabs label="Insights views" value={view} onChange={setView} panelId="insights-panel" tabs={[
      { value: "ideas", label: "Video ideas", count: ideas.length }, { value: "strategy", label: "Channel strategy" }, { value: "competitors", label: "Competitors" },
    ]} />
    <div role="tabpanel" id="insights-panel" aria-labelledby={`insights-panel-tab-${view}`}>
      {view === "ideas" && <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-heading">Your next videos</h2></div>
          <label className="sm:hidden"><span className="sr-only">Filter video ideas</span><select value={filter} onChange={event => { setFilter(event.target.value); setShowAll(false); }} className="bg-white dark:bg-dark-surface rounded-lg border border-surface-300 dark:border-dark-border px-3 py-2 text-xs"><option value="all">All ideas</option><option value="overlap">Trend + interest</option><option value="demand">Viewer requests</option><option value="trend">Trending</option></select></label><div className="app-filters hidden sm:flex" role="group" aria-label="Filter video ideas">{[["all", "All ideas"], ["overlap", "Trend + interest"], ["demand", "Viewer requests"], ["trend", "Trending"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setShowAll(false); }}>{label}</button>)}</div>
        </div>
        {visible.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map((idea, index) => <IdeaCard key={idea.ideaKey || idea.id || index} idea={idea} onLaunch={launch}
          research={jobs[idea.ideaKey]} researchBusy={busyKey === idea.ideaKey} researchEnabled={Boolean(channelIntel?._id && channelIntel?.researchRevision && idea.ideaKey)} onResearch={researchIdea} onViewResearch={viewResearch} />)}</div>
          : <div className="app-panel py-12 text-center"><h3 className="font-semibold">No ideas here yet</h3><p className="section-note mt-2">{filter === "all" ? "Refresh insights to find ideas for your channel." : "Try another category to see more ideas."}</p></div>}
        {filtered.length > 3 && <button type="button" className="app-button-secondary" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? "Show fewer ideas" : `View all ${filtered.length} ideas`}<IoChevronDown className={showAll ? "rotate-180" : ""} /></button>}
        <p className="text-xs text-text-muted leading-relaxed">Ideas are AI suggestions. Open an idea to review its reasoning and research before recording.</p>
      </div>}
      {view === "strategy" && <Strategy niche={channelIntel?.niche} summary={summary} recommendations={recommendations} recommendationsError={recommendationsError} />}
      {view === "competitors" && <ChannelCompetitorsPanel intelligenceId={channelIntel?._id} landscape={channelIntel?.competitorLandscape} isDemo={channelIntel?.isDemo} onUpdated={landscape => {
        trendsService.updateCompetitorLandscape(channelIntel._id, landscape);
        setChannelIntel(previous => ({ ...previous, competitorLandscape: landscape }));
      }} />}
    </div>
    {selectedResearch && <CompetitorResearchPanel researchId={selectedResearch.id} title={selectedResearch.title} onClose={closeResearch} onUpdated={record} />}
  </div>;
}
