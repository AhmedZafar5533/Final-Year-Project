import { useState } from "react";
import {
  IoBookmarkOutline,
  IoBookmark,
  IoShareSocialOutline,
  IoChevronDown,
  IoChevronUp,
  IoFlameOutline,
  IoTrendingUpOutline,
} from "react-icons/io5";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import Badge from "../common/Badge";
import Button from "../common/Button";

const TrendCard = ({ trend, onExplore }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const strengthColors = {
    High: "success",
    Medium: "warning",
    Low: "neutral",
  };

  const growthData = trend.growthData || [20, 35, 50, 65, 80, 95];
  const chartData = growthData.map((value) => ({ value }));
  const hashtags = trend.hashtags || [];
  const searchVolume = trend.searchVolume || "250K monthly searches";
  const opportunityScore = trend.opportunityScore ?? 75;

  const scoreTone =
    opportunityScore >= 80
      ? { bar: "from-emerald-400 to-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
      : opportunityScore >= 50
        ? { bar: "from-amber-400 to-amber-500", text: "text-amber-600 dark:text-amber-400" }
        : { bar: "from-rose-400 to-rose-500", text: "text-rose-600 dark:text-rose-400" };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-2xl border border-surface-300/70 dark:border-dark-border bg-surface-50 dark:bg-dark-surface overflow-hidden transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
    >
      {/* Ambient accent glow, revealed on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
      />
      {/* Hairline gradient top edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <Badge variant={strengthColors[trend.strength] || "info"} size="sm">
                <span className="inline-flex items-center gap-1">
                  <IoFlameOutline className="w-3 h-3" />
                  {trend.strength || "Surging"}
                </span>
              </Badge>
              {trend.covered && (
                <Badge variant="info" size="sm">
                  Covered
                </Badge>
              )}
            </div>
            <h3
              onClick={() => onExplore?.(trend)}
              className="text-lg font-semibold tracking-tight text-text-primary dark:text-dark-text mb-1 cursor-pointer leading-snug transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400"
            >
              {trend.topic}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted dark:text-dark-text-muted">
              {searchVolume}
            </p>
          </div>

          {/* Growth Chart */}
          <button
            type="button"
            onClick={() => onExplore?.(trend)}
            aria-label={`View growth trend for ${trend.topic}`}
            className="w-24 h-16 shrink-0 rounded-lg transition-transform duration-300 group-hover:scale-105"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient
                    id={`trendGradient-${trend.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3a7a4a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3a7a4a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3a7a4a"
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill={`url(#trendGradient-${trend.id})`}
                  isAnimationActive={isHovered}
                />
              </AreaChart>
            </ResponsiveContainer>
          </button>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {hashtags.map((tag, index) => (
              <span
                key={index}
                onClick={() => onExplore?.(trend)}
                className="px-2.5 py-1 bg-surface-200/70 dark:bg-dark-surface-light text-text-secondary dark:text-dark-text-muted text-xs font-medium rounded-full cursor-pointer transition-all duration-200 hover:bg-primary-100 hover:text-primary-700 dark:hover:bg-primary-900/30 dark:hover:text-primary-300 hover:-translate-y-px"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Opportunity Score */}
        <div
          className="mb-5 cursor-pointer"
          onClick={() => onExplore?.(trend)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted dark:text-dark-text-muted">
              <IoTrendingUpOutline className="w-3.5 h-3.5" />
              Opportunity Score
            </span>
            <span className={`text-sm font-bold tabular-nums ${scoreTone.text}`}>
              {opportunityScore}
              <span className="text-text-muted dark:text-dark-text-muted font-normal">/100</span>
            </span>
          </div>
          <div className="h-1.5 bg-surface-200 dark:bg-dark-surface-light rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${scoreTone.bar} transition-all duration-700 ease-out`}
              style={{ width: isHovered || true ? `${opportunityScore}%` : "0%" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onExplore?.(trend)}
            className="flex-1"
          >
            Explore Topic & Suggestions
          </Button>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this trend"}
            aria-pressed={isBookmarked}
            title={isBookmarked ? "Bookmarked" : "Bookmark"}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              isBookmarked
                ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400"
                : "border-surface-300 dark:border-dark-border text-text-muted dark:text-dark-text-muted hover:bg-surface-100 dark:hover:bg-dark-surface-light hover:border-surface-400 dark:hover:border-dark-text-muted"
            }`}
          >
            {isBookmarked ? (
              <IoBookmark className="w-5 h-5" />
            ) : (
              <IoBookmarkOutline className="w-5 h-5" />
            )}
          </button>
          <button
            aria-label="Share this trend"
            title="Share"
            className="p-2 rounded-lg border border-surface-300 dark:border-dark-border text-text-muted dark:text-dark-text-muted transition-all duration-200 hover:bg-surface-100 dark:hover:bg-dark-surface-light hover:border-surface-400 dark:hover:border-dark-text-muted"
          >
            <IoShareSocialOutline className="w-5 h-5" />
          </button>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="w-full mt-4 pt-4 border-t border-surface-200 dark:border-dark-border flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wider text-text-muted dark:text-dark-text-muted transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400"
        >
          {isExpanded ? "Show less" : "Show more"}
          {isExpanded ? (
            <IoChevronUp className="w-3.5 h-3.5 transition-transform duration-300" />
          ) : (
            <IoChevronDown className="w-3.5 h-3.5 transition-transform duration-300" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      <div
        className={`grid transition-all duration-400 ease-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-5 border-t border-surface-200 dark:border-dark-border bg-gradient-to-b from-surface-100/80 to-transparent dark:from-dark-surface-light/50">
            <p className="text-sm text-text-secondary dark:text-dark-text-muted mb-4 leading-relaxed">
              {trend.marketInsight || trend.description || "High velocity trend in this creator niche."}
            </p>

            {(trend.relatedVideos || []).length > 0 && (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary dark:text-dark-text mb-3">
                  Related Videos Performing Well
                </h4>
                <div className="space-y-1.5">
                  {trend.relatedVideos.map((video, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4 p-3 bg-surface-50 dark:bg-dark-surface rounded-lg border border-surface-200/70 dark:border-dark-border transition-colors duration-200 hover:border-primary-300 dark:hover:border-primary-700"
                    >
                      <span className="flex items-center gap-3 text-sm text-text-secondary dark:text-dark-text-muted truncate flex-1">
                        <span className="text-[11px] font-semibold text-text-muted/70 dark:text-dark-text-muted/60 tabular-nums w-4 shrink-0">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate">{video.title}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text whitespace-nowrap">
                        {video.views}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendCard;
