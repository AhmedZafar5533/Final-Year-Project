import { useState, useMemo, useCallback, memo } from "react";
import {
  IoEyeOutline,
  IoPeopleOutline,
  IoHeartOutline,
  IoTimeOutline,
  IoRefresh,
  IoSparkles,
  IoCalendarOutline,
  IoChevronDown,
} from "react-icons/io5";
import { useAnalytics } from "../hooks/useAnalytics";
import MetricCard from "../components/dashboard/MetricCard";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import EngagementChart from "../components/dashboard/EngagementChart";
import VideoTable from "../components/dashboard/VideoTable";
import QuickInsights from "../components/dashboard/QuickInsights";
import TopPerformers from "../components/dashboard/TopPerformers";
import VideoDeepDiveModal from "../components/dashboard/VideoDeepDiveModal";
import { DashboardSkeleton } from "../components/common/Loader";

const dateRanges = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last year", value: "1y" },
  { label: "All time", value: "all" },
];

const Dashboard = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { analytics, videos, isLoading, refreshData, lastUpdated } =
    useAnalytics(dateRange);

  const metrics = useMemo(
    () => [
      {
        id: "views",
        title: "Total Views",
        value: analytics?.totalViews || 0,
        change: analytics?.viewsChange || 0,
        icon: IoEyeOutline,
        iconBg: "bg-primary-600",
        sparklineColor: "#662843",
        sparklineData: analytics?.viewsSparkline,
      },
      {
        id: "subscribers",
        title: "Subscribers",
        value: analytics?.totalSubscribers || 0,
        change: analytics?.subscribersChange || 0,
        icon: IoPeopleOutline,
        iconBg: "bg-accent-700",
        sparklineColor: "#835CAA",
        sparklineData: analytics?.subscribersSparkline,
      },
      {
        id: "engagement",
        title: "Engagement Rate",
        value: analytics?.engagementRate || 0,
        change: analytics?.engagementChange || 0,
        icon: IoHeartOutline,
        iconBg: "bg-secondary-600",
        sparklineColor: "#81837D",
        format: "percentage",
        sparklineData: analytics?.engagementSparkline,
      },
      {
        id: "watchTime",
        title: "Watch Time",
        value: analytics?.watchTimeHours || 0,
        change: analytics?.watchTimeChange || 0,
        icon: IoTimeOutline,
        iconBg: "bg-warning-600",
        sparklineColor: "#d97706",
        format: "hours",
        sparklineData: analytics?.watchTimeSparkline,
      },
    ],
    [analytics]
  );

  const selectedDateRangeLabel = useMemo(
    () => dateRanges.find((r) => r.value === dateRange)?.label || "Custom",
    [dateRange]
  );

  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
    setIsDatePickerOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 lg:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-surface-card rounded-2xl p-6 lg:p-8 border border-surface-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-text-heading tracking-tight">
                Analytics Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-150 text-primary-800">
                <IoSparkles className="w-3 h-3" />
                Live
              </span>
            </div>
            <p className="text-sm text-text-light">
              Track your channel performance, audience engagement, and content insights
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface-base text-text-heading rounded-xl border border-surface-border hover:border-primary-400 transition-colors text-sm font-medium shadow-sm"
              >
                <IoCalendarOutline className="w-4 h-4 text-text-light" />
                <span>{selectedDateRangeLabel}</span>
                <IoChevronDown
                  className={`w-4 h-4 text-text-light transition-transform duration-200 ${
                    isDatePickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDatePickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDatePickerOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-surface-card rounded-xl border border-surface-border shadow-lg z-20 py-1 divide-y divide-surface-border">
                    <div className="py-1">
                      {dateRanges.map((range) => (
                        <button
                          key={range.value}
                          onClick={() => handleDateRangeChange(range.value)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            dateRange === range.value
                              ? "bg-primary-150 text-primary-800 font-medium"
                              : "text-text-body hover:bg-surface-base"
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-800 hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <IoRefresh className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <p className="mt-3 text-xs text-text-light">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Quick Insights Banner */}
      <QuickInsights analytics={analytics} />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
          <EngagementChart data={analytics?.engagementOverTime || []} />
        </div>
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VideoTable videos={videos} onSelectVideo={setSelectedVideo} />
        </div>
        <div>
          <TopPerformers videos={videos?.slice(0, 5)} onSelectVideo={setSelectedVideo} />
        </div>
      </div>

      {/* Video Deep Dive Modal */}
      {selectedVideo && (
        <VideoDeepDiveModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};

export default memo(Dashboard);
