import { memo, useState } from "react";
import {
  IoTrendingUp,
  IoPeople,
  IoFlame,
  IoImage,
  IoTime,
  IoChevronForward,
  IoCheckmarkCircle,
  IoChevronDown,
} from "react-icons/io5";
import Button from "../common/Button";

const iconMap = {
  TrendingUp: IoTrendingUp,
  Users: IoPeople,
  Flame: IoFlame,
  Image: IoImage,
  Clock: IoTime,
};

// Priority now reads as a single colored dot + word, not a full pill —
// the dot on the icon already carries this at a glance; this is just the
// text fallback for anyone scanning left to right.
const priorityConfig = {
  High: { dotClass: "bg-error-500", text: "text-error-600 dark:text-error-400" },
  Medium: { dotClass: "bg-warning-500", text: "text-warning-600 dark:text-warning-400" },
  Low: { dotClass: "bg-surface-400 dark:bg-dark-border", text: "text-text-muted dark:text-dark-text-muted" },
};

const categoryConfig = {
  Performance: {
    bg: "bg-primary-100 dark:bg-primary-900/30",
    icon: "text-primary-600 dark:text-primary-400",
    glow: "bg-primary-500/10",
  },
  Audience: {
    bg: "bg-accent-100 dark:bg-accent-900/30",
    icon: "text-accent-600 dark:text-accent-400",
    glow: "bg-accent-500/10",
  },
  Trends: {
    bg: "bg-success-100 dark:bg-success-900/30",
    icon: "text-success-600 dark:text-success-400",
    glow: "bg-success-500/10",
  },
  Optimization: {
    bg: "bg-warning-100 dark:bg-warning-900/30",
    icon: "text-warning-600 dark:text-warning-400",
    glow: "bg-warning-500/10",
  },
};

const InsightCard = ({ insight, onApply, onDismiss, isApplied = false }) => {
  const Icon = iconMap[insight.icon] || IoTrendingUp;
  const priority = priorityConfig[insight.priority] || priorityConfig.Medium;
  const category = categoryConfig[insight.category] || categoryConfig.Performance;

  // Message starts clamped to two lines so a page of cards stays scannable;
  // "Read more" only appears if the text actually overflows that clamp.
  const [expanded, setExpanded] = useState(false);
  const isLongMessage = (insight.message || "").length > 110;

  return (
    <div
      className={`
      group relative rounded-2xl border transition-all duration-500 ease-out overflow-hidden
      ${
        isApplied
          ? "bg-success-50/50 dark:bg-success-900/10 border-success-200 dark:border-success-800"
          : "bg-surface-50 dark:bg-dark-surface border-surface-200 dark:border-dark-border hover:-translate-y-0.5 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
      }
    `}
    >
      {!isApplied && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full ${category.glow} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
        />
      )}

      {isApplied && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success-500 dark:bg-success-600 text-white rounded-full text-[11px] font-semibold tracking-wide shadow-sm shadow-success-500/30">
            <IoCheckmarkCircle className="w-3.5 h-3.5" />
            Applied
          </div>
        </div>
      )}

      <div className="relative p-5">
        {/* Header — icon, title, and a single compact meta line replace what
            used to be a priority pill + separator + category label. */}
        <div className="flex items-start gap-3.5 mb-2.5">
          <div className={`relative p-2.5 rounded-xl ${category.bg} flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
            <Icon className={`w-5 h-5 ${category.icon}`} />
            <span
              aria-hidden="true"
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-surface-50 dark:border-dark-surface ${priority.dotClass}`}
              title={`${insight.priority} priority`}
            />
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-semibold tracking-tight text-text-primary dark:text-dark-text text-base leading-snug">
              {insight.title}
            </h3>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-dark-text-muted">
              {insight.category}
              <span className={`mx-1.5 ${priority.text}`}>·</span>
              <span className={priority.text}>{insight.priority} priority</span>
            </p>
          </div>
        </div>

        {/* Message — clamped by default so five or six cards in a row don't
            read as a wall of text; only long ones get a "Read more" toggle. */}
        <p
          className={`text-sm text-text-secondary dark:text-dark-text-muted leading-relaxed ${
            !expanded && isLongMessage ? "line-clamp-2" : ""
          }`}
        >
          {insight.message}
        </p>
        {isLongMessage && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 flex items-center gap-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
            <IoChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        {/* Impact — now an inline chip sitting with the actions instead of
            its own full-width gradient banner, so it registers as a quick
            stat rather than another block of copy to read. */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-surface-200 dark:border-dark-border">
          {insight.impact && !isApplied && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700/50 rounded-full text-xs font-semibold text-success-700 dark:text-success-300">
              <IoTrendingUp className="w-3.5 h-3.5" />
              {insight.impact}
            </span>
          )}

          {!isApplied && insight.actionable && insight.actions && (
            <div className="flex items-center gap-2 ml-auto">
              {insight.actions[1] && (
                <Button variant="ghost" size="sm" onClick={() => onDismiss?.(insight)}>
                  {insight.actions[1]}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApply?.(insight)}
                rightIcon={
                  <IoChevronForward className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                }
              >
                {insight.actions[0]}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(InsightCard);
