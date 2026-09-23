import { useMemo, useState, useCallback } from "react";
import {
  IoPlayCircleOutline,
  IoWarningOutline,
  IoTimeOutline,
  IoLogoYoutube,
  IoTrendingUp,
} from "react-icons/io5";
import Badge from "../common/Badge";
import { useLiveTrends, usePythonServiceHealth } from "../../hooks/useLiveTrends";

/**
 * Normalizes a trend item so the UI works whether it came from a fresh
 * pipeline run (nested `scores`/`engagement` objects, see pipeline.py
 * `_df_to_list`) or from the `/cached` endpoint (flat MongoDB documents).
 */
function normalizeTrendItem(item) {
  const scores = item.scores || {
    trend: item.trend_score ?? 0,
    relevance: item.relevance_score ?? 0,
    google: item.google_interest ?? 0,
    engagement: item.engagement_score ?? 0,
  };
  const engagement = item.engagement || {
    views: item.views ?? 0,
    views_fmt: null,
    likes: item.likes ?? 0,
    comments: item.comments ?? 0,
  };
  const match = item.match || null;
  return { ...item, scores, engagement, match };
}

const ScoreBar = ({ label, value, max = 1, color = "bg-primary-500" }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted dark:text-dark-text-muted w-16 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-surface-200 dark:bg-dark-surface-light rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-text-primary dark:text-dark-text w-10 text-right tabular-nums">
        {typeof value === "number" ? value.toFixed(2) : value}
      </span>
    </div>
  );
};

