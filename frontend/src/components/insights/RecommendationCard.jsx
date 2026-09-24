import { useState, useMemo } from "react";
import {
  IoCheckmark,
  IoClose,
  IoInformationCircle,
  IoArrowForward,
  IoPricetagOutline,
  IoChevronDown,
  IoSparkles,
} from "react-icons/io5";
import Card from "../common/Card";

// Brand gradient sampled from the product mark (gold → orange → coral).
const BRAND = {
  gold: "#F5A623",
  orange: "#F2793D",
  coral: "#F2735E",
};

const fallbackRecommendations = [
  {
    id: 1,
    category: "Viewer Retention & Pacing",
    current: "Standard 30s Intro",
    recommendation: "Deliver the core promise within the first 10 seconds to hook viewers",
    impact: "+25% Retention",
    status: "warning",
  },
  {
    id: 2,
    category: "Thumbnail & Title Synergy",
    current: "Generic Titles",
    recommendation: "Use curiosity gap questions with high-contrast, face-forward visuals",
    impact: "+40% CTR",
    status: "error",
  },
  {
    id: 3,
    category: "Audience Call-to-Action",
    current: "End Screen Link Only",
    recommendation: "Place an interactive pinned comment question within 1 hour of upload",
    impact: "+50% Comments",
    status: "success",
  },
  {
    id: 4,
    category: "Publishing Strategy",
    current: "Irregular Upload Times",
    recommendation: "Publish during your audience's peak active hours (4 PM - 7 PM)",
    impact: "+18% Initial Views",
    status: "warning",
  },
];

const fallbackTags = [
  "#YouTubeGrowth",
  "#ContentCreation",
  "#VideoSEO",
  "#CreatorEconomy",
  "#AudienceRetention",
  "#AlgorithmOptimization",
  "#ViralTrends",
  "#Scriptwriting",
];

const statusColors = {
  success:
    "bg-success-100 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800",
  warning:
    "bg-[#F5A623]/15 text-[#B8631A] border-[#F5A623]/30 dark:bg-[#F5A623]/15 dark:text-[#F5A623] dark:border-[#F5A623]/30",
  error:
    "bg-error-100 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-400 dark:border-error-800",
};

const statusIcons = {
  success: <IoCheckmark className="w-4 h-4" />,
  warning: <IoInformationCircle className="w-4 h-4" />,
  error: <IoClose className="w-4 h-4" />,
};

const VISIBLE_TAG_COUNT = 6;

/**
 * Normalizes an item whether it comes as a string or an object with missing fields.
 */
function normalizeRecItem(item, index) {
  if (typeof item === "string") {
    const categories = ["Content Strategy", "Viewer Engagement", "Pacing & Retention", "Algorithm Alignment"];
    const impacts = ["+25% Watch Time", "+35% CTR", "+40% Engagement", "+20% Retention"];
    const statuses = ["warning", "success", "error", "warning"];

    return {
      id: `rec-str-${index}`,
      category: categories[index % categories.length],
      current: "Current Channel Standard",
      recommendation: item,
      impact: impacts[index % impacts.length],
      status: statuses[index % statuses.length],
    };
  }

  return {
    id: item.id || `rec-${index}`,
    category: item.category || "Optimization Strategy",
    current: item.current || "Standard Production Format",
    recommendation: item.recommendation || item.text || item.tip || item.objective || "Optimize video quality and engagement triggers",
    impact: item.impact || "+25% Growth",
    status: item.status || (index % 2 === 0 ? "warning" : "success"),
  };
}

const RecommendationCard = ({ recommendations, suggestedTags, isPlaceholder = false }) => {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const rawItems = recommendations && recommendations.length > 0 ? recommendations : fallbackRecommendations;
  const items = useMemo(() => rawItems.map((item, index) => normalizeRecItem(item, index)), [rawItems]);

  const tags = suggestedTags && suggestedTags.length > 0 ? suggestedTags : fallbackTags;
  const visibleTags = tagsExpanded ? tags : tags.slice(0, VISIBLE_TAG_COUNT);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <Card
      title="Content Quality Recommendations"
      subtitle={
        isPlaceholder
          ? "AI-powered recommendations aligned with your channel's target audience"
          : "AI-powered suggestions, generated from channel metrics & intelligence analysis"
      }
    >
      <div className="relative">
        {/* Hairline brand-gradient edge */}
        <div
          aria-hidden="true"
          className="absolute -top-4 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F2793D]/40 to-transparent"
        />

        <div className="space-y-3">
          {items.map((rec, index) => (
            <div
              key={rec.id ?? `${rec.category}-${index}`}
              className="group relative flex items-center gap-3.5 p-3.5 rounded-xl border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-surface-light transition-all duration-300 hover:border-[#F2793D]/35 hover:bg-surface-100 dark:hover:bg-dark-surface hover:shadow-sm overflow-hidden"
            >
              {/* Ambient brand glow on hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#F2793D]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />

              {/* Status Icon */}
              <div
                className={`relative p-2 rounded-lg border flex-shrink-0 ${statusColors[rec.status] || statusColors.warning}`}
              >
                {statusIcons[rec.status] || statusIcons.warning}
              </div>

              {/* Content row */}
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold tracking-tight text-text-primary dark:text-dark-text text-sm truncate">
                    {rec.category}
                  </h4>
                  <span
                    className="text-xs font-bold tabular-nums tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{
                      color: BRAND.coral,
                      backgroundColor: `${BRAND.coral}1A`,
                    }}
                  >
                    {rec.impact}
                  </span>
                </div>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-sm min-w-0">
                  <span className="text-text-muted dark:text-dark-text-muted text-xs truncate">
                    {rec.current}
                  </span>
                  <IoArrowForward
                    className="hidden sm:inline-block w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: BRAND.gold }}
                  />
                  <span className="text-text-primary dark:text-dark-text font-medium text-xs sm:text-sm truncate">
                    {rec.recommendation}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tags Suggestions */}
        <div className="mt-5 pt-5 border-t border-surface-300 dark:border-dark-border">
          <h4 className="font-semibold tracking-tight text-text-primary dark:text-dark-text mb-3 flex items-center gap-1.5 text-sm">
            <IoPricetagOutline className="w-4 h-4" style={{ color: BRAND.orange }} />
            Suggested High-Velocity Tags for Your Niche
          </h4>
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag, index) => (
              <button
                key={index}
                type="button"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full border transition-all duration-200 hover:-translate-y-px"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${BRAND.gold}14, ${BRAND.coral}14)`,
                  color: BRAND.orange,
                  borderColor: `${BRAND.orange}40`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = `linear-gradient(135deg, ${BRAND.gold}26, ${BRAND.coral}26)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = `linear-gradient(135deg, ${BRAND.gold}14, ${BRAND.coral}14)`;
                }}
              >
                {tag}
              </button>
            ))}
            {hiddenTagCount > 0 && (
              <button
                type="button"
                onClick={() => setTagsExpanded(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full border border-dashed border-surface-300 dark:border-dark-border text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text hover:border-surface-400 transition-colors"
              >
                +{hiddenTagCount} more
                <IoChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationCard;
