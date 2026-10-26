import { createElement, useState, useEffect, useMemo, memo } from "react";
import {
  IoPeople,
  IoMale,
  IoFemale,
  IoGlobe,
  IoPhonePortrait,
  IoDesktop,
  IoTabletPortrait,
  IoTv,
  IoTrendingUp,
  IoArrowUp,
  IoStatsChart,
  IoEarth,
  IoSparkles,
} from "react-icons/io5";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Sector,
} from "recharts";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";
import { formatNumber } from "../utils/formatters";
import { DashboardSkeleton } from "../components/common/Loader";
import analyticsService from "../services/analyticsService";

const COLORS = {
  primary: "#357462",
  accent: "#89a896",
  secondary: "#81837D",
  dark: "#18332f",
  success: "#c4aa72",
  warning: "#F59E0B",
  cyan: "#89a896",
};

const CHART_COLORS = [
  "#357462",
  "#89a896",
  "#c4aa72",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
];

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="metric-card"><div className="flex items-center justify-between gap-2 text-text-muted"><span className="text-xs sm:text-sm">{label}</span>{createElement(Icon, { className: "w-4 h-4 shrink-0" })}</div><p className="metric-value mt-3">{value}</p></div>
);

const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-text-primary dark:bg-dark-elevated text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 dark:border-dark-border backdrop-blur-xl">
      {label && (
        <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
      )}
      <p className="text-xl font-bold">{payload[0].value}%</p>
    </div>
  );
});

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 8px 16px rgba(30, 77, 94, 0.3))" }}
      />
    </g>
  );
};

