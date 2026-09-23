import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  IoTrendingUp,
  IoFlash,
  IoRocket,
  IoSparkles,
  IoArrowUp,
  IoArrowDown,
} from "react-icons/io5";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const QuickInsights = ({ analytics }) => {
  const insights = useMemo(
    () => [
      {
        id: "views",
        icon: IoTrendingUp,
        bgGradient: "from-emerald-500 to-teal-500",
        lightBg: "bg-emerald-100 dark:bg-emerald-900/40",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        trendBg: "bg-emerald-500/15",
        trendColor: "text-emerald-300",
        text: "Views up",
        value: `${analytics?.viewsChange > 0 ? "+" : ""}${
          analytics?.viewsChange ?? 12.5
        }%`,
        subtext: "this month",
        trend: (analytics?.viewsChange ?? 12.5) >= 0 ? "up" : "down",
        trendValue: analytics?.viewsTrendLabel ?? "+2.5%",
      },
      {
        id: "best-day",
        icon: IoFlash,
        bgGradient: "from-amber-500 to-orange-500",
        lightBg: "bg-amber-100 dark:bg-amber-900/40",
        iconColor: "text-amber-600 dark:text-amber-400",
        trendBg: "bg-amber-500/15",
        trendColor: "text-amber-300",
        text: "Best day",
        value: analytics?.bestDay ?? "Tuesday",
        subtext: analytics?.bestDayWindow ?? "2PM - 4PM",
        trend: null,
        trendValue: null,
      },
      {
        id: "top-video",
        icon: IoRocket,
        bgGradient: "from-violet-500 to-purple-500",
        lightBg: "bg-violet-100 dark:bg-violet-900/40",
        iconColor: "text-violet-600 dark:text-violet-400",
        trendBg: "bg-violet-500/15",
        trendColor: "text-violet-300",
        text: "Top video",
        value: analytics?.topVideoViews ?? "215K",
        subtext: "views this week",
        trend: "up",
        trendValue: analytics?.topVideoTrendLabel ?? "+18%",
      },
      {
        id: "new-subs",
        icon: IoSparkles,
        bgGradient: "from-blue-500 to-indigo-500",
        lightBg: "bg-blue-100 dark:bg-blue-900/40",
        iconColor: "text-blue-600 dark:text-blue-400",
        trendBg: "bg-blue-500/15",
        trendColor: "text-blue-300",
        text: "New subs",
        value: analytics?.newSubs ?? "+1.2K",
        subtext: "last 7 days",
        trend: "up",
        trendValue: analytics?.newSubsTrendLabel ?? "+8%",
      },
    ],
    [analytics]
  );

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label="Quick insights summary"
      className="relative overflow-hidden bg-primary-600 dark:bg-primary-800 rounded-3xl p-6 sm:p-7 shadow-xl shadow-primary-900/20"
    >
      {/* Ambient background decorations */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <IoSparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-lg leading-tight truncate">
                Quick Insights
              </h3>
              <p className="text-white/60 text-sm leading-tight">
                Your performance at a glance
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            View All
          </motion.button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <motion.article
                key={insight.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                className="group relative bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-5 transition-colors duration-300 cursor-pointer border border-white/10 hover:border-white/20"
              >
                {/* Hover glow, tinted per-insight */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${insight.bgGradient} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300 blur-xl`}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`inline-flex p-2.5 rounded-xl ${insight.lightBg} group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon
                        className={`w-5 h-5 ${insight.iconColor}`}
                        aria-hidden="true"
                      />
                    </div>
                    {insight.trend && (
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${insight.trendBg} ${insight.trendColor}`}
                      >
                        {insight.trend === "up" ? (
                          <IoArrowUp className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <IoArrowDown
                            className="w-3 h-3"
                            aria-hidden="true"
                          />
                        )}
                        <span>{insight.trendValue}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">
                    {insight.text}
                  </p>
                  <p className="text-white text-2xl font-bold mb-1 tabular-nums">
                    {insight.value}
                  </p>
                  <p className="text-white/50 text-sm">{insight.subtext}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default memo(QuickInsights);
