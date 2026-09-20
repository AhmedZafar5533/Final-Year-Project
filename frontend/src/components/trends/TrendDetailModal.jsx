import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoClose,
  IoSparkles,
  IoFlame,
  IoTrendingUp,
  IoSearchOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoArrowForward,
  IoLayersOutline,
  IoBulbOutline,
} from "react-icons/io5";

export const TrendDetailModal = ({ trend, onClose, onDevelopScript }) => {
  const navigate = useNavigate();
  if (!trend) return null;

  const opportunityScore = trend.opportunityScore ?? 85;
  const searchVolume = trend.searchVolume || "450K monthly searches";
  const velocity = trend.growthRate || trend.velocity || "+185% 7-day surge";
  const hashtags = trend.hashtags || trend.tags || ["#YouTubeTrends", "#NicheBreakout"];

  // Suggestions synthesized for this specific trend
  const trendSuggestions = useMemo(() => {
    const topicName = trend.topic || "Current Market Trend";
    return {
      angles: [
        `First-Principles Analysis: Deconstruct the mathematical/scientific mechanics behind ${topicName} rather than surface-level news summaries.`,
        `The Hidden Breakthrough: Focus on the recent breakthrough paper or milestone that triggered this trend surge.`,
        `Commercial & Real-World Impact: Analyze what this means for industry timeline over the next 5 years.`
      ],
      titleIdeas: [
        `${topicName}: The Breakthrough That Changes Everything`,
        `Why Everyone Is Talking About ${topicName} (Deep Dive)`,
        `The Science of ${topicName}: What Nobody Is Explaining`
      ],
      openingHook: `What if everything you've been told about ${topicName} is only half the story? Right now, algorithms across YouTube are surging with interest, but most coverage misses the single critical breakthrough...`,
      targetAudienceAppeal: "Intellectual science enthusiasts, university students, and creators looking for authentic depth without clickbait fluff.",
      trapsToAvoid: "Avoid repeating sensationalized tabloid claims. Always tether high-concept claims to peer-reviewed data or physical principles."
    };
  }, [trend]);

  const handleDevelopInStudio = () => {
    const ideaObj = {
      id: `trend-idea-${trend.id || Date.now()}`,
      title: trendSuggestions.titleIdeas[0] || `Deep Dive: ${trend.topic}`,
      hook: trendSuggestions.openingHook,
      angle: trendSuggestions.angles[0],
      why_it_will_perform: `Capitalizes on ${trend.topic} surge (${opportunityScore}/100 Opportunity Score, ${searchVolume}).`,
      trend_source: `${trend.topic} (Score: ${opportunityScore}/100, ${velocity})`,
      audience_demand_source: "Surging organic search volume across YouTube and Google Trends",
      recommendation_type: "trend",
      estimated_potential: `High Velocity Trend (${opportunityScore}/100 Score)`,
      suggested_format: "14-16 min Documentary Investigation"
    };

    onClose();
    if (onDevelopScript) {
      onDevelopScript(ideaObj);
    } else {
      navigate("/studio", { state: { idea: ideaObj } });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-dark-border bg-surface-50/80 dark:bg-dark-surface-light/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <IoFlame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                  {trend.strength || "Surging"} Market Trend
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-400">
                  {opportunityScore}/100 Opportunity Score
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary dark:text-dark-text mt-1">
                {trend.topic}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-surface-200 dark:hover:bg-dark-border transition-colors"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                <IoSparkles className="w-4 h-4 text-warning-500" /> Opportunity Score
              </span>
              <p className="text-2xl font-black text-text-primary dark:text-dark-text mt-1">
                {opportunityScore} <span className="text-xs font-normal text-text-muted">/ 100</span>
              </p>
              <div className="mt-2 h-1.5 bg-surface-200 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-warning-500 to-success-500 rounded-full"
                  style={{ width: `${opportunityScore}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                <IoSearchOutline className="w-4 h-4 text-primary-500" /> Search Volume
              </span>
              <p className="text-2xl font-black text-text-primary dark:text-dark-text mt-1">
                {searchVolume}
              </p>
              <p className="text-xs text-text-muted dark:text-dark-text-muted mt-1">
                High monthly discovery
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-50 dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text-muted flex items-center gap-1.5">
                <IoTrendingUp className="w-4 h-4 text-success-500" /> Search Velocity
              </span>
              <p className="text-2xl font-black text-success-600 dark:text-success-400 mt-1">
                {velocity}
              </p>
              <p className="text-xs text-text-muted dark:text-dark-text-muted mt-1">
                7-day algorithm breakout
              </p>
            </div>
          </div>

          {/* Synthesis / Market Insight */}
          <div className="p-5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-900/40 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-primary-300 flex items-center gap-1.5">
              <IoBulbOutline className="w-4 h-4" /> Why This Trend Is Surging
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-dark-text leading-relaxed">
              {trend.marketInsight || trend.description || "Surging YouTube algorithm interest driven by high viewer search volume and low competition density in educational breakdown formats."}
            </p>
          </div>

          {/* Suggestions for This Particular Trend */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-text-primary dark:text-dark-text flex items-center gap-2">
              <IoSparkles className="w-5 h-5 text-warning-500" />
              Strategic Suggestions for This Trend
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Creative Angles */}
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                  <IoLayersOutline className="w-4 h-4" /> Recommended Video Angles
                </h4>
                <ul className="space-y-1.5 text-xs text-text-secondary dark:text-dark-text-muted">
                  {trendSuggestions.angles.map((angle, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary-500 font-bold">•</span>
                      <span>{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Title Ideas */}
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-success-700 dark:text-success-400 flex items-center gap-1.5">
                  <IoCheckmarkCircle className="w-4 h-4" /> Suggested Title Concepts
                </h4>
                <ul className="space-y-1.5 text-xs text-text-secondary dark:text-dark-text-muted">
                  {trendSuggestions.titleIdeas.map((title, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 font-medium text-text-primary dark:text-dark-text">
                      <span className="text-success-500 font-bold">✓</span>
                      <span>"{title}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Opening Hook & Traps */}
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <IoAlertCircleOutline className="w-4 h-4 text-amber-600" />
                <span>Suggested 30-Second Opening Script Hook:</span>
              </div>
              <p className="text-text-secondary dark:text-dark-text-muted italic pl-3 border-l-2 border-amber-500">
                "{trendSuggestions.openingHook}"
              </p>
              <div className="pt-2 text-[11px] text-amber-800 dark:text-amber-300">
                <strong>Target Audience Appeal: </strong>{trendSuggestions.targetAudienceAppeal}
              </div>
            </div>
          </div>

          {/* Hashtags & Keywords */}
          {hashtags.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-muted dark:text-dark-text-muted uppercase">
                Hashtags & Key Keywords:
              </span>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-surface-100 dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border text-xs font-medium text-primary-700 dark:text-primary-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-surface-200 dark:border-dark-border bg-surface-50/80 dark:bg-dark-surface-light/60 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-surface-300 dark:border-dark-border text-text-secondary dark:text-dark-text-muted hover:bg-surface-200 dark:hover:bg-dark-border transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleDevelopInStudio}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary-600/25 transition-all active:scale-98"
          >
            <IoSparkles className="w-4 h-4" />
            <span>Develop Script in AI Studio</span>
            <IoArrowForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendDetailModal;
