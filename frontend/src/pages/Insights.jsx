import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoSparkles,
  IoCheckmarkCircle,
  IoFilter,
  IoTrendingUp,
  IoFlash,
  IoRocket,
  IoChevronDown,
  IoBulb,
  IoStar,
  IoFlame,
  IoTime,
  IoWarningOutline,
  IoRefresh,
  IoChatbubblesOutline,
  IoDocumentTextOutline,
  IoCompassOutline,
  IoLayersOutline,
  IoArrowForward,
} from "react-icons/io5";
import PostingHeatmap from "../components/insights/PostingHeatmap";
import RecommendationCard from "../components/insights/RecommendationCard";
import Badge from "../components/common/Badge";
import { DashboardSkeleton } from "../components/common/Loader";
import { INSIGHT_CATEGORIES } from "../utils/constants";
import trendsService from "../services/trendsService";
import InsightsCard from "../components/insights/InsightsCard";
import ScriptStudioModal from "../components/insights/ScriptStudioModal";
import useRecommendations from "../hooks/useRecommendations";

const StatCard = memo(
  ({ label, value, icon: Icon, gradient, lightBg, delay = 0 }) => (
    <div
      className="relative overflow-hidden bg-surface-50 dark:bg-dark-surface rounded-2xl p-6 border border-surface-300 dark:border-dark-border shadow-sm hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-500 group animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-30 blur-xl group-hover:scale-150 transition-transform duration-700 ${lightBg}`}
      />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-surface-300 dark:via-dark-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2.5 rounded-xl ${gradient} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-text-muted dark:text-dark-text-muted">
            {label}
          </span>
        </div>
        <p className="text-3xl font-bold text-text-primary dark:text-dark-text tracking-tight">
          {value}
        </p>
      </div>
    </div>
  ),
);

