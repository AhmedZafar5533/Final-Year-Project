import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import {
  IoEyeOutline,
  IoPeopleOutline,
  IoHeartOutline,
  IoTimeOutline,
  IoRefresh,
  IoCalendarOutline,
  IoChevronDown,
} from "react-icons/io5";
import { useAnalytics } from "../hooks/useAnalytics";
import MetricCard from "../components/dashboard/MetricCard";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import EngagementChart from "../components/dashboard/EngagementChart";
import VideoTable from "../components/dashboard/VideoTable";
import QuickInsights from "../components/dashboard/QuickInsights";
import PageHeader from "../components/common/PageHeader";
import VideoDeepDiveModal from "../components/dashboard/VideoDeepDiveModal";
import { DashboardSkeleton } from "../components/common/Loader";

const dateRanges = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last year", value: "1y" },
  { label: "All time", value: "all" },
];

const DateRangeSelector = memo(({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedLabel = useMemo(
    () => dateRanges.find((r) => r.value === value)?.label || "Custom",
    [value],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-surface text-text-primary dark:text-dark-text rounded-lg border border-surface-300 dark:border-dark-border hover:border-primary-400 transition-colors text-sm font-medium"
      >
        <IoCalendarOutline className="w-4 h-4 text-text-light" />
        <span>{selectedLabel}</span>
        <IoChevronDown
          className={`w-4 h-4 text-text-light transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-xl border border-surface-300 dark:border-dark-border shadow-lg z-20 py-1"
          >
            {dateRanges.map((range) => (
              <button
                key={range.value}
                type="button"
                role="menuitemradio"
                aria-checked={value === range.value}
                onClick={() => {
                  onChange(range.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === range.value
                    ? "bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-200 font-medium"
                    : "text-text-secondary dark:text-dark-text-muted hover:bg-surface-100 dark:hover:bg-dark-surface-light"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

DateRangeSelector.displayName = "DateRangeSelector";

const Dashboard = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { analytics, videos, isLoading, isRefreshing, refreshData, lastUpdated } =
    useAnalytics(dateRange);

  const metrics = useMemo(
    () => [
      {
        id: "views",
        title: dateRange === "all" ? "Total Views" : "Views",
        value: analytics?.totalViews || 0,
        change: analytics?.viewsChange || 0,
        icon: IoEyeOutline,
        iconBg: "bg-primary-600",
        sparklineColor: "#357462",
        sparklineData: analytics?.viewsSparkline,
      },
      {
        id: "subscribers",
        title: dateRange === "all" ? "Total Subscribers" : "Subscribers",
        value: analytics?.totalSubscribers || 0,
        change: analytics?.subscribersChange || 0,
        icon: IoPeopleOutline,
        iconBg: "bg-primary-600",
        sparklineColor: "#5b8c84",
        sparklineData: analytics?.subscribersSparkline,
      },
      {
        id: "engagement",
        title: "Engagement Rate",
        value: analytics?.engagementRate || 0,
        change: analytics?.engagementChange || 0,
        icon: IoHeartOutline,
        iconBg: "bg-primary-600",
        sparklineColor: "#85997a",
        format: "percentage",
        sparklineData: analytics?.engagementSparkline,
      },
      {
        id: "watchTime",
        title: "Watch Time",
        value: analytics?.watchTimeHours || 0,
        change: analytics?.watchTimeChange || 0,
        icon: IoTimeOutline,
        iconBg: "bg-primary-600",
        sparklineColor: "#a68a52",
        format: "hours",
        sparklineData: analytics?.watchTimeSparkline,
      },
    ],
    [analytics, dateRange],
  );

  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Overview" description="Your channel performance at a glance."
        actions={<>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="app-button-secondary" aria-label="Refresh data">
            <IoRefresh className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </>}
      />
      {analytics?.isDemo && <p className="section-note rounded-lg bg-surface-200/60 px-4 py-2.5">Sample data. Connect your YouTube channel in Settings to see your performance.</p>}
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.id} {...metric} index={index} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PerformanceChart data={analytics?.viewsOverTime || []} />
        </div>
        <div>
          <EngagementChart data={analytics?.engagementBreakdown || {}} />
        </div>
      </div>

      <QuickInsights analytics={analytics} videos={videos} />
      <VideoTable videos={videos} onSelectVideo={setSelectedVideo} />
      {lastUpdated && <p className="text-xs text-text-muted">Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}

      {/* Video Deep Dive Modal */}
      {selectedVideo && (
        <VideoDeepDiveModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
};

export default memo(Dashboard);
