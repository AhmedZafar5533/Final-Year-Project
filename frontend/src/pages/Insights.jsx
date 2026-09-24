import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoSparkles,
  IoCheckmarkCircle,
  IoTrendingUp,
  IoFlash,
  IoRocket,
  IoChevronDown,
  IoBulb,
  IoStar,
  IoFlame,
  IoRefresh,
  IoChatbubblesOutline,
  IoCompassOutline,
  IoLayersOutline,
  IoArrowForward,
} from "react-icons/io5";
import RecommendationCard from "../components/insights/RecommendationCard";
import { DashboardSkeleton } from "../components/common/Loader";
import trendsService from "../services/trendsService";
import ScriptStudioModal from "../components/insights/ScriptStudioModal";
import useRecommendations from "../hooks/useRecommendations";

// ──────────────────────────────────────────────────────────────────────────
// Small shared building blocks
// ──────────────────────────────────────────────────────────────────────────

const StatCard = memo(
  ({ label, value, icon: Icon, gradient, lightBg, delay = 0 }) => (
    <div
      className="relative overflow-hidden bg-surface-50 dark:bg-dark-surface rounded-2xl p-4 sm:p-6 border border-surface-300 dark:border-dark-border shadow-sm hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-500 group animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-30 blur-xl group-hover:scale-150 transition-transform duration-700 ${lightBg}`}
      />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-surface-300 dark:via-dark-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
          <div
            className={`p-2 sm:p-2.5 rounded-xl ${gradient} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 flex-shrink-0`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-text-muted dark:text-dark-text-muted leading-tight">
            {label}
          </span>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-dark-text tracking-tight">
          {value}
        </p>
      </div>
    </div>
  ),
);

// A paragraph clamped to N lines by default with a "Read more" toggle.
// Used everywhere a single free-text field could otherwise run long
// (executive synthesis, suggestion copy, hooks) so no one block dominates
// the page — the reader opts into the extra detail instead of receiving
// all of it at once.
// Tailwind's JIT scanner needs full, static class names to find them, so
// the clamp value is looked up rather than interpolated into the string.
const LINE_CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
};

