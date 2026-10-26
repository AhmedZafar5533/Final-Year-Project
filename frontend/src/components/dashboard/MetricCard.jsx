import { memo, useId, useMemo } from "react";
import { IoArrowUp, IoArrowDown } from "react-icons/io5";
import { formatNumber, formatPercentage } from "../../utils/formatters";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

function formatValue(value, format) {
  if (value == null || Number.isNaN(value)) return "—";
  if (format === "percentage") return `${value}%`;
  if (format === "hours") return `${value >= 1000 ? `${(value / 1000).toFixed(1)}K` : formatNumber(value)} hrs`;
  return formatNumber(value);
}

const MetricCard = ({ title, value, change = 0, changeLabel = "vs previous period", icon: Icon, sparklineData, sparklineColor = "#357462", format = "number" }) => {
  const gradientId = useId();
  const positive = change > 0;
  const neutral = change === 0;
  const TrendIcon = positive ? IoArrowUp : IoArrowDown;
  const chartData = useMemo(() => Array.isArray(sparklineData) ? sparklineData.map(point => ({ value: typeof point === "number" ? point : 0 })) : [], [sparklineData]);
  return <div className="metric-card">
    <div className="flex items-center justify-between gap-2 text-text-muted">
      <p className="text-xs sm:text-sm font-medium">{title}</p>
      {Icon && <Icon className="w-4 h-4 shrink-0 opacity-70" aria-hidden="true" />}
    </div>
    <div className="flex items-end justify-between gap-2 mt-3">
      <p className="metric-value text-text-primary dark:text-dark-text">{formatValue(value, format)}</p>
      {!!chartData.length && <div className="hidden sm:block w-16 h-8 shrink-0 opacity-75" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={sparklineColor} stopOpacity={.18} /><stop offset="100%" stopColor={sparklineColor} stopOpacity={0} /></linearGradient></defs>
          <Area isAnimationActive={false} type="monotone" dataKey="value" stroke={sparklineColor} strokeWidth={1.8} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart></ResponsiveContainer>
      </div>}
    </div>
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-3 text-xs">
      <span className={`inline-flex items-center gap-1 font-medium ${neutral ? "text-text-muted" : positive ? "text-success-700 dark:text-success-300" : "text-error-700 dark:text-error-300"}`}>
        {!neutral && <TrendIcon className="w-3 h-3" aria-hidden="true" />}{neutral ? "No change" : formatPercentage(change)}
      </span>
      <span className="hidden sm:inline text-text-muted">{changeLabel}</span>
    </div>
  </div>;
};
export default memo(MetricCard);