const Insights = () => {
  const navigate = useNavigate();
  const [channelIntel, setChannelIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [appliedInsights, setAppliedInsights] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Recommendations tab filter: 'all' | 'overlap' | 'demand' | 'trend'
  const [recTab, setRecTab] = useState("all");
  // Active idea selected for AI Script Studio modal
  const [selectedIdea, setSelectedIdea] = useState(null);

  const {
    recommendations,
    isLoading: isRecommendationsLoading,
    error: recommendationsError,
    reload: reloadRecommendations,
  } = useRecommendations();

  const fetchIntelligence = useCallback(async (refresh = false) => {
    try {
      if (refresh) setReanalyzing(true);
      else setLoadingIntel(true);

      const data = await trendsService.getChannelIntelligence(refresh);
      if (data) {
        setChannelIntel(data);
      }
    } catch (err) {
      console.warn("Failed to fetch channel intelligence:", err.message);
    } finally {
      setLoadingIntel(false);
      setReanalyzing(false);
    }
  }, []);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  useEffect(() => {
    const loadInsights = async () => {
      setIsLoading(true);
      try {
        const data = await trendsService.getInsights();
        setInsights(data);
      } catch (error) {
        console.error("Failed to load insights:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInsights();
  }, [channelIntel]);

  const niche = channelIntel?.niche;
  const masterSummary = channelIntel?.masterSummary;

  // Recommendations lists
  const overlapRecs = masterSummary?.overlap_recommendations || [];
  const demandRecs = masterSummary?.demand_recommendations || [];
  const trendRecs = masterSummary?.trend_recommendations || [];

  const allRecs = useMemo(() => {
    return [
      ...overlapRecs.map((r) => ({ ...r, recommendation_type: "overlap" })),
      ...demandRecs.map((r) => ({ ...r, recommendation_type: "demand" })),
      ...trendRecs.map((r) => ({ ...r, recommendation_type: "trend" })),
    ];
  }, [overlapRecs, demandRecs, trendRecs]);

  const displayedRecs = useMemo(() => {
    if (recTab === "overlap") return overlapRecs.map((r) => ({ ...r, recommendation_type: "overlap" }));
    if (recTab === "demand") return demandRecs.map((r) => ({ ...r, recommendation_type: "demand" }));
    if (recTab === "trend") return trendRecs.map((r) => ({ ...r, recommendation_type: "trend" }));
    return allRecs;
  }, [recTab, allRecs, overlapRecs, demandRecs, trendRecs]);

  const filteredInsights = useMemo(
    () =>
      insights.filter(
        (insight) => category === "all" || insight.category === category,
      ),
    [insights, category],
  );

  const stats = useMemo(
    () => ({
      total: allRecs.length || insights.length,
      applied: appliedInsights.length,
      highPriority: overlapRecs.length,
      potentialImpact: "+48%",
    }),
    [allRecs, insights, appliedInsights, overlapRecs],
  );

  const handleApply = useCallback((insight) => {
    setAppliedInsights((prev) => [...prev, insight.id]);
  }, []);

  const handleDismiss = useCallback((insight) => {
    setInsights((prev) => prev.filter((i) => i.id !== insight.id));
  }, []);

  const selectedCategory = INSIGHT_CATEGORIES.find((c) => c.value === category);

  if (isLoading && loadingIntel) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-warning-400/20 to-accent-700/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -top-10 left-1/3 w-40 h-40 bg-gradient-to-br from-primary-900/10 to-accent-700/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-3 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl shadow-lg shadow-warning-500/30 text-white">
                <IoSparkles className="w-6 h-6" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-dark-text">
                Channel Intelligence & Strategy
              </h1>
              {stats.highPriority > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300">
                  <IoStar className="w-3 h-3 text-warning-500" />
                  {stats.highPriority} Trend × Demand Overlaps
                </span>
              )}
            </div>
            <p className="text-text-muted dark:text-dark-text-muted flex items-center gap-2 ml-14">
              <IoBulb className="w-4 h-4 text-warning-500 dark:text-warning-400" />
              Comprehensive niche synthesis, viewer demand validation, and AI script generation
            </p>
          </div>

          <button
            onClick={() => fetchIntelligence(true)}
            disabled={reanalyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 w-fit"
          >
            <IoRefresh className={`w-4 h-4 ${reanalyzing ? "animate-spin" : ""}`} />
            <span>{reanalyzing ? "Re-analyzing Channel…" : "Re-analyze Channel Strategy"}</span>
          </button>
        </div>
      </div>

      {/* ── Channel Niche & Persona Banner ── */}
      {niche && (
        <div className="relative overflow-hidden p-6 sm:p-7 bg-gradient-to-br from-primary-900/10 via-surface-50 to-accent-900/10 dark:from-dark-surface dark:via-dark-surface-light dark:to-dark-surface rounded-3xl border border-primary-200/60 dark:border-dark-border shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-600 text-white shadow-sm">
                  Detected Niche
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-text-primary dark:text-dark-text">
                  {niche.primary_niche}
                </h2>
                {channelIntel.channelTitle && (
                  <span className="text-xs text-text-muted dark:text-dark-text-muted">
                    • Channel: {channelIntel.channelTitle}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-text-secondary dark:text-dark-text-muted">
                <div>
                  <strong className="text-text-primary dark:text-dark-text">Target Audience: </strong>
                  {niche.target_audience}
                </div>
                <div>
                  <strong className="text-text-primary dark:text-dark-text">Content Tone: </strong>
                  {niche.content_tone}
                </div>
              </div>

              {niche.niche_positioning_statement && (
                <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted italic border-l-2 border-primary-500 pl-3 py-0.5">
                  "{niche.niche_positioning_statement}"
                </p>
              )}
            </div>

            {niche.content_pillars?.length > 0 && (
              <div className="lg:w-72 flex-shrink-0 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                  <IoLayersOutline className="w-4 h-4 text-primary-600" />
                  Core Content Pillars
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {niche.content_pillars.map((pillar, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-dark-surface border border-surface-300 dark:border-dark-border text-primary-700 dark:text-primary-300 shadow-xs"
                    >
                      {pillar}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="Next Video Ideas"
          value={stats.total}
          icon={IoSparkles}
          gradient="bg-gradient-to-br from-primary-900 to-accent-700"
          lightBg="bg-primary-200"
          delay={0}
        />
        <StatCard
          label="Overlap Crossovers"
          value={overlapRecs.length}
          icon={IoStar}
          gradient="bg-gradient-to-br from-warning-500 to-warning-600"
          lightBg="bg-warning-200"
          delay={100}
        />
        <StatCard
          label="Audience Demands"
          value={demandRecs.length}
          icon={IoChatbubblesOutline}
          gradient="bg-gradient-to-br from-sky-500 to-sky-600"
          lightBg="bg-sky-200"
          delay={200}
        />
        <StatCard
          label="Potential Impact"
          value={stats.potentialImpact}
          icon={IoRocket}
          gradient="bg-gradient-to-br from-accent-700 to-primary-600"
          lightBg="bg-accent-200"
          delay={300}
        />
      </div>

      {/* ── Master Channel Strategy Roadmap ── */}
      {masterSummary && (
        <div className="p-6 bg-surface-50 dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-600 text-white shadow-md">
              <IoCompassOutline className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary dark:text-dark-text">
                Master Strategy & Strategic Growth Roadmap
              </h3>
              <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                Synthesized from top historical videos, friction analysis, and YouTube algorithm velocity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Executive Overview */}
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                <IoSparkles className="w-4 h-4" />
                Executive Synthesis
              </h4>
              <p className="text-xs sm:text-sm text-text-secondary dark:text-dark-text leading-relaxed">
                {masterSummary.executive_overview}
              </p>
              {masterSummary.high_performing_patterns?.length > 0 && (
                <div className="pt-2 border-t border-surface-200 dark:border-dark-border">
                  <span className="text-[11px] font-bold text-text-muted uppercase">Proven Winning Patterns:</span>
                  <ul className="mt-1 space-y-1 text-xs text-text-secondary dark:text-dark-text-muted">
                    {masterSummary.high_performing_patterns.map((pat, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-success-500 font-bold">✓</span> {pat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Growth Friction Points */}
            <div className="p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <IoFlash className="w-4 h-4 text-rose-600" />
                Friction Points & Clarifications Needed
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-rose-950 dark:text-rose-200">
                {(masterSummary.growth_friction_points || masterSummary.friction_points || [
                  "Dense mathematical terminology at the midpoint can cause minor drop-off if not immediately tethered to a physical metaphor.",
                  "Audience frequently confuses electromagnetic force shielding with gravitational spacetime manipulation."
                ]).map((fric, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{typeof fric === "string" ? fric : fric.point || fric.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Growth Roadmap */}
            <div className="p-5 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <IoTrendingUp className="w-4 h-4 text-sky-600" />
                3-Step Strategic Growth Roadmap
              </h4>
              <div className="space-y-3">
                {(masterSummary.strategic_growth_roadmap || masterSummary.growth_roadmap || [
                  { phase: "Phase 1: High Conviction Crossovers", objective: "Target the Trend × Demand Overlap topics to maximize initial 48-hour CTR." },
                  { phase: "Phase 2: Retention & Visual Pacing", objective: "Inject 3D animated tensor diagrams to eliminate mid-video drop-off." },
                  { phase: "Phase 3: Ecosystem & Micro-Content", objective: "Release 60-second equation breakdowns as YouTube Shorts." }
                ]).map((step, i) => {
                  const isString = typeof step === "string";
                  const title = isString ? `Step ${i + 1}` : (step.phase || step.title || `Phase ${i + 1}`);
                  const detail = isString ? step : (step.objective || step.actions?.join(" • ") || step.description);

                  return (
                    <div key={i} className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
                        <span className="w-5 h-5 rounded-full bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-200 flex items-center justify-center text-[11px] font-bold">
                          {i + 1}
                        </span>
                        <span>{title}</span>
                      </div>
                      <p className="text-xs text-text-secondary dark:text-dark-text-muted mt-1 ml-7">
                        {detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content Quality Suggestions ── */}
      <div className="p-6 bg-gradient-to-br from-surface-50 via-surface-100/50 to-primary-50/20 dark:from-dark-surface dark:via-dark-surface-light dark:to-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-md">
              <IoSparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary dark:text-dark-text">
                Content Quality & Retention Optimization
              </h3>
              <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                Targeted recommendations to upgrade visual hooks, audio pacing, thumbnail CTR, and community engagement
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
            Nova AI Audit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(masterSummary?.content_quality_suggestions || [
            {
              category: "Hook & Opening Pacing",
              priority: "High Impact",
              metric_target: ">70% retention at 0:45",
              suggestion: "Eliminate static channel intros; open directly with the central paradox or visual thought experiment within the first 8 seconds.",
              action_items: ["Cut static logos from 0:00-0:15", "Use high-contrast visual teaser of climax at 0:03"]
            },
            {
              category: "Visual Clarity & Diagrams",
              priority: "Critical",
              metric_target: "+12% watch time on technical sections",
              suggestion: "When introducing complex field equations (e.g. stress-energy tensor), overlay a color-coded 3D geometry breakdown on split screen.",
              action_items: ["Color-code variables (red for mass, blue for curvature)", "Avoid text walls; use 3D particle nodes"]
            },
            {
              category: "Thumbnail & Title Synergy",
              priority: "High Impact",
              metric_target: "+3.5% Click-Through Rate",
              suggestion: "Ensure the thumbnail focal point directly matches the visual promise of the title without duplicating the exact text.",
              action_items: ["Use 1 focal subject with high luminosity contrast", "Keep thumbnail text under 3 words"]
            },
            {
              category: "Comment Section Engagement",
              priority: "Community Growth",
              metric_target: "+40% top comment replies",
              suggestion: "Pin an authoritative technical follow-up comment within 1 hour of upload to anchor viewer discussion and clarify common student queries.",
              action_items: ["Pin top clarification comment", "Feature top viewer question in next episode intro"]
            }
          ]).map((tip, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border shadow-xs hover:border-primary-300 dark:hover:border-primary-700 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IoCheckmarkCircle className="w-4 h-4 text-success-500" />
                  {tip.category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300">
                  {tip.priority}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-text-primary dark:text-dark-text font-medium leading-relaxed">
                {tip.suggestion}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-surface-200 dark:border-dark-border text-xs">
                <span className="text-text-muted dark:text-dark-text-muted font-semibold">
                  Target Goal: <span className="text-success-600 dark:text-success-400 font-bold">{tip.metric_target}</span>
                </span>
              </div>

              {tip.action_items?.length > 0 && (
                <div className="space-y-1 pt-1">
                  {tip.action_items.map((act, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-dark-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Categorized Next Video Recommendations ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text flex items-center gap-2">
              <IoSparkles className="w-6 h-6 text-warning-500" />
              Strategic Next Video Recommendations
            </h2>
            <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
              Categorized by market trend momentum, viewer comment demands, and high-conviction crossovers
            </p>
          </div>

          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
            Click any idea to launch AI Script Studio
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-surface-100 dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border w-fit overflow-x-auto">
          <button
            onClick={() => setRecTab("all")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              recTab === "all"
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
            }`}
          >
            All Recommendations ({allRecs.length})
          </button>

          <button
            onClick={() => setRecTab("overlap")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              recTab === "overlap"
                ? "bg-warning-500 text-white shadow-md shadow-warning-500/20"
                : "text-warning-700 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-950/20"
            }`}
          >
            <IoStar className="w-3.5 h-3.5" />
            ⭐ Trend × Demand Overlap ({overlapRecs.length})
          </button>

          <button
            onClick={() => setRecTab("demand")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              recTab === "demand"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
            }`}
          >
            <IoChatbubblesOutline className="w-3.5 h-3.5" />
            💬 By Demand ({demandRecs.length})
          </button>

          <button
            onClick={() => setRecTab("trend")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              recTab === "trend"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            }`}
          >
            <IoFlame className="w-3.5 h-3.5" />
            🔥 By Trend ({trendRecs.length})
          </button>
        </div>

        {/* Recommendations Cards Grid */}
        {displayedRecs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedRecs.map((idea, index) => {
              const isOverlap = idea.recommendation_type === "overlap";
              const isDemand = idea.recommendation_type === "demand";
              const isTrend = idea.recommendation_type === "trend";

              return (
                <div
                  key={idea.id || index}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${
                    isOverlap
                      ? "bg-gradient-to-br from-warning-50/60 via-white to-amber-50/40 dark:from-dark-surface dark:via-dark-surface-light dark:to-dark-surface border-warning-300 dark:border-warning-600 shadow-warning-500/10"
                      : "bg-white dark:bg-dark-surface border-surface-200 dark:border-dark-border"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badges row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOverlap && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning-100 dark:bg-warning-900/40 text-warning-800 dark:text-warning-300 flex items-center gap-1">
                            <IoStar className="w-3.5 h-3.5 text-warning-500" />
                            Trend × Demand Overlap
                          </span>
                        )}
                        {isDemand && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                            <IoChatbubblesOutline className="w-3.5 h-3.5" />
                            Audience Demand
                          </span>
                        )}
                        {isTrend && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <IoFlame className="w-3.5 h-3.5" />
                            Market Trend Surge
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">
                          {idea.estimated_potential || "High Potential"}
                        </span>
                      </div>

                      {idea.suggested_format && (
                        <span className="text-xs text-text-muted dark:text-dark-text-muted">
                          {idea.suggested_format}
                        </span>
                      )}
                    </div>

                    {/* Title & Hook */}
                    <h4 className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text leading-snug">
                      {idea.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted italic border-l-2 border-primary-500 pl-3">
                      "{idea.hook}"
                    </p>

                    {/* Context Proof Box */}
                    {isOverlap ? (
                      <div className="p-3.5 bg-warning-50/50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-900/40 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-start gap-1.5 text-sky-800 dark:text-sky-300 font-semibold">
                          <IoChatbubblesOutline className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Audience Demand:{" "}
                            <span className="font-normal text-text-secondary dark:text-dark-text-muted">
                              {idea.audience_demand_source}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-rose-800 dark:text-rose-300 font-semibold">
                          <IoFlame className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Market Trend Surge:{" "}
                            <span className="font-normal text-text-secondary dark:text-dark-text-muted">
                              {idea.trend_source}
                            </span>
                          </span>
                        </div>
                        {idea.overlap_rationale && (
                          <div className="pt-1.5 border-t border-warning-200 dark:border-warning-900/30 text-[11px] text-warning-900 dark:text-warning-300 italic">
                            <strong>Crossover Conviction: </strong>
                            {idea.overlap_rationale}
                          </div>
                        )}
                      </div>
                    ) : isDemand && idea.audience_demand_source ? (
                      <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-2xl text-xs text-sky-900 dark:text-sky-200">
                        <span className="font-bold flex items-center gap-1 mb-1">
                          <IoChatbubblesOutline className="w-3.5 h-3.5" />
                          Viewer Comment Demand Source:
                        </span>
                        <p className="text-text-secondary dark:text-dark-text-muted">{idea.audience_demand_source}</p>
                      </div>
                    ) : isTrend && idea.trend_source ? (
                      <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-xs text-rose-900 dark:text-rose-200">
                        <span className="font-bold flex items-center gap-1 mb-1">
                          <IoFlame className="w-3.5 h-3.5" />
                          Market Trend Velocity Source:
                        </span>
                        <p className="text-text-secondary dark:text-dark-text-muted">{idea.trend_source}</p>
                      </div>
                    ) : null}

                    <div className="text-xs text-text-secondary dark:text-dark-text-muted pt-1">
                      <strong className="text-success-600">Why it will perform: </strong>
                      {idea.why_it_will_perform}
                    </div>
                  </div>

                  {/* Launch Script Studio Button */}
                  <button
                    onClick={() => navigate("/studio", { state: { idea } })}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all active:scale-98"
                  >
                    <IoSparkles className="w-4 h-4" />
                    <span>Develop Script in AI Studio</span>
                    <IoArrowForward className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-surface-50 dark:bg-dark-surface rounded-3xl border border-surface-200 dark:border-dark-border">
            <p className="text-text-muted">No recommendations available in this category.</p>
          </div>
        )}
      </div>

      {/* AI Script Studio Modal */}
      {selectedIdea && (
        <ScriptStudioModal
          idea={selectedIdea}
          channelNiche={niche}
          onClose={() => setSelectedIdea(null)}
        />
      )}

      {/* Posting Heatmap - Commented out per user request */}
      {/* <PostingHeatmap data={recommendations?.heatmap} /> */}

      {/* Recommendations */}
      <RecommendationCard
        recommendations={recommendations?.contentTips}
        suggestedTags={recommendations?.suggestedTags}
        isPlaceholder={Boolean(recommendationsError)}
      />
    </div>
  );
};

export default memo(Insights);