const TrendItemCard = ({ item, showRelevance, onSelect }) => {
  const trend = normalizeTrendItem(item);
  const trendScore = trend.scores.trend ?? 0;
  const isHot = trendScore >= 0.4;
  // Fallback only applies when the pipeline genuinely omitted a score —
  // a real 0 trend score must stay 0, not be mistaken for "missing" (|| would do that).
  const oppScore = Math.round((trend.scores.trend ?? 0.8) * 100);

  const handleSelect = useCallback(
    () => onSelect?.({ ...trend, opportunityScore: oppScore }),
    [trend, oppScore, onSelect],
  );

  return (
    <div className="p-4 bg-surface-50 dark:bg-dark-surface rounded-xl border border-surface-200 dark:border-dark-border flex flex-col justify-between space-y-3">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={trend.platform === "youtube" ? "error" : "info"} size="sm">
                {trend.platform === "youtube" ? (
                  <span className="flex items-center gap-1">
                    <IoLogoYoutube className="w-3 h-3" /> YouTube
                  </span>
                ) : (
                  trend.platform
                )}
              </Badge>
              {isHot && (
                <Badge variant="warning" size="sm">
                  🔥 Hot
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={handleSelect}
              className="text-sm font-semibold text-text-primary dark:text-dark-text text-left hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              {trend.topic}
            </button>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-text-muted dark:text-dark-text-muted">
              {trend.engagement.views_fmt ?? trend.engagement.views ?? 0} views
            </p>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          <ScoreBar label="Trend" value={trendScore} color="bg-primary-500" />
          {showRelevance && (
            <ScoreBar label="Relevance" value={trend.scores.relevance ?? 0} color="bg-success-500" />
          )}
          <ScoreBar label="Google" value={(trend.scores.google ?? 0) / 100} color="bg-warning-500" />
        </div>

        {trend.tags && trend.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {trend.tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-surface-200 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-muted text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {trend.match && (
          <p className="text-xs text-text-light dark:text-dark-text-muted">
            Matched via:{" "}
            {[
              trend.match.category && `category:${trend.match.category}`,
              trend.match.tags &&
                `tags:${Array.isArray(trend.match.tags) ? trend.match.tags.join(",") : trend.match.tags}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSelect}
        className="w-full py-2 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <span>Explore Topic & Suggestions</span>
      </button>
    </div>
  );
};

const STATUS_COLORS = {
  checking: "bg-warning-400 animate-pulse",
  online: "bg-success-500",
  offline: "bg-error-500",
};

const StatusDot = ({ status }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status] ?? "bg-surface-300 dark:bg-dark-border"}`} />
);

const LiveTrendsPanel = ({ onSelectTrend }) => {
  const { data, isLoading, error, hasRun, run, loadCached } = useLiveTrends();
  const { status: serviceStatus, message: serviceMessage } = usePythonServiceHealth();
  const [region, setRegion] = useState("");

  const channel = data?.channel;
  const nicheTrends = data?.niche_trends || [];
  const generalTrends = data?.general_trends || [];
  const meta = data?.meta;

  const isYoutubeKeyError = useMemo(
    () => Boolean(error && error.toLowerCase().includes("youtube_api_key")),
    [error],
  );

  return (
    <div className="space-y-6">
      {/* Service status + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <StatusDot status={serviceStatus} />
          <span className="text-sm text-text-secondary dark:text-dark-text-muted">
            {serviceStatus === "online" && "ML service online"}
            {serviceStatus === "checking" && "Checking ML service..."}
            {serviceStatus === "offline" && (serviceMessage || "ML service offline")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="trends-region" className="sr-only">
            Region code
          </label>
          <input
            id="trends-region"
            type="text"
            placeholder="Region (e.g. PK)"
            value={region}
            onChange={(e) => setRegion(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className="w-32 px-3 py-2 bg-surface-100 dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-lg text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => loadCached()}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-text-secondary dark:text-dark-text-muted hover:bg-surface-100 dark:hover:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Load Cached
          </button>
          <button
            type="button"
            onClick={() => run(region ? { region } : {})}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <IoPlayCircleOutline className={`w-4 h-4 ${isLoading ? "animate-pulse" : ""}`} />
            {isLoading ? "Running pipeline..." : "Run Live Detection"}
          </button>
        </div>
      </div>

      {/* Empty / intro state */}
      {!hasRun && !error && (
        <div className="text-center py-12 bg-surface-50 dark:bg-dark-surface rounded-2xl border border-dashed border-surface-300 dark:border-dark-border">
          <IoTrendingUp className="w-10 h-10 text-text-light dark:text-dark-text-muted mx-auto mb-3" />
          <p className="text-text-secondary dark:text-dark-text-muted">
            Run the live pipeline to fetch real YouTube + Google Trends data for the demo channel.
          </p>
          <p className="text-xs text-text-light dark:text-dark-text-muted mt-1">
            Uses RoBERTa sentiment, TF-IDF topic clustering, and Google Trends velocity.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-2xl flex items-start gap-3">
          <IoWarningOutline className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-error-900 dark:text-error-200 text-sm">
              Failed to fetch live trends
            </p>
            <p className="text-sm text-error-700 dark:text-error-400 mt-0.5">{error}</p>
            {isYoutubeKeyError && (
              <p className="text-xs text-error-600 dark:text-error-400 mt-1">
                Add YOUTUBE_API_KEY to <code>trends_module/.env</code> and restart the Python
                service, then try again.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {data && !error && (
        <>
          {channel && (
            <div className="flex items-center justify-between p-4 bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-200 dark:border-dark-border">
              <div>
                <p className="font-semibold text-text-primary dark:text-dark-text">{channel.name}</p>
                <p className="text-sm text-text-muted dark:text-dark-text-muted">
                  Niche: {channel.niche} {channel.region && `· Region: ${channel.region}`}
                </p>
              </div>
              {meta && (
                <div className="flex items-center gap-2 text-xs text-text-light dark:text-dark-text-muted">
                  <IoTimeOutline className="w-4 h-4" />
                  {meta.fetched_time || meta.source}
                </div>
              )}
            </div>
          )}

          {nicheTrends.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3">
                Niche Trends ({nicheTrends.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {nicheTrends.map((item, i) => (
                  <TrendItemCard
                    key={item.id ?? item.topic ?? i}
                    item={item}
                    showRelevance
                    onSelect={onSelectTrend}
                  />
                ))}
              </div>
            </div>
          )}

          {generalTrends.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text mb-3">
                General Trending ({generalTrends.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generalTrends.slice(0, 10).map((item, i) => (
                  <TrendItemCard
                    key={item.id ?? item.topic ?? i}
                    item={item}
                    showRelevance={false}
                    onSelect={onSelectTrend}
                  />
                ))}
              </div>
            </div>
          )}

          {nicheTrends.length === 0 && generalTrends.length === 0 && (
            <p className="text-center text-text-muted dark:text-dark-text-muted py-8">
              No trend data returned. Try lowering the niche threshold or a different region.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default LiveTrendsPanel;
