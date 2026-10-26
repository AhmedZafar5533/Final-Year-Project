import { memo, useState, useMemo, useCallback } from "react";
import {
  IoPlay,
  IoEye,
  IoHeart,
  IoTrendingUp,
  IoSearch,
  IoChevronUp,
  IoChevronDown,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { formatNumber, formatDate } from "../../utils/formatters";

const COLUMNS = [
  { key: "views", label: "Views", icon: IoEye },
  { key: "likes", label: "Likes", icon: IoHeart },
  { key: "engagementRate", label: "Engagement", icon: IoTrendingUp },
];

// Hoisted out of the component so it isn't re-created every render.
const SortIcon = ({ active, direction }) => {
  if (!active) {
    return (
      <IoChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30 transition-opacity" />
    );
  }
  return direction === "desc" ? (
    <IoChevronDown className="w-3.5 h-3.5 text-primary-900 dark:text-primary-400" />
  ) : (
    <IoChevronUp className="w-3.5 h-3.5 text-primary-900 dark:text-primary-400" />
  );
};

const engagementTone = (rate) => {
  if (rate >= 7)
    return "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 ring-1 ring-inset ring-success-600/10";
  if (rate >= 5)
    return "bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 ring-1 ring-inset ring-warning-600/10";
  return "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 ring-1 ring-inset ring-error-600/10";
};

const VideoTable = memo(({ videos = [], onSelectVideo }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "views", direction: "desc" });
  const [hoveredRow, setHoveredRow] = useState(null);

  const filteredAndSortedVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = query
      ? videos.filter((video) => video.title.toLowerCase().includes(query))
      : [...videos];

    const { key, direction } = sortConfig;
    const modifier = direction === "asc" ? 1 : -1;

    result.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (typeof aValue === "string") {
        return aValue.localeCompare(bValue) * modifier;
      }
      return (aValue - bValue) * modifier;
    });

    return result;
  }, [videos, searchQuery, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-400 dark:border-dark-border shadow-sm dark:shadow-black/20 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-300 dark:border-dark-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="panel-heading-icon">
              <IoPlay className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-text-primary dark:text-dark-text">
                Your videos
              </h3>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                {videos.length} video{videos.length === 1 ? "" : "s"} this period
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light dark:text-dark-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search videos"
              className="pl-10 pr-4 py-2.5 w-full sm:w-64 bg-surface-100 dark:bg-dark-surface-light border border-surface-400 dark:border-dark-border rounded-xl text-sm text-text-primary dark:text-dark-text placeholder:text-text-light dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary-900 dark:focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="md:hidden relative divide-y divide-surface-200 dark:divide-dark-border">
        <label className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-text-muted"><span>Sort videos</span>
          <select aria-label="Sort videos" value={sortConfig.key} onChange={event => setSortConfig({ key: event.target.value, direction: "desc" })} className="bg-transparent text-text-primary dark:text-dark-text rounded-md px-2 py-1">
            {COLUMNS.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
          </select>
        </label>
        {filteredAndSortedVideos.map(video => <button key={video.id} type="button" onClick={() => onSelectVideo?.(video)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-100 dark:hover:bg-dark-surface-light">
          <img src={video.thumbnail || video.thumbnailUrl} alt="" className="w-20 h-12 shrink-0 object-cover rounded-md bg-surface-200" />
          <span className="min-w-0"><span className="block text-sm font-medium leading-snug line-clamp-2 text-text-primary dark:text-dark-text">{video.title}</span><span className="block text-xs text-text-muted mt-2">{formatNumber(video.views)} views · {video.engagementRate}% engagement</span></span>
        </button>)}
        {!filteredAndSortedVideos.length && <p className="p-6 text-center text-sm text-text-muted">No videos match your search.</p>}
      </div>

      {/* Table */}
      <div className="relative hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-200 dark:bg-dark-surface-light">
              <th
                scope="col"
                className="text-left text-xs font-semibold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider px-6 py-3.5"
              >
                Video
              </th>
              {COLUMNS.map(({ key, label }) => (
                <th key={key} scope="col" className="px-6 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className="group flex items-center gap-1.5 text-xs font-semibold text-text-secondary dark:text-dark-text-muted uppercase tracking-wider hover:text-text-primary dark:hover:text-dark-text transition-colors"
                  >
                    {label}
                    <SortIcon active={sortConfig.key === key} direction={sortConfig.direction} />
                  </button>
                </th>
              ))}
              <th scope="col" className="px-6 py-3.5 w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedVideos.map((video, index) => (
              <tr
                key={video.id}
                onClick={() => onSelectVideo?.(video)}
                onMouseEnter={() => setHoveredRow(video.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`border-b border-surface-300 dark:border-dark-border last:border-b-0 transition-colors duration-150 cursor-pointer animate-fade-in ${
                  hoveredRow === video.id ? "bg-surface-100 dark:bg-dark-surface-light" : ""
                }`}
                style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
              >
                {/* Video Info */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-black/5">
                      <img
                        src={
                          video.thumbnail ||
                          video.thumbnailUrl ||
                          (video.id && !String(video.id).startsWith("vid") && !String(video.id).startsWith("video_")
                            ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
                            : "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=169&fit=crop")
                        }
                        alt={video.title || "Video thumbnail"}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const vId = video.id;
                          if (
                            vId &&
                            !String(vId).startsWith("vid") &&
                            !String(vId).startsWith("video_") &&
                            !e.target.src.includes("hqdefault.jpg")
                          ) {
                            e.target.src = `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
                          } else if (!e.target.src.includes("unsplash.com")) {
                            e.target.src =
                              "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=169&fit=crop";
                          } else {
                            e.target.onerror = null;
                          }
                        }}
                        className="w-20 h-12 object-cover"
                      />
                      <div
                        className={`absolute inset-0 bg-text-primary/50 dark:bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
                          hoveredRow === video.id ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <IoPlay className="w-6 h-6 text-white" />
                      </div>
                      {video.avgViewDuration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-text-primary/80 dark:bg-black/80 text-white text-[10px] font-medium leading-none rounded">
                          {video.avgViewDuration}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary dark:text-dark-text truncate max-w-[200px] lg:max-w-[300px]">
                        {video.title}
                      </p>
                      <p className="text-sm text-text-muted dark:text-dark-text-muted">
                        {formatDate(video.publishedAt)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Views */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <IoEye className="w-4 h-4 text-text-light dark:text-dark-text-muted" />
                    <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text">
                      {formatNumber(video.views)}
                    </span>
                  </div>
                </td>

                {/* Likes */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <IoHeart className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-dark-text">
                      {formatNumber(video.likes)}
                    </span>
                  </div>
                </td>

                {/* Engagement */}
                <td className="px-6 py-3.5">
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${engagementTone(
                      video.engagementRate,
                    )}`}
                  >
                    <IoTrendingUp className="w-3 h-3" />
                    <span className="tabular-nums">{video.engagementRate}%</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-3.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectVideo?.(video); }}
                    aria-label={`View details for ${video.title}`}
                    className="p-2 text-text-light dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text hover:bg-surface-200 dark:hover:bg-dark-surface-light rounded-lg transition-colors"
                  >
                    <IoChevronForwardOutline className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredAndSortedVideos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 px-6">
            <div className="p-3 rounded-full bg-surface-100 dark:bg-dark-surface-light mb-3">
              <IoSearch className="w-6 h-6 text-surface-400 dark:text-dark-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-primary dark:text-dark-text">
              No videos found
            </p>
            <p className="text-sm text-text-muted dark:text-dark-text-muted mt-0.5">
              Try a different search term.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredAndSortedVideos.length > 0 && (
        <div className="px-6 py-4 border-t border-surface-300 dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-100 dark:bg-dark-surface-light">
          <p className="text-sm text-text-muted dark:text-dark-text-muted">
            Showing {filteredAndSortedVideos.length} of {videos.length} videos
          </p>

        </div>
      )}
    </div>
  );
});

VideoTable.displayName = "VideoTable";

export default VideoTable;
