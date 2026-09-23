import { memo, useId, useMemo } from "react";
import { IoArrowUp, IoArrowDown } from "react-icons/io5";
import { formatNumber, formatPercentage } from "../../utils/formatters";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/** Joins conditional class fragments, skipping falsy values. */
const cx = (...parts) => parts.filter(Boolean).join(" ");

const formatValue = (value, format) => {
  if (format === "percentage") return `${value}%`;
  if (format === "hours") return `${(value / 1000).toFixed(1)}K hrs`;
  return formatNumber(value);
};

/**
 * Builds sparkline points from real data. When none is supplied, falls back
 * to a flat, muted line rather than fabricating a fake trend — an empty
 * sparkline is honest; an invented upward curve is not.
 */
const buildSparklineData = (sparklineData, value) => {
  if (Array.isArray(sparklineData) && sparklineData.length > 0) {
    return sparklineData.map((v) => ({ value: typeof v === "number" ? v : 0 }));
  }
  const flat = typeof value === "number" ? value : 0;
  return Array.from({ length: 7 }, () => ({ value: flat }));
};

const MetricCard = ({
  title,
  value,
  change = 0,
  changeLabel = "vs last period",
  icon: Icon,
  iconBg = "bg-primary-900",
  sparklineData,
  sparklineColor = "#662843",
  format = "number",
  index = 0,
}) => {
  const gradientId = useId();
  const isNeutral = change === 0;
  const isPositive = change > 0;
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length > 0;

  const formattedValue = useMemo(() => formatValue(value, format), [value, format]);
  const chartData = useMemo(() => buildSparklineData(sparklineData, value), [sparklineData, value]);

  const trend = isNeutral
    ? { label: "No change", className: "bg-surface-200 dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted" }
    : {
        label: formatPercentage(Math.abs(change)),
        Icon: isPositive ? IoArrowUp : IoArrowDown,
        className: isPositive
          ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
          : "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400",
      };

  return (
    <div
      className="relative overflow-hidden bg-white dark:bg-dark-surface rounded-2xl p-6 border border-surface-400 dark:border-dark-border shadow-sm hover:shadow-md dark:hover:shadow-black/30 motion-safe:hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-300 motion-safe:animate-fade-in group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Background decoration */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-surface-200 dark:bg-dark-surface-light opacity-50 motion-safe:group-hover:scale-150 motion-safe:transition-transform motion-safe:duration-500" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-muted dark:text-dark-text-muted mb-1 truncate">
              {title}
            </p>
            <h3 className="text-2xl lg:text-3xl font-bold text-text-primary dark:text-dark-text font-mono tracking-tight tabular-nums">
              {formattedValue}
            </h3>
          </div>

          {Icon && (
            <div className={cx("p-3 rounded-xl shadow-md shrink-0", iconBg)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cx("flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold shrink-0", trend.className)}>
              {trend.Icon && <trend.Icon className="w-3.5 h-3.5" />}
              <span>{trend.label}</span>
            </div>
            <span className="text-xs text-text-light dark:text-dark-text-muted hidden sm:inline truncate">
              {changeLabel}
            </span>
          </div>

          {/* Sparkline */}
          <div className={cx("w-20 h-10 shrink-0", hasSparkline ? "opacity-80" : "opacity-40")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MetricCard);
