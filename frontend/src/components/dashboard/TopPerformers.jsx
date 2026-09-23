import { memo, useCallback, useState } from "react";
import { IoPlayCircle, IoTrendingUp, IoFlame, IoImage } from "react-icons/io5";
import { formatNumber } from "../../utils/formatters";
import Card from "../common/Card";

const RANK_STYLES = [
  "bg-warning-500 text-white",
  "bg-secondary-400 dark:bg-secondary-600 text-white",
  "bg-warning-600 text-white",
];
const RANK_STYLE_DEFAULT =
  "bg-surface-200 dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted";

const VideoThumbnail = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-200 dark:bg-dark-surface-light flex items-center justify-center">
        <IoImage
          className="w-5 h-5 text-surface-400 dark:text-dark-text-muted"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0">
      <img
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-text-primary/30 dark:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
        <IoPlayCircle className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
    </div>
  );
};

const VideoRow = ({ video, rank, onSelect }) => {
  const handleActivate = useCallback(() => {
    onSelect?.(video);
  }, [onSelect, video]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate]
  );

  const isInteractive = Boolean(onSelect);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleActivate : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 group ${
        isInteractive
          ? "hover:bg-surface-200 dark:hover:bg-dark-surface-light cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          : ""
      }`}
    >
      {/* Rank */}
      <div
        aria-hidden="true"
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
          RANK_STYLES[rank] ?? RANK_STYLE_DEFAULT
        }`}
      >
        {rank + 1}
      </div>

      <VideoThumbnail src={video.thumbnail} alt={video.title} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary dark:text-dark-text truncate group-hover:text-primary-900 dark:group-hover:text-primary-400 transition-colors">
          {video.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted dark:text-dark-text-muted">
            {formatNumber(video.views)} views
          </span>
          {video.engagementRate >= 7 && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-success-600 dark:text-success-400">
              <IoTrendingUp className="w-3 h-3" aria-hidden="true" />
              {video.engagementRate}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const TopPerformers = ({ videos = [], onSelectVideo, onViewAll }) => {
  const topVideos = videos.slice(0, 5);

  if (topVideos.length === 0) {
    return (
      <Card title="Top Performers" subtitle="This week's best content">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <IoPlayCircle
            className="w-12 h-12 text-surface-400 dark:text-dark-text-muted mb-3"
            aria-hidden="true"
          />
          <p className="text-text-muted dark:text-dark-text-muted">
            No videos to display
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Top Performers"
      subtitle="This week's best content"
      headerAction={
        <span className="flex items-center gap-1 text-xs font-semibold text-warning-700 dark:text-warning-400 bg-warning-100 dark:bg-warning-900/30 px-2.5 py-1 rounded-full">
          <IoFlame className="w-3 h-3" aria-hidden="true" />
          Hot
        </span>
      }
    >
      <div className="space-y-1">
        {topVideos.map((video, index) => (
          <VideoRow
            key={video.id ?? `${video.title}-${index}`}
            video={video}
            rank={index}
            onSelect={onSelectVideo}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        disabled={!onViewAll}
        className="w-full mt-4 py-2.5 text-sm font-semibold text-primary-900 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        View All Videos →
      </button>
    </Card>
  );
};

export default memo(TopPerformers);
