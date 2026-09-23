import { memo, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import {
  IoHeart,
  IoThumbsUp,
  IoChatbubble,
  IoShareSocial,
  IoStatsChartOutline,
} from "react-icons/io5";
import { useTheme } from "../../context/ThemeContext";

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const METRICS = {
  likes: { icon: IoThumbsUp, color: "#1e4d5e", darkColor: "#818cf8", light: "#fdf2f6", dark: "rgba(129, 140, 248, 0.18)" },
  comments: { icon: IoChatbubble, color: "#8f8a72", darkColor: "#c4b5fd", light: "#faf8fc", dark: "rgba(196, 181, 253, 0.18)" },
  shares: { icon: IoShareSocial, color: "#82591e", darkColor: "#fbbf24", light: "#f8f8f7", dark: "rgba(251, 191, 36, 0.18)" },
  saves: { icon: IoHeart, color: "#221726", darkColor: "#f472b6", light: "#f3f0ef", dark: "rgba(244, 114, 182, 0.18)" },
};
const FALLBACK_COLOR = "#c23372";

/** Joins conditional class fragments, skipping falsy values. */
const cx = (...parts) => parts.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------
// Active (hovered) wedge — soft lift + halo
// ---------------------------------------------------------------------------

const renderActiveShape = (props) => {
  const { cx: x, cy: y, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={x} cy={y} startAngle={startAngle} endAngle={endAngle}
        innerRadius={outerRadius + 10} outerRadius={outerRadius + 13}
        fill={fill} opacity={0.25}
      />
      <Sector
        cx={x} cy={y} startAngle={startAngle} endAngle={endAngle}
        innerRadius={innerRadius} outerRadius={outerRadius + 6}
        fill={fill} style={{ filter: "drop-shadow(0 6px 14px rgba(34, 23, 38, 0.2))" }}
      />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Legend row — icon swatch, label, and an animated share-of-total bar
// ---------------------------------------------------------------------------

const LegendRow = ({ item, percentage, isActive, isDark, onHover, onLeave }) => {
  const meta = METRICS[item.key];
  const Icon = meta?.icon ?? IoStatsChartOutline;
  const tint = isDark ? meta?.darkColor : meta?.color;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      aria-label={`${item.name}: ${percentage}% of engagement`}
      className={cx(
        "w-full text-left flex items-center gap-3 rounded-xl p-3 transition-colors motion-safe:duration-200",
        isActive ? (isDark ? "bg-dark-surface-light" : "bg-surface-200") : (isDark ? "hover:bg-dark-surface-light" : "hover:bg-surface-100")
      )}
    >
      <div className="shrink-0 p-2 rounded-lg" style={{ backgroundColor: isDark ? meta?.dark : meta?.light }}>
        <Icon className="w-4 h-4" style={{ color: tint || FALLBACK_COLOR }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cx("text-sm font-medium truncate", isDark ? "text-dark-text" : "text-text-primary")}>
            {item.name}
          </span>
          <span className={cx("text-xs tabular-nums shrink-0", isDark ? "text-dark-text-muted" : "text-text-muted")}>
            {percentage}%
          </span>
        </div>

        <div className={cx("mt-1.5 h-1 rounded-full overflow-hidden", isDark ? "bg-dark-border" : "bg-surface-200")}>
          <div
            className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
            style={{ width: `${percentage}%`, backgroundColor: tint || FALLBACK_COLOR }}
          />
        </div>
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const EngagementChart = memo(({ data }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const { isDark } = useTheme();

  const chartData = useMemo(
    () =>
      data
        ? Object.entries(data).map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value,
            key,
          }))
        : [],
    [data]
  );

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);
  const active = activeIndex !== null ? chartData[activeIndex] : null;

  const cardClass = isDark ? "bg-dark-surface border-dark-border shadow-black/20" : "bg-white border-surface-400";
  const textClass = isDark ? "text-dark-text" : "text-text-primary";
  const mutedClass = isDark ? "text-dark-text-muted" : "text-text-muted";

  return (
    <div className={cx("rounded-2xl border shadow-sm p-6 h-full", cardClass)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-accent-700 rounded-xl shadow-md">
          <IoStatsChartOutline className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className={cx("text-lg font-semibold", textClass)}>Engagement Mix</h3>
          <p className={cx("text-sm", mutedClass)}>How users interact</p>
        </div>
      </div>

      {total === 0 ? (
        <p className={cx("text-sm text-center py-16", mutedClass)}>No engagement data yet.</p>
      ) : (
        <>
          {/* Donut chart */}
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  cornerRadius={6}
                  paddingAngle={4}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={isDark ? METRICS[entry.key]?.darkColor ?? FALLBACK_COLOR : METRICS[entry.key]?.color ?? FALLBACK_COLOR}
                      stroke={isDark ? "#1c1c28" : "#ffffff"}
                      strokeWidth={2}
                      className="cursor-pointer motion-safe:transition-opacity"
                      opacity={active && active.key !== entry.key ? 0.45 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className={cx("text-2xl font-bold tabular-nums", textClass)}>
                {(active ? active.value : total).toLocaleString()}
              </p>
              <p className={cx("text-xs", mutedClass)}>{active ? active.name : "Total"}</p>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1 mt-6">
            {chartData.map((item, index) => (
              <LegendRow
                key={item.key}
                item={item}
                percentage={((item.value / total) * 100).toFixed(1)}
                isActive={activeIndex === index}
                isDark={isDark}
                onHover={() => setActiveIndex(index)}
                onLeave={() => setActiveIndex(null)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

EngagementChart.displayName = "EngagementChart";

export default EngagementChart;