const ClampText = memo(({ text, lines = 2, className = "", toggleClassName = "" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > lines * 60;
  const clampClass = LINE_CLAMP_CLASS[lines] || LINE_CLAMP_CLASS[2];
  return (
    <div>
      <p className={`${className} ${!expanded && isLong ? clampClass : ""}`}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold hover:underline ${toggleClassName}`}
        >
          {expanded ? "Show less" : "Read more"}
          <IoChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
});

// Per-type icon + tint, in the same "colored chip" language already used
// by InsightCard on this page — this is the pattern most dashboard
// products (Linear, Stripe, Notion, Vercel) use for a card header: a
// small tinted icon square, a title, and a muted meta line underneath.
const ideaTypeConfig = {
  overlap: {
    icon: IoStar,
    label: "Trend × Demand Overlap",
    gradient: "from-warning-400 to-warning-600",
    ring: "hover:ring-warning-200 dark:hover:ring-warning-800",
    glow: "bg-warning-400/25",
    text: "text-warning-600 dark:text-warning-400",
  },
  demand: {
    icon: IoChatbubblesOutline,
    label: "Audience Demand",
    gradient: "from-sky-400 to-sky-600",
    ring: "hover:ring-sky-200 dark:hover:ring-sky-800",
    glow: "bg-sky-400/25",
    text: "text-sky-600 dark:text-sky-400",
  },
  trend: {
    icon: IoFlame,
    label: "Market Trend",
    gradient: "from-rose-400 to-rose-600",
    ring: "hover:ring-rose-200 dark:hover:ring-rose-800",
    glow: "bg-rose-400/25",
    text: "text-rose-600 dark:text-rose-400",
  },
};

// One recommended-video card. Same tight row layout as before — the
// richness here comes from depth and color, not from more content:
// a gradient icon chip (matching the page's own StatCard treatment), a
// soft ambient glow that appears on hover, a colored ring keyed to the
// idea's type, and a gradient hairline divider (the same device
// RecommendationCard uses lower on this page) instead of a flat border.
// ─────────────────────────────────────────────────────────────────────────
// VARIANT B — "Signal"
// Confident, color-forward — closest in spirit to your current dashboard
// (StatCard glows, gradient chips) but tightened: a top accent bar for
// instant type recognition, quote-styled hook, and a full-width gradient
// CTA that reads as clearly clickable rather than a bare icon circle.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// VARIANT A — "Editorial Minimal"
// Quiet surface, no gradient wash, structure carried by a left rule and a
// small numeric/index treatment instead of color blocks. Reads like a
// research-note or analyst brief rather than a marketing tile — good if
// the goal is to feel authoritative and calm next to the stat-heavy rest
// of the dashboard, rather than competing with it for attention.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// VARIANT C — "Brief"
// Dense and structured, closer to a spec sheet than a marketing card.
// Best when a user is scanning 8–12 of these at once and needs to compare
// fast: potential + format sit in a single metrics strip up top, the type
// badge is a small colored pill (not a full icon chip) to save vertical
// space, and the footer is a compact split action bar.
// ─────────────────────────────────────────────────────────────────────────

const ideaTypePillClasse = {
  overlap: "bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-800",
  demand: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  trend: "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
};

// ─────────────────────────────────────────────────────────────────────────
// VARIANT D — "Ranked Score"
//
// Grounded in how the strongest 2026 dashboards (Vercel, Attio, Linear)
// actually behave: color is reserved for meaning, not decoration, and an
// AI-native surface leads with a *ranking/score*, not a mood-board card.
// These ideas ARE a ranked list — ranking is real content here, so a
// numbered index is information, not a generic "01/02/03" tell.
//
// - Base card is near-monochrome (surface + border only).
// - The ONE colored thing per card is the type dot + a live SVG ring that
//   visualizes the potential score — replacing the vague "High Potential"
//   text badge with an actual number you can compare across cards.
// - Index number is oversized, low-opacity, set behind the header — a
//   quiet watermark, not a competing focal point.
// - Hook is set in a serif italic as a proper "dek" under the headline,
//   which also differentiates this card visually from the rest of the
//   sans-only dashboard.
// ─────────────────────────────────────────────────────────────────────────

// Turns whatever shape `estimated_potential` comes in (a percentage
// string, a word like "High", or nothing) into a 0–100 score so it can
// drive the ring. Falls back to a sensible mid-high default.
const potentialToScore = (value) => {
  if (!value) return 78;
  const numMatch = String(value).match(/(\d+)/);
  if (numMatch) return Math.max(0, Math.min(100, parseInt(numMatch[1], 10)));
  const v = String(value).toLowerCase();
  if (v.includes("very high") || v.includes("critical")) return 94;
  if (v.includes("high")) return 82;
  if (v.includes("medium") || v.includes("moderate")) return 62;
  if (v.includes("low")) return 40;
  return 78;
};

const typeDotColor = {
  overlap: "bg-warning-500",
  demand: "bg-sky-500",
  trend: "bg-rose-500",
};

const typeRingColor = {
  overlap: "#f59e0b", // warning-500
  demand: "#0ea5e9", // sky-500
  trend: "#f43f5e", // rose-500
};

const ScoreRing = ({ score, color }) => {
  const size = 44;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-200 dark:stroke-dark-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-text-primary dark:text-dark-text">{score}</span>
      </div>
    </div>
  );
};

const IdeaCard = memo(({ idea, onLaunch, index = 0 }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const type = ideaTypeConfig[idea.recommendation_type];
  const dotColor = typeDotColor[idea.recommendation_type] || "bg-primary-500";
  const ringColor = typeRingColor[idea.recommendation_type] || "#6366f1";
  const score = useMemo(() => potentialToScore(idea.estimated_potential), [idea.estimated_potential]);

  const hasEvidence =
    idea.audience_demand_source || idea.trend_source || idea.overlap_rationale || idea.why_it_will_perform;

  return (
    <div className="group relative flex flex-col h-full overflow-hidden bg-white dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border transition-all duration-300 hover:border-surface-300 dark:hover:border-dark-text-muted/40 hover:shadow-lg dark:hover:shadow-black/20">
      {/* Oversized index watermark — quiet, behind the content */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 right-2 text-[64px] font-black leading-none text-surface-100 dark:text-dark-surface-light select-none"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative flex flex-col flex-1 p-4">
        {/* Header — type dot + label on the left, score ring on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0 pt-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            <span className="text-[11px] font-semibold text-text-muted dark:text-dark-text-muted truncate">
              {type?.label || "Recommendation"}
            </span>
          </div>
          <ScoreRing score={score} color={ringColor} />
        </div>

        {/* Headline */}
        <h4 className="mt-2.5 font-bold tracking-tight text-text-primary dark:text-dark-text text-[15px] leading-snug line-clamp-2">
          {idea.title}
        </h4>

        {/* Hook, set as a serif dek — the one deliberate typographic
            contrast on the card */}
        {idea.hook && (
          <p className="mt-1.5 font-serif italic text-[13px] text-text-secondary dark:text-dark-text-muted leading-relaxed line-clamp-2">
            {idea.hook}
          </p>
        )}

        {idea.suggested_format && (
          <p className="mt-2 text-[11px] font-medium text-text-muted dark:text-dark-text-muted">
            {idea.suggested_format}
          </p>
        )}

        {hasEvidence && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowEvidence((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold text-text-primary dark:text-dark-text hover:opacity-70 transition-opacity"
            >
              {showEvidence ? "Hide reasoning" : "Show reasoning"}
              <IoChevronDown className={`w-3 h-3 transition-transform ${showEvidence ? "rotate-180" : ""}`} />
            </button>

            {showEvidence && (
              <ul className="mt-2.5 space-y-2 text-[11px] leading-relaxed border-l border-surface-200 dark:border-dark-border pl-3">
                {idea.audience_demand_source && (
                  <li className="text-text-secondary dark:text-dark-text-muted">
                    <span className="font-semibold text-text-primary dark:text-dark-text">Demand.</span>{" "}
                    {idea.audience_demand_source}
                  </li>
                )}
                {idea.trend_source && (
                  <li className="text-text-secondary dark:text-dark-text-muted">
                    <span className="font-semibold text-text-primary dark:text-dark-text">Trend.</span>{" "}
                    {idea.trend_source}
                  </li>
                )}
                {idea.overlap_rationale && (
                  <li className="text-text-secondary dark:text-dark-text-muted">
                    <span className="font-semibold text-text-primary dark:text-dark-text">Overlap.</span>{" "}
                    {idea.overlap_rationale}
                  </li>
                )}
                {idea.why_it_will_perform && (
                  <li className="text-text-secondary dark:text-dark-text-muted">
                    <span className="font-semibold text-text-primary dark:text-dark-text">Why.</span>{" "}
                    {idea.why_it_will_perform}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Footer — the type color appears exactly once more here, on the
            action itself, tying the ring / dot / CTA together */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-surface-100 dark:border-dark-border/60">
          <span className="text-[11px] text-text-muted dark:text-dark-text-muted">Score {score}/100</span>
          <button
            onClick={() => onLaunch(idea)}
            aria-label={`Develop "${idea.title}" in AI Script Studio`}
            className="flex items-center gap-1 text-xs font-bold text-text-primary dark:text-dark-text group-hover:gap-2 transition-all"
            style={{ color: ringColor }}
          >
            Script this
            <IoArrowForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

const ContentTipCard = memo(({ tip }) => {
  const [showActions, setShowActions] = useState(false);
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-surface border border-surface-200 dark:border-dark-border shadow-xs hover:border-primary-300 dark:hover:border-primary-700 transition-all space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
          <IoCheckmarkCircle className="w-4 h-4 text-success-500 flex-shrink-0" />
          <span className="truncate">{tip.category}</span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 whitespace-nowrap flex-shrink-0">
          {tip.priority}
        </span>
      </div>

      <ClampText
        text={tip.suggestion}
        lines={2}
        className="text-xs sm:text-sm text-text-primary dark:text-dark-text font-medium leading-relaxed"
        toggleClassName="text-primary-600 dark:text-primary-400"
      />

      <div className="flex items-center justify-between pt-2 border-t border-surface-200 dark:border-dark-border text-xs gap-2">
        <span className="text-text-muted dark:text-dark-text-muted font-semibold truncate">
          Goal: <span className="text-success-600 dark:text-success-400 font-bold">{tip.metric_target}</span>
        </span>
        {tip.action_items?.length > 0 && (
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
          >
            {showActions ? "Hide steps" : `${tip.action_items.length} steps`}
            <IoChevronDown className={`w-3 h-3 transition-transform ${showActions ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {showActions && tip.action_items?.length > 0 && (
        <div className="space-y-1 pt-1">
          {tip.action_items.map((act, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-dark-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
              <span>{act}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ──────────────────────────────────────────────────────────────────────────

const Insights = () => {
  const navigate = useNavigate();
  const [channelIntel, setChannelIntel] = useState(() => trendsService.getCachedIntelligence());
  const [loadingIntel, setLoadingIntel] = useState(() => !trendsService.getCachedIntelligence());
  const [reanalyzing, setReanalyzing] = useState(false);

  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(() => !trendsService.getCachedIntelligence());
  const [category, setCategory] = useState("all");
  const [appliedInsights, setAppliedInsights] = useState([]);

  // Recommendations tab filter: 'all' | 'overlap' | 'demand' | 'trend'
  const [recTab, setRecTab] = useState("all");
  // Active idea selected for AI Script Studio modal
  const [selectedIdea, setSelectedIdea] = useState(null);

  const {
    recommendations,
    error: recommendationsError,
  } = useRecommendations();

  const fetchIntelligence = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setReanalyzing(true);
      } else if (!trendsService.getCachedIntelligence()) {
        setLoadingIntel(true);
      }

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

  const stats = useMemo(
    () => ({
      total: allRecs.length || insights.length,
      applied: appliedInsights.length,
      highPriority: overlapRecs.length,
      potentialImpact: "+48%",
    }),
    [allRecs, insights, appliedInsights, overlapRecs],
  );

  const handleLaunchStudio = useCallback(
    (idea) => navigate("/studio", { state: { idea } }),
    [navigate],
  );

  if (isLoading && loadingIntel) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <div className="relative">
        {/* Decorative glows — clipped so they never widen the page on mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-warning-400/20 to-accent-700/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -top-10 left-1/3 w-40 h-40 bg-gradient-to-br from-primary-900/10 to-accent-700/10 rounded-full blur-2xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-warning-500 to-warning-600 rounded-2xl shadow-lg shadow-warning-500/30 text-white flex-shrink-0">
                <IoSparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary dark:text-dark-text">
                Channel Intelligence & Strategy
              </h1>
              {stats.highPriority > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300">
                  <IoStar className="w-3 h-3 text-warning-500" />
                  {stats.highPriority} Overlaps
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted dark:text-dark-text-muted flex items-center gap-2 sm:ml-14">
              <IoBulb className="w-4 h-4 text-warning-500 dark:text-warning-400 flex-shrink-0" />
              Niche synthesis, viewer demand validation, and AI script generation
            </p>
          </div>

          <button
            onClick={() => fetchIntelligence(true)}
            disabled={reanalyzing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 w-full lg:w-fit flex-shrink-0"
          >
            <IoRefresh className={`w-4 h-4 flex-shrink-0 ${reanalyzing ? "animate-spin" : ""}`} />
            <span>{reanalyzing ? "Re-analyzing…" : "Re-analyze Channel Strategy"}</span>
          </button>
        </div>
      </div>

      {/* ── Channel Niche & Persona Banner ── */}
      {niche && (
        <div className="relative overflow-hidden p-5 sm:p-7 bg-gradient-to-br from-primary-900/10 via-surface-50 to-accent-900/10 dark:from-dark-surface dark:via-dark-surface-light dark:to-dark-surface rounded-3xl border border-primary-200/60 dark:border-dark-border shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary-600 text-white shadow-sm">
                  Detected Niche
                </span>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-text-primary dark:text-dark-text">
                  {niche.primary_niche}
                </h2>
                {channelIntel.channelTitle && (
                  <span className="text-xs text-text-muted dark:text-dark-text-muted truncate">
                    • {channelIntel.channelTitle}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm text-text-secondary dark:text-dark-text-muted">
                <div>
                  <strong className="text-text-primary dark:text-dark-text">Audience: </strong>
                  {niche.target_audience}
                </div>
                <div>
                  <strong className="text-text-primary dark:text-dark-text">Tone: </strong>
                  {niche.content_tone}
                </div>
              </div>

              {niche.niche_positioning_statement && (
                <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted italic border-l-2 border-primary-500 pl-3 py-0.5 line-clamp-2">
                  "{niche.niche_positioning_statement}"
                </p>
              )}
            </div>

            {niche.content_pillars?.length > 0 && (
              <div className="lg:w-64 flex-shrink-0 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                  <IoLayersOutline className="w-4 h-4 text-primary-600" />
                  Content Pillars
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
        <div className="p-5 sm:p-6 bg-surface-50 dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-sm space-y-5 sm:space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-600 text-white shadow-md flex-shrink-0">
              <IoCompassOutline className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text">
                Master Strategy & Growth Roadmap
              </h3>
              <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                Synthesized from top videos, friction analysis, and algorithm velocity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Executive Overview */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                <IoSparkles className="w-4 h-4" />
                Executive Synthesis
              </h4>
              <ClampText
                text={masterSummary.executive_overview}
                lines={3}
                className="text-xs sm:text-sm text-text-secondary dark:text-dark-text leading-relaxed"
                toggleClassName="text-primary-600 dark:text-primary-400"
              />
              {masterSummary.high_performing_patterns?.length > 0 && (
                <div className="pt-2 border-t border-surface-200 dark:border-dark-border">
                  <span className="text-[11px] font-bold text-text-muted uppercase">Winning Patterns</span>
                  <ul className="mt-1 space-y-1 text-xs text-text-secondary dark:text-dark-text-muted">
                    {masterSummary.high_performing_patterns.map((pat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-success-500 font-bold flex-shrink-0">✓</span> <span>{pat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Growth Friction Points */}
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <IoFlash className="w-4 h-4 text-rose-600 flex-shrink-0" />
                Friction Points
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-rose-950 dark:text-rose-200">
                {(masterSummary.growth_friction_points || masterSummary.friction_points || [
                  "Dense mathematical terminology at the midpoint can cause minor drop-off if not immediately tethered to a physical metaphor.",
                  "Audience frequently confuses electromagnetic force shielding with gravitational spacetime manipulation.",
                ]).map((fric, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold flex-shrink-0">•</span>
                    <span>{typeof fric === "string" ? fric : fric.point || fric.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Growth Roadmap */}
            <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <IoTrendingUp className="w-4 h-4 text-sky-600 flex-shrink-0" />
                3-Step Roadmap
              </h4>
              <div className="space-y-3">
                {(masterSummary.strategic_growth_roadmap || masterSummary.growth_roadmap || [
                  { phase: "Phase 1: High Conviction Crossovers", objective: "Target the Trend × Demand Overlap topics to maximize initial 48-hour CTR." },
                  { phase: "Phase 2: Retention & Visual Pacing", objective: "Inject 3D animated tensor diagrams to eliminate mid-video drop-off." },
                  { phase: "Phase 3: Ecosystem & Micro-Content", objective: "Release 60-second equation breakdowns as YouTube Shorts." },
                ]).map((step, i) => {
                  const isString = typeof step === "string";
                  const title = isString ? `Step ${i + 1}` : step.phase || step.title || `Phase ${i + 1}`;
                  const detail = isString ? step : step.objective || step.actions?.join(" • ") || step.description;

                  return (
                    <div key={i} className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
                        <span className="w-5 h-5 rounded-full bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-200 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span>{title}</span>
                      </div>
                      <p className="text-xs text-text-secondary dark:text-dark-text-muted mt-1 ml-7">{detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content Quality Suggestions ── */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-surface-50 via-surface-100/50 to-primary-50/20 dark:from-dark-surface dark:via-dark-surface-light dark:to-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-sm space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-md flex-shrink-0">
              <IoSparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-text-primary dark:text-dark-text">
                Content Quality & Retention
              </h3>
              <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                Hooks, pacing, thumbnails, and engagement
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex-shrink-0">
            Nova AI Audit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {(masterSummary?.content_quality_suggestions || [
            {
              category: "Hook & Opening Pacing",
              priority: "High Impact",
              metric_target: ">70% retention at 0:45",
              suggestion: "Eliminate static channel intros; open directly with the central paradox or visual thought experiment within the first 8 seconds.",
              action_items: ["Cut static logos from 0:00-0:15", "Use high-contrast visual teaser of climax at 0:03"],
            },
            {
              category: "Visual Clarity & Diagrams",
              priority: "Critical",
              metric_target: "+12% watch time on technical sections",
              suggestion: "When introducing complex field equations (e.g. stress-energy tensor), overlay a color-coded 3D geometry breakdown on split screen.",
              action_items: ["Color-code variables (red for mass, blue for curvature)", "Avoid text walls; use 3D particle nodes"],
            },
            {
              category: "Thumbnail & Title Synergy",
              priority: "High Impact",
              metric_target: "+3.5% Click-Through Rate",
              suggestion: "Ensure the thumbnail focal point directly matches the visual promise of the title without duplicating the exact text.",
              action_items: ["Use 1 focal subject with high luminosity contrast", "Keep thumbnail text under 3 words"],
            },
            {
              category: "Comment Section Engagement",
              priority: "Community Growth",
              metric_target: "+40% top comment replies",
              suggestion: "Pin an authoritative technical follow-up comment within 1 hour of upload to anchor viewer discussion and clarify common student queries.",
              action_items: ["Pin top clarification comment", "Feature top viewer question in next episode intro"],
            },
          ]).map((tip, idx) => (
            <ContentTipCard key={idx} tip={tip} />
          ))}
        </div>
      </div>

      {/* ── Categorized Next Video Recommendations ── */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-dark-text flex items-center gap-2">
              <IoSparkles className="w-5 h-5 sm:w-6 sm:h-6 text-warning-500 flex-shrink-0" />
              Strategic Next Video Recommendations
            </h2>
            <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
              By trend momentum, viewer demand, and high-conviction crossovers
            </p>
          </div>

          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 flex-shrink-0">
            Click a card to launch AI Script Studio
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-surface-100 dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setRecTab("all")}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              recTab === "all"
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                : "text-text-muted hover:text-text-primary dark:hover:text-dark-text"
            }`}
          >
            All ({allRecs.length})
          </button>

          <button
            onClick={() => setRecTab("overlap")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              recTab === "overlap"
                ? "bg-warning-500 text-white shadow-md shadow-warning-500/20"
                : "text-warning-700 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-950/20"
            }`}
          >
            <IoStar className="w-3.5 h-3.5" />
            Overlap ({overlapRecs.length})
          </button>

          <button
            onClick={() => setRecTab("demand")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              recTab === "demand"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
            }`}
          >
            <IoChatbubblesOutline className="w-3.5 h-3.5" />
            Demand ({demandRecs.length})
          </button>

          <button
            onClick={() => setRecTab("trend")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              recTab === "trend"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            }`}
          >
            <IoFlame className="w-3.5 h-3.5" />
            Trend ({trendRecs.length})
          </button>
        </div>

        {/* Recommendations Cards Grid */}
        {displayedRecs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
            {displayedRecs.map((idea, index) => (
              <IdeaCard key={idea.id || index} idea={idea} onLaunch={handleLaunchStudio} />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center bg-surface-50 dark:bg-dark-surface rounded-3xl border border-surface-200 dark:border-dark-border">
            <p className="text-text-muted">No recommendations available in this category.</p>
          </div>
        )}
      </div>

      {/* AI Script Studio Modal */}
      {selectedIdea && (
        <ScriptStudioModal idea={selectedIdea} channelNiche={niche} onClose={() => setSelectedIdea(null)} />
      )}

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
