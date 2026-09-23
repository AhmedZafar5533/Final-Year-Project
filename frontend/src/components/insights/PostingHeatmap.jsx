import { useState, useMemo } from "react";
import {
  IoFlagOutline,
  IoFlame,
  IoThumbsUpOutline,
  IoStatsChartOutline,
  IoTimeOutline,
} from "react-icons/io5";
import Card from "../common/Card";
import { DAYS_OF_WEEK } from "../../utils/constants";
import { useTheme } from "../../context/ThemeContext";

const PostingHeatmap = ({ data = [] }) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const { isDark } = useTheme();

  // Generate 24 hours labels
  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const hour = i % 12 || 12;
        const ampm = i < 12 ? "AM" : "PM";
        return `${hour}${ampm}`;
      }),
    [],
  );

  // Generate stable sample data using useMemo with deterministic values
  const heatmapData = useMemo(() => {
    if (data.length > 0) {
      return data;
    }

    // Generate deterministic sample data based on hour and day indices
    // This creates a realistic pattern where certain times are better than others
    return Array.from({ length: 24 }, (_, hourIndex) => {
      return Array.from({ length: 7 }, (_, dayIndex) => {
        // Create a pattern: higher engagement during evening hours (6-10 PM)
        // and on weekends, lower during early morning
        const isEvening = hourIndex >= 18 && hourIndex <= 22;
        const isAfternoon = hourIndex >= 12 && hourIndex <= 17;
        const isMorning = hourIndex >= 8 && hourIndex <= 11;
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        const isMidweek = dayIndex >= 2 && dayIndex <= 4;

        let baseValue = 20;

        if (isEvening) {
          baseValue = 70;
        } else if (isAfternoon) {
          baseValue = 50;
        } else if (isMorning) {
          baseValue = 40;
        }

        if (isWeekend && isEvening) {
          baseValue += 20;
        } else if (isMidweek && isEvening) {
          baseValue += 10;
        }

        // Add some deterministic variation using hour and day indices
        const variation = ((hourIndex * 7 + dayIndex * 13) % 20) - 10;
        const finalValue = Math.max(5, Math.min(100, baseValue + variation));

        return finalValue;
      });
    });
  }, [data]);

  // Get color based on value - using primary/accent/success palette
  const getColor = (value) => {
    // High engagement (80-100) - Primary color (Deep Ocean Teal)
    if (value >= 80) {
      return isDark ? "bg-primary-500" : "bg-primary-600";
    }
    // Good engagement (60-79) - Primary lighter
    if (value >= 60) {
      return isDark ? "bg-primary-600" : "bg-primary-400";
    }
    // Moderate engagement (40-59) - Accent color (Burnished Gold)
    if (value >= 40) {
      return isDark ? "bg-accent-600" : "bg-accent-400";
    }
    // Low engagement (20-39) - Secondary (Warm Stone)
    if (value >= 20) {
      return isDark ? "bg-secondary-700" : "bg-secondary-300";
    }
    // Very low engagement (0-19) - Surface colors
    return isDark ? "bg-dark-surface-light" : "bg-surface-200";
  };

  // Get text color for engagement value display
  const getValueColor = (value) => {
    if (value >= 80) return isDark ? "text-primary-300" : "text-primary-600";
    if (value >= 60) return isDark ? "text-primary-400" : "text-primary-500";
    if (value >= 40) return isDark ? "text-accent-400" : "text-accent-600";
    return isDark ? "text-secondary-400" : "text-secondary-600";
  };

  // Find best posting times
  const bestTimes = useMemo(() => {
    const times = [];
    heatmapData.forEach((hourData, hourIndex) => {
      hourData.forEach((value, dayIndex) => {
        if (value >= 80) {
          times.push({
            day: DAYS_OF_WEEK[dayIndex],
            hour: hours[hourIndex],
            value,
          });
        }
      });
    });
    // Sort by value descending
    return times.sort((a, b) => b.value - a.value);
  }, [heatmapData, hours]);

  // Get display hours (every 2 hours for cleaner UI)
  const displayHours = useMemo(() => {
    return heatmapData
      .map((hourData, index) => ({ hourData, index }))
      .filter((_, i) => i % 2 === 0);
  }, [heatmapData]);

  const selectedStatus = selectedCell
    ? selectedCell.value >= 80
      ? {
          Icon: IoFlame,
          text: "Excellent time to post — high audience activity expected.",
        }
      : selectedCell.value >= 60
        ? {
            Icon: IoThumbsUpOutline,
            text: "Good engagement expected. Solid choice for posting.",
          }
        : selectedCell.value >= 40
          ? {
              Icon: IoStatsChartOutline,
              text: "Moderate engagement. Consider peak hours for better reach.",
            }
          : {
              Icon: IoTimeOutline,
              text: "Lower engagement period. Try evening or weekend slots.",
            }
    : null;

  return (
    <Card
      title="Best Posting Times"
      subtitle="Engagement levels by day and hour"
    >
      <div className="overflow-x-auto pb-2">
        {/* Heatmap Grid */}
        <div style={{ minWidth: "500px" }}>
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-1 mb-2.5">
            <div className="w-14" /> {/* Spacer for hours column */}
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className={`text-center text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-dark-text-muted" : "text-text-muted"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Hour Rows */}
          <div className="space-y-1">
            {displayHours.map(({ hourData, index: actualHourIndex }) => (
              <div
                key={actualHourIndex}
                className="grid grid-cols-8 gap-1 items-center"
              >
                {/* Hour Label */}
                <div
                  className={`w-14 text-xs text-right pr-2 font-medium tabular-nums ${
                    isDark ? "text-dark-text-muted" : "text-text-light"
                  }`}
                >
                  {hours[actualHourIndex]}
                </div>

                {/* Day Cells */}
                {hourData.map((value, dayIndex) => {
                  const isSelected =
                    selectedCell?.hour === actualHourIndex &&
                    selectedCell?.day === dayIndex;
                  const isHovered =
                    hoveredCell?.hour === actualHourIndex &&
                    hoveredCell?.day === dayIndex;

                  return (
                    <div
                      key={dayIndex}
                      className="relative"
                      onMouseEnter={() =>
                        setHoveredCell({
                          hour: actualHourIndex,
                          day: dayIndex,
                          value,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <button
                        onClick={() =>
                          setSelectedCell({
                            hour: actualHourIndex,
                            day: dayIndex,
                            value,
                          })
                        }
                        className={`
                          w-full h-8 rounded-md transition-all duration-200 ease-out
                          ${getColor(value)}
                          ${isSelected ? "ring-2 ring-accent-500 ring-offset-2" : ""}
                          ${isHovered && !isSelected ? "scale-110 shadow-lg z-10" : ""}
                          hover:opacity-90
                        `}
                        style={{
                          ringOffsetColor: isDark ? "#1e1e1e" : "#f0efe6",
                        }}
                        aria-label={`${DAYS_OF_WEEK[dayIndex]} ${hours[actualHourIndex]}: ${value}% engagement`}
                        aria-pressed={isSelected}
                      />

                      {/* Inline Tooltip */}
                      {isHovered && (
                        <div
                          className={`
                            absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50
                            px-3 py-2 text-xs font-medium rounded-lg shadow-xl
                            whitespace-nowrap pointer-events-none border
                            animate-fade-in
                            ${
                              isDark
                                ? "bg-dark-elevated text-dark-text border-dark-border"
                                : "bg-white text-text-primary border-surface-300 shadow-surface-400/20"
                            }
                          `}
                        >
                          <div className="font-semibold tracking-tight">
                            {DAYS_OF_WEEK[dayIndex]} {hours[actualHourIndex]}
                          </div>
                          <div className={`tabular-nums ${getValueColor(value)}`}>
                            {value}% engagement
                          </div>
                          {/* Arrow */}
                          <div
                            className={`
                              absolute top-full left-1/2 -translate-x-1/2 -mt-px
                              w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px]
                              border-l-transparent border-r-transparent
                              ${isDark ? "border-t-dark-elevated" : "border-t-white"}
                            `}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        className={`flex items-center justify-between mt-6 pt-4 border-t ${
          isDark ? "border-dark-border" : "border-surface-300"
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
          >
            Engagement
          </span>
          <div className="flex items-center gap-3">
            {/* Low */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-3.5 rounded-sm ${isDark ? "bg-dark-surface-light" : "bg-surface-200"}`}
              />
              <span
                className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-light"}`}
              >
                Low
              </span>
            </div>
            {/* Medium */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-3.5 rounded-sm ${isDark ? "bg-accent-600" : "bg-accent-400"}`}
              />
              <span
                className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-light"}`}
              >
                Medium
              </span>
            </div>
            {/* High */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-3.5 rounded-sm ${isDark ? "bg-primary-500" : "bg-primary-600"}`}
              />
              <span
                className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-light"}`}
              >
                High
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Best Times Summary */}
      {bestTimes.length > 0 && (
        <div
          className={`relative mt-4 p-4 rounded-xl border overflow-hidden ${
            isDark
              ? "bg-primary-900/30 border-primary-700/50"
              : "bg-primary-50 border-primary-200"
          }`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent"
          />
          <h4
            className={`font-semibold tracking-tight mb-3 flex items-center gap-1.5 ${
              isDark ? "text-primary-300" : "text-primary-700"
            }`}
          >
            <IoFlagOutline className="w-4 h-4" />
            <span>Recommended Posting Times</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {bestTimes.slice(0, 5).map((time, index) => (
              <span
                key={index}
                className={`px-3 py-1.5 text-sm font-medium tabular-nums rounded-full border transition-all duration-200 hover:-translate-y-px ${
                  isDark
                    ? "bg-dark-surface text-primary-300 border-primary-600/50 hover:border-primary-500"
                    : "bg-white text-primary-700 border-primary-300 hover:border-primary-500 shadow-sm"
                }`}
              >
                {time.day} {time.hour}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Selected Cell Info */}
      {selectedCell && selectedStatus && (
        <div
          className={`mt-4 p-4 rounded-xl border animate-fade-in ${
            isDark
              ? "bg-dark-elevated border-dark-border"
              : "bg-surface-50 border-surface-300"
          }`}
        >
          <p
            className={`text-sm ${isDark ? "text-dark-text" : "text-text-primary"}`}
          >
            <span className="font-semibold">
              {DAYS_OF_WEEK[selectedCell.day]} at {hours[selectedCell.hour]}:
            </span>{" "}
            <span className={`font-bold tabular-nums ${getValueColor(selectedCell.value)}`}>
              {selectedCell.value}% engagement rate
            </span>
          </p>
          <p
            className={`text-xs mt-2 flex items-center gap-1.5 ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
          >
            <selectedStatus.Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {selectedStatus.text}
          </p>
        </div>
      )}
    </Card>
  );
};

export default PostingHeatmap;
