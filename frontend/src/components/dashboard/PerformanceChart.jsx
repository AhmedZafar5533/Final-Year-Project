import { memo, useId, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { IoAnalytics, IoExpand, IoDownload } from "react-icons/io5";
import { useTheme } from "../../context/ThemeContext";

/** Joins conditional class fragments, skipping falsy values. */
const cx = (...parts) => parts.filter(Boolean).join(" ");

const CHART_TABS = [
  { id: "views", label: "Views", color: "#1e4d5e", darkColor: "#6366f1", dataKey: "views" },
  { id: "subscribers", label: "Subscribers", color: "#835CAA", darkColor: "#a78bfa", dataKey: "subscribers" },
  { id: "revenue", label: "Revenue", color: "#81837D", darkColor: "#94a3b8", dataKey: "revenue" },
];

const formatDateLabel = (date) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatAxisValue = (value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toLocaleString());

// ---------------------------------------------------------------------------

const CustomTooltip = memo(({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cx(
        "rounded-xl shadow-lg border p-4 min-w-[180px] motion-safe:animate-scale-in",
        isDark ? "bg-dark-surface border-dark-border" : "bg-white border-surface-300"
      )}
    >
      <p className={cx("text-sm font-semibold mb-2", isDark ? "text-dark-text" : "text-text-primary")}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey ?? entry.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className={cx("text-sm", isDark ? "text-dark-text-muted" : "text-text-muted")}>{entry.name}</span>
          </div>
          <span className={cx("text-sm font-bold", isDark ? "text-dark-text" : "text-text-primary")}>
            {entry.value?.toLocaleString?.() ?? entry.value}
          </span>
        </div>
      ))}
    </div>
  );
});

CustomTooltip.displayName = "CustomTooltip";

// ---------------------------------------------------------------------------

const IconButton = ({ icon: Icon, label, isDark, ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cx(
      "p-2 rounded-lg motion-safe:transition-all motion-safe:duration-200 active:scale-95",
      isDark
        ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
        : "text-text-muted hover:text-text-primary hover:bg-surface-300"
    )}
    {...props}
  >
    <Icon className="w-4 h-4" />
  </button>
);

// ---------------------------------------------------------------------------

const PerformanceChart = memo(({ data = [] }) => {
  const [activeTab, setActiveTab] = useState("views");
  const { isDark } = useTheme();
  const gradientId = useId();

  // A tab is only selectable if every point actually carries that metric —
  // no fabricating "subscribers" or "revenue" trends when the real values
  // weren't provided.
  const tabs = useMemo(
    () =>
      CHART_TABS.map((tab) => ({
        ...tab,
        available: data.length > 0 && data.every((item) => item[tab.dataKey] !== undefined && item[tab.dataKey] !== null),
      })),
    [data]
  );

  const activeConfig = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const activeColor = isDark ? activeConfig.darkColor : activeConfig.color;

  const formattedData = useMemo(
    () => data.map((item) => ({ ...item, name: formatDateLabel(item.date) })),
    [data]
  );

  const cardClass = isDark ? "bg-dark-surface border-dark-border shadow-black/20" : "bg-white border-surface-400";
  const textClass = isDark ? "text-dark-text" : "text-text-primary";
  const mutedClass = isDark ? "text-dark-text-muted" : "text-text-muted";

  return (
    <div className={cx("rounded-2xl border shadow-sm overflow-hidden", cardClass)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 pb-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-600 rounded-xl shadow-md">
            <IoAnalytics className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={cx("text-lg font-semibold", textClass)}>Performance Overview</h3>
            <p className={cx("text-sm", mutedClass)}>Track your growth over time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton icon={IoExpand} label="Expand chart" isDark={isDark} />
          <IconButton icon={IoDownload} label="Download data" isDark={isDark} />
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex items-center gap-1 px-6 mt-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabColor = isDark ? tab.darkColor : tab.color;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!tab.available}
              title={tab.available ? undefined : "No data for this metric yet"}
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                "relative px-4 py-2 text-sm font-medium rounded-lg motion-safe:transition-all motion-safe:duration-200",
                !tab.available && "opacity-40 cursor-not-allowed",
                isActive
                  ? "text-white"
                  : isDark
                    ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-200"
              )}
              style={{ backgroundColor: isActive ? tabColor : "transparent" }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="p-6 pt-4">
        <div className="h-[300px]">
          {!activeConfig.available ? (
            <div className={cx("h-full flex items-center justify-center text-sm", mutedClass)}>
              No {activeConfig.label.toLowerCase()} data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeColor} stopOpacity={isDark ? 0.3 : 0.2} />
                    <stop offset="100%" stopColor={activeColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#3d3d3d" : "#d5cecc"} vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#a1a1aa" : "#6b6370", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#a1a1aa" : "#6b6370", fontSize: 12 }}
                  tickFormatter={formatAxisValue}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey={activeConfig.dataKey}
                  name={activeConfig.label}
                  stroke={activeColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
});

PerformanceChart.displayName = "PerformanceChart";

export default PerformanceChart;