const Audience = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [activeGenderIndex, setActiveGenderIndex] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [demographics, metrics] = await Promise.all([analyticsService.getDemographics(), analyticsService.getOverview()]);
        setData(demographics);
        setOverview(metrics);
      } catch (error) {
        console.error("Failed to load audience data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const deviceIcons = useMemo(
    () => ({
      Mobile: IoPhonePortrait,
      Desktop: IoDesktop,
      Tablet: IoTabletPortrait,
      TV: IoTv,
    }),
    [],
  );

  const deviceGradients = useMemo(
    () => ({
      Mobile: "bg-gradient-to-br from-accent-900 to-accent-700",
      Desktop: "bg-gradient-to-br from-primary-700 to-primary-600",
      Tablet: "bg-gradient-to-br from-secondary-500 to-secondary-700",
      TV: "bg-gradient-to-br from-dark-800 to-dark-900",
    }),
    [],
  );

  const [viewsOverTime, setViewsOverTime] = useState([]);

  useEffect(() => {
    const loadViewsOverTime = async () => {
      try {
        const views = await analyticsService.getViewsOverTime();
        setViewsOverTime(views);
      } catch (error) {
        console.error("Failed to load views over time:", error);
      }
    };
    loadViewsOverTime();
  }, []);

  const subscriberData = useMemo(() => {
    return viewsOverTime.filter(item => Number.isFinite(item.subscribers)).map(item => ({ date: item.date, subscribers: item.subscribers }));
  }, [viewsOverTime]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Audience" description="Get to know the people watching your videos." />
      {overview?.isDemo && <p className="section-note rounded-lg bg-surface-200/60 px-4 py-2.5">Sample audience data. Connect your channel for your own audience breakdown.</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={IoPeople} label="Subscribers" value={overview ? formatNumber(overview.totalSubscribers) : "—"} />
        <StatCard icon={IoMale} label="Male viewers" value={data?.gender?.find(item => item.type?.toLowerCase() === "male")?.percentage != null ? `${data.gender.find(item => item.type?.toLowerCase() === "male").percentage}%` : "—"} />
        <StatCard icon={IoFemale} label="Female viewers" value={data?.gender?.find(item => item.type?.toLowerCase() === "female")?.percentage != null ? `${data.gender.find(item => item.type?.toLowerCase() === "female").percentage}%` : "—"} />
        <StatCard icon={IoGlobe} label="Countries in sample" value={data?.topCountries?.length || "—"} />
      </div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Age groups */}
        <div className="bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-surface-200 dark:border-dark-border">
            <div className="panel-heading-icon">
              <IoStatsChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text">
                Age groups
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                Share of viewers by age
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.ageGroups || []}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#3a7d94" />
                      <stop offset="100%" stopColor="#3a7d94" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-surface-300)"
                    horizontal
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="range"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "var(--color-text-primary)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                    width={50}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(30, 77, 94, 0.05)" }}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="url(#barGradient)"
                    radius={[0, 8, 8, 0]}
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gender Split */}
        <div className="bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-surface-200 dark:border-dark-border">
            <div className="p-2.5 bg-secondary-600 rounded-xl shadow-md">
              <IoPeople className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text">
                Gender
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                Share of viewers by gender
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.gender || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="percentage"
                    nameKey="type"
                    stroke="none"
                    activeIndex={activeGenderIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveGenderIndex(index)}
                    onMouseLeave={() => setActiveGenderIndex(null)}
                  >
                    {(data?.gender || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-6 mt-4">
              {(data?.gender || []).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-dark-surface-light hover:bg-surface-200 dark:hover:bg-dark-border transition-colors cursor-pointer"
                  onMouseEnter={() => setActiveGenderIndex(index)}
                  onMouseLeave={() => setActiveGenderIndex(null)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index] }}
                  />
                  <span className="text-sm text-text-secondary dark:text-dark-text-muted">
                    {item.type}:{" "}
                    <span className="font-bold text-text-primary dark:text-dark-text">
                      {item.percentage}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top countries */}
        <div className="bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-surface-200 dark:border-dark-border">
            <div className="p-2.5 bg-gradient-to-br from-success-500 to-cyan-500 rounded-xl shadow-md">
              <IoEarth className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text">
                Top countries
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                Geographic distribution
              </p>
            </div>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {(data?.topCountries || []).slice(0, 5).map((country, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`
                        w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm shrink-0
                        ${
                          index === 0
                            ? "bg-gradient-to-br from-warning-400 to-warning-500 text-white"
                            : index === 1
                              ? "bg-gradient-to-br from-secondary-300 to-secondary-400 text-white"
                              : index === 2
                                ? "bg-gradient-to-br from-warning-600 to-warning-700 text-white"
                                : "bg-surface-200 dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted"
                        }
                      `}
                    >
                      {index + 1}
                    </span>
                    <span className="font-semibold text-text-primary dark:text-dark-text group-hover:text-primary-900 dark:group-hover:text-primary-400 transition-colors truncate">
                      {country.country}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-text-primary dark:text-dark-text bg-surface-100 dark:bg-dark-surface-light px-3 py-1 rounded-full flex-shrink-0">
                    {country.percentage}%
                  </span>
                </div>
                <div className="h-2.5 bg-surface-200 dark:bg-dark-surface-light rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${country.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-surface-200 dark:border-dark-border">
            <div className="p-2.5 bg-accent-600 rounded-xl shadow-md">
              <IoDesktop className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text">
                Devices
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                How viewers watch your content
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(data?.devices || []).map((device, index) => {
                const Icon = deviceIcons[device.type] || IoDesktop;
                const gradient =
                  deviceGradients[device.type] ||
                  "bg-gradient-to-br from-primary-900 to-accent-700";
                return (
                  <div
                    key={index}
                    className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-br from-surface-50 to-surface-100 dark:from-dark-surface dark:to-dark-surface-light rounded-2xl border border-surface-200 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-surface-200 dark:bg-dark-border rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                    <div className="relative">
                      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                        <div
                          className={`p-2.5 sm:p-3 rounded-xl ${gradient} shadow-lg group-hover:scale-110 transition-transform shrink-0`}
                        >
                          {createElement(Icon, { className: "w-4 h-4 sm:w-5 sm:h-5 text-white" })}
                        </div>
                        <span className="font-semibold text-text-primary dark:text-dark-text truncate">
                          {device.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-dark-text">
                          {device.percentage}%
                        </span>
                        <span className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                          of views
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber Growth */}
      <div className="bg-surface-50 dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-surface-200 dark:border-dark-border gap-4">
          <div className="flex items-center gap-3">
            <div className="panel-heading-icon">
              <IoTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary dark:text-dark-text">
                Subscriber activity
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                Daily net subscriber change
              </p>
            </div>
          </div>

        </div>
        <div className="p-6">
          <div className="h-80">
            {!subscriberData.length && <p className="text-sm text-text-muted">No subscriber activity available yet.</p>}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={subscriberData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a7d94" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#3a7d94" stopOpacity={0.1} />
                    <stop
                      offset="100%"
                      stopColor="#1e4d5e"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-surface-300)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-text-primary dark:bg-dark-elevated text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 dark:border-dark-border">
                          <p className="text-sm text-white/70">
                            {new Date(
                              payload[0].payload.date,
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-xl font-bold">
                            {payload[0].value.toLocaleString()} subscribers
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#1e4d5e"
                  strokeWidth={3}
                  fill="url(#subGradient)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    strokeWidth: 3,
                    stroke: "#fff",
                    fill: "#1e4d5e",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Audience);
