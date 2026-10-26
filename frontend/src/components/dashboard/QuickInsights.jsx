import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { IoArrowForward, IoCalendarOutline, IoPlayOutline } from "react-icons/io5";
import { formatNumber } from "../../utils/formatters";

function QuickInsights({ analytics, videos = [] }) {
  const bestDay = useMemo(() => {
    const days = {};
    for (const item of analytics?.viewsOverTime || []) {
      if (!item.date || Number.isNaN(new Date(item.date).getTime())) continue;
      const day = new Date(item.date).toLocaleDateString(undefined, { weekday: "long" });
      days[day] ||= { total: 0, count: 0 };
      days[day].total += item.views || 0; days[day].count += 1;
    }
    return Object.entries(days).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0]?.[0];
  }, [analytics]);
  const topVideo = videos[0];
  if (!bestDay && !topVideo) return null;
  return <section aria-label="Performance highlights" className="app-panel !py-4">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 min-w-0">
        {bestDay && <div className="flex items-start gap-3 text-sm min-w-0"><IoCalendarOutline className="w-4 h-4 mt-1 shrink-0 text-text-muted" /><div><p className="text-xs text-text-muted mb-1">Strongest day</p><p className="font-medium">{bestDay}<span className="font-normal text-text-muted"> · average daily views</span></p></div></div>}
        {topVideo && <div className="flex items-start gap-3 text-sm min-w-0"><IoPlayOutline className="w-4 h-4 mt-1 shrink-0 text-text-muted" /><div className="min-w-0"><p className="text-xs text-text-muted mb-1">Top video · {formatNumber(topVideo.views)} views</p><p className="font-medium line-clamp-1">{topVideo.title}</p></div></div>}
      </div>
      <Link to="/insights" className="app-button-quiet self-start xl:self-center shrink-0">Explore ideas <IoArrowForward /></Link>
    </div>
  </section>;
}
export default memo(QuickInsights);
