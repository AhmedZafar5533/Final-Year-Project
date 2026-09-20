import { useState, useEffect, useMemo, memo } from "react";
import {
  IoClose,
  IoSparkles,
  IoHappyOutline,
  IoSadOutline,
  IoRemoveOutline,
  IoShieldCheckmarkOutline,
  IoChatbubblesOutline,
  IoTimeOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoThumbsUpOutline,
  IoEyeOutline,
  IoHeartOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoDocumentTextOutline,
  IoBulbOutline,
} from "react-icons/io5";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import analyticsService from "../../services/analyticsService";
import { formatNumber, formatDate } from "../../utils/formatters";

const SENTIMENT_COLORS = {
  POSITIVE: "#10B981",
  NEUTRAL: "#0EA5E9",
  NEGATIVE: "#F43F5E",
};

export const VideoDeepDiveModal = ({ video, onClose }) => {
  const [activeTab, setActiveTab] = useState("sentiment"); // 'sentiment', 'intelligence', 'chapters', 'transcript', 'comments'
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const [videoAnalytics, setVideoAnalytics] = useState(null);
  const [commentsData, setCommentsData] = useState({
    comments: [],
    totalComments: 0,
    sentimentSummary: null,
    commentsDisabled: false,
  });
  const [videoInsights, setVideoInsights] = useState(null);

  const [sentimentFilter, setSentimentFilter] = useState("ALL");
  const [selectedChapterFilter, setSelectedChapterFilter] = useState(null);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const videoId = video?.id;

  // Load all 3 streams of deep video data in parallel
  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    // 1. Video Analytics
    analyticsService
      .getVideoAnalytics(videoId)
      .then((data) => {
        if (isMounted) setVideoAnalytics(data);
      })
      .catch((err) => console.warn("Video analytics fallback:", err.message))
      .finally(() => {
        if (isMounted) setLoadingAnalytics(false);
      });

    // 2. Video Comments + RoBERTa Sentiment
    analyticsService
      .getVideoComments(videoId)
      .then((res) => {
        if (isMounted) {
          setCommentsData({
            comments: res.comments || [],
            totalComments: res.totalComments || res.comments?.length || 0,
            sentimentSummary: res.sentimentSummary || null,
            commentsDisabled: Boolean(res.commentsDisabled),
          });
        }
      })
      .catch((err) => console.warn("Comments sentiment error:", err.message))
      .finally(() => {
        if (isMounted) setLoadingComments(false);
      });

    // 3. Nova AI Video Intelligence
    analyticsService
      .getVideoInsights(videoId)
      .then((data) => {
        if (isMounted) setVideoInsights(data);
      })
      .catch((err) => console.warn("Insights error:", err.message))
      .finally(() => {
        if (isMounted) setLoadingInsights(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  const sentimentSummary = commentsData.sentimentSummary;
  const comments = commentsData.comments || [];

  const pieData = useMemo(() => {
    if (!sentimentSummary) return [];
    return [
      {
        name: "Positive",
        value: sentimentSummary.positive_count || 0,
        color: SENTIMENT_COLORS.POSITIVE,
      },
      {
        name: "Neutral",
        value: sentimentSummary.neutral_count || 0,
        color: SENTIMENT_COLORS.NEUTRAL,
      },
      {
        name: "Negative",
        value: sentimentSummary.negative_count || 0,
        color: SENTIMENT_COLORS.NEGATIVE,
      },
    ].filter((d) => d.value > 0);
  }, [sentimentSummary]);

  const netSentimentScore = useMemo(() => {
    if (!sentimentSummary) return 0;
    return Math.round(
      (sentimentSummary.positive_percentage || 0) -
        (sentimentSummary.negative_percentage || 0),
    );
  }, [sentimentSummary]);

  const filteredComments = useMemo(() => {
    let list = selectedChapterFilter
      ? selectedChapterFilter.matched_comments || []
      : comments;

    if (sentimentFilter === "ALL") return list;

    return list.filter((c) => {
      const label = (c.sentiment?.label || "").toUpperCase();
      if (sentimentFilter === "POSITIVE") return label.includes("POS");
      if (sentimentFilter === "NEUTRAL") return label.includes("NEU");
      if (sentimentFilter === "NEGATIVE") return label.includes("NEG");
      return true;
    });
  }, [comments, selectedChapterFilter, sentimentFilter]);

  const filteredTranscript = useMemo(() => {
    const list = videoInsights?.transcript || [];
    if (!transcriptSearch.trim()) return list;
    const q = transcriptSearch.toLowerCase();
    return list.filter((t) => t.text.toLowerCase().includes(q));
  }, [videoInsights, transcriptSearch]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md overflow-hidden animate-fade-in">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-surface-300 dark:border-dark-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-surface-200 dark:border-dark-border bg-surface-50/80 dark:bg-dark-surface-light/50">
          <div className="flex items-start gap-4 min-w-0 pr-4">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-24 sm:w-32 h-14 sm:h-20 object-cover rounded-xl shadow-md border border-surface-200 dark:border-dark-border flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  Video Deep Dive
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-surface-200 dark:bg-dark-border text-text-secondary dark:text-dark-text-muted">
                  {formatDate(video.publishedAt)}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
                  Nova AI
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-text-primary dark:text-dark-text truncate max-w-xl">
                {video.title}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm text-text-muted dark:text-dark-text-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <IoEyeOutline className="w-4 h-4 text-text-secondary" />
                  <strong className="text-text-primary dark:text-dark-text">
                    {formatNumber(video.views)}
                  </strong>{" "}
                  views
                </span>
                <span className="flex items-center gap-1">
                  <IoHeartOutline className="w-4 h-4 text-primary-600" />
                  <strong className="text-text-primary dark:text-dark-text">
                    {formatNumber(video.likes)}
                  </strong>{" "}
                  likes
                </span>
                <span className="flex items-center gap-1">
                  <IoChatbubblesOutline className="w-4 h-4 text-accent-600" />
                  <strong className="text-text-primary dark:text-dark-text">
                    {formatNumber(video.commentsCount || video.comments)}
                  </strong>{" "}
                  comments
                </span>
                {video.engagementRate && (
                  <span className="text-success-600 font-semibold">
                    {video.engagementRate}% engagement
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-surface-200 dark:hover:bg-dark-border transition-colors flex-shrink-0"
            title="Close modal"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-surface-200 dark:border-dark-border overflow-x-auto bg-surface-100/60 dark:bg-dark-surface/40">
          {[
            { id: "sentiment", label: "Sentiment Analysis", icon: IoSparkles },
            { id: "intelligence", label: "AI Insights", icon: IoBulbOutline },
            { id: "chapters", label: "Chapters & Timestamps", icon: IoTimeOutline },
            { id: "transcript", label: "Full Transcript", icon: IoDocumentTextOutline },
            { id: "comments", label: "Comment Threads", icon: IoChatbubblesOutline },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                    : "text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text hover:bg-surface-200 dark:hover:bg-dark-surface-light"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: SENTIMENT ANALYSIS */}
          {activeTab === "sentiment" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-text-primary dark:text-dark-text flex items-center gap-2">
                    <IoSparkles className="w-5 h-5 text-accent-600" />
                    RoBERTa Neural Sentiment Intelligence
                  </h3>
                  <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                    3-class sentiment inference powered by the Twitter-RoBERTa neural pipeline
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                  CardiffNLP RoBERTa Base
                </span>
              </div>

              {loadingComments ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm text-text-muted dark:text-dark-text-muted">
                    Running RoBERTa 3-class neural inference on video comments…
                  </p>
                </div>
              ) : commentsData.commentsDisabled ? (
                <div className="p-8 text-center bg-surface-100 dark:bg-dark-surface-light rounded-2xl">
                  <p className="text-text-muted dark:text-dark-text-muted">
                    Comments are disabled for this video.
                  </p>
                </div>
              ) : sentimentSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Donut Chart */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-surface-50 dark:bg-dark-surface-light rounded-2xl border border-surface-200 dark:border-dark-border">
                    <div className="relative w-44 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const item = payload[0];
                              const count = item.value;
                              const pct = (
                                (count / (sentimentSummary.total || 1)) *
                                100
                              ).toFixed(1);
                              return (
                                <div className="bg-white dark:bg-dark-elevated p-2 rounded-lg shadow border border-surface-200 dark:border-dark-border text-xs">
                                  <span
                                    className="font-bold mr-1"
                                    style={{ color: item.payload.color }}
                                  >
                                    {item.name}:
                                  </span>
                                  <span>
                                    {count} ({pct}%)
                                  </span>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-text-primary dark:text-dark-text">
                          {sentimentSummary.positive_percentage}%
                        </span>
                        <span className="text-xs font-semibold text-success-600">
                          Positive
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-text-muted dark:text-dark-text-muted">
                      {sentimentSummary.total || comments.length} Comments Analyzed
                    </p>
                  </div>

                  {/* KPI Cards */}
                  <div className="md:col-span-7 grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Positive */}
                    <div className="p-4 bg-success-50/50 dark:bg-success-950/20 border border-success-200 dark:border-success-800/40 rounded-2xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-success-800 dark:text-success-300 flex items-center gap-1.5">
                          <IoHappyOutline className="w-4 h-4 text-success-600" />
                          Positive
                        </span>
                        <span className="text-xs font-bold text-success-700 dark:text-success-400">
                          {sentimentSummary.positive_percentage}%
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-success-900 dark:text-success-200">
                        {sentimentSummary.positive_count}
                      </p>
                      <div className="w-full bg-success-200 dark:bg-success-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-success-500 h-full rounded-full"
                          style={{
                            width: `${sentimentSummary.positive_percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Neutral */}
                    <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-2xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                          <IoRemoveOutline className="w-4 h-4 text-sky-600" />
                          Neutral
                        </span>
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                          {sentimentSummary.neutral_percentage}%
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-sky-900 dark:text-sky-200">
                        {sentimentSummary.neutral_count}
                      </p>
                      <div className="w-full bg-sky-200 dark:bg-sky-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-sky-500 h-full rounded-full"
                          style={{
                            width: `${sentimentSummary.neutral_percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Negative */}
                    <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <IoSadOutline className="w-4 h-4 text-rose-600" />
                          Negative
                        </span>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          {sentimentSummary.negative_percentage}%
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-200">
                        {sentimentSummary.negative_count}
                      </p>
                      <div className="w-full bg-rose-200 dark:bg-rose-900/40 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{
                            width: `${sentimentSummary.negative_percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Net Sentiment Score */}
                    <div className="p-4 bg-accent-50/50 dark:bg-accent-950/20 border border-accent-200 dark:border-accent-800/40 rounded-2xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-accent-800 dark:text-accent-300 flex items-center gap-1.5">
                          <IoShieldCheckmarkOutline className="w-4 h-4 text-accent-600" />
                          Health Score
                        </span>
                        <span className="text-xs font-bold text-accent-700 dark:text-accent-400">
                          Net
                        </span>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-accent-900 dark:text-accent-200">
                        {netSentimentScore > 0 ? `+${netSentimentScore}%` : `${netSentimentScore}%`}
                      </p>
                      <span className="text-[11px] font-medium text-accent-700 dark:text-accent-300 block mt-1">
                        {sentimentSummary.positive_percentage >= 60
                          ? "🌟 Overwhelmingly Positive"
                          : sentimentSummary.positive_percentage >= 40
                            ? "👍 Mostly Favorable"
                            : "⚖️ Balanced Reception"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-text-muted">
                  No sentiment metrics found for this video.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI VIDEO INTELLIGENCE */}
          {activeTab === "intelligence" && (
            <div className="space-y-6">
              {loadingInsights ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="text-sm text-text-muted dark:text-dark-text-muted">
                    Nova AI is synthesizing video intelligence and audience perception…
                  </p>
                </div>
              ) : videoInsights?.aiInsights ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="p-5 bg-surface-50 dark:bg-dark-surface-light rounded-2xl border border-surface-200 dark:border-dark-border">
                    <h4 className="text-sm font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <IoSparkles className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <p className="text-sm text-text-secondary dark:text-dark-text leading-relaxed">
                      {videoInsights.aiInsights.executive_summary}
                    </p>
                  </div>

                  {/* Alignment & Takeaways */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-primary-50/40 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800/40 rounded-2xl">
                      <h5 className="text-xs font-bold text-primary-800 dark:text-primary-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <IoDocumentTextOutline className="w-4 h-4" />
                        Creator Intent & Thesis
                      </h5>
                      <p className="text-sm text-text-secondary dark:text-dark-text">
                        {videoInsights.aiInsights.content_vs_perception?.creator_intent ||
                          "Core pedagogical explanation with evidence-based reasoning."}
                      </p>
                    </div>

                    <div className="p-5 bg-success-50/40 dark:bg-success-950/20 border border-success-200 dark:border-success-800/40 rounded-2xl">
                      <h5 className="text-xs font-bold text-success-800 dark:text-success-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <IoCheckmarkCircleOutline className="w-4 h-4" />
                        Audience Takeaway
                      </h5>
                      <p className="text-sm text-text-secondary dark:text-dark-text">
                        {videoInsights.aiInsights.content_vs_perception?.audience_takeaway ||
                          "Highly receptive to clear visual analogies and counterintuitive discoveries."}
                      </p>
                    </div>
                  </div>

                  {/* Actionable Recommendations */}
                  {videoInsights.aiInsights.actionable_recommendations?.length > 0 && (
                    <div className="p-5 bg-warning-50/40 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-800/40 rounded-2xl">
                      <h5 className="text-xs font-bold text-warning-800 dark:text-warning-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <IoBulbOutline className="w-4 h-4 text-warning-600" />
                        Actionable Next Steps
                      </h5>
                      <ul className="space-y-2">
                        {videoInsights.aiInsights.actionable_recommendations.map(
                          (rec, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-text-secondary dark:text-dark-text"
                            >
                              <span className="w-5 h-5 rounded-full bg-warning-200 dark:bg-warning-800/60 text-warning-800 dark:text-warning-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{rec}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Friction Points */}
                  {videoInsights.aiInsights.content_vs_perception?.misconceptions_identified?.length > 0 && (
                    <div className="p-5 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl">
                      <h5 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <IoAlertCircleOutline className="w-4 h-4 text-rose-600" />
                        Identified Audience Friction Points
                      </h5>
                      <ul className="space-y-2">
                        {videoInsights.aiInsights.content_vs_perception.misconceptions_identified.map(
                          (point, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-rose-900 dark:text-rose-200"
                            >
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{point}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No AI insights generated for this video yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: CHAPTERS & TIMESTAMPS */}
          {activeTab === "chapters" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="text-xs sm:text-sm text-text-muted dark:text-dark-text-muted">
                  Click any chapter to filter viewer comments referencing that timestamp.
                </p>
                {selectedChapterFilter && (
                  <button
                    onClick={() => setSelectedChapterFilter(null)}
                    className="text-xs font-semibold px-3 py-1 rounded-lg bg-surface-200 dark:bg-dark-border text-primary-700 dark:text-primary-300 hover:bg-surface-300 transition-colors"
                  >
                    Clear Filter (Show All)
                  </button>
                )}
              </div>

              {videoInsights?.chapters?.length > 0 ? (
                <div className="space-y-3">
                  {videoInsights.chapters.map((chapter) => {
                    const isSelected = selectedChapterFilter?.id === chapter.id;
                    const isPos = chapter.dominant_sentiment === "POSITIVE";
                    const isNeg = chapter.dominant_sentiment === "NEGATIVE";

                    return (
                      <div
                        key={chapter.id}
                        onClick={() => {
                          setSelectedChapterFilter(isSelected ? null : chapter);
                          if (!isSelected) setActiveTab("comments");
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-950/40 border-primary-500 shadow-md"
                            : "bg-surface-50 dark:bg-dark-surface-light border-surface-200 dark:border-dark-border hover:border-primary-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-mono text-xs font-bold">
                            {chapter.startStr || "00:00"} - {chapter.endStr || "End"}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary dark:text-dark-text">
                              {chapter.title}
                            </h4>
                            <p className="text-xs text-text-muted dark:text-dark-text-muted">
                              {chapter.total_mentions || 0} viewer comment mentions
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                              isPos
                                ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                                : isNeg
                                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                  : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            {isPos ? (
                              <IoHappyOutline />
                            ) : isNeg ? (
                              <IoSadOutline />
                            ) : (
                              <IoRemoveOutline />
                            )}
                            {chapter.dominant_sentiment || "Neutral"}
                          </span>

                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {isSelected ? "Filter active" : "View comments →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-text-muted bg-surface-50 dark:bg-dark-surface-light rounded-2xl">
                  No timed chapters detected for this video.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FULL TRANSCRIPT */}
          {activeTab === "transcript" && (
            <div className="space-y-4">
              <div className="relative">
                <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search transcript keywords (e.g. quantum, wormhole, atmosphere)..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-dark-surface-light border border-surface-300 dark:border-dark-border rounded-xl text-sm text-text-primary dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-2 divide-y divide-surface-200 dark:divide-dark-border">
                {filteredTranscript.length > 0 ? (
                  filteredTranscript.map((t, idx) => {
                    const mins = Math.floor(t.start / 60);
                    const secs = Math.floor(t.start % 60);
                    const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

                    return (
                      <div
                        key={idx}
                        className="pt-2.5 first:pt-0 flex items-start gap-3 text-sm text-text-secondary dark:text-dark-text"
                      >
                        <span className="px-2 py-0.5 rounded-md bg-surface-200 dark:bg-dark-border font-mono text-xs text-text-muted dark:text-dark-text-muted flex-shrink-0 mt-0.5">
                          {timeFormatted}
                        </span>
                        <p className="leading-relaxed">{t.text}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-8 text-sm text-text-muted">
                    No transcript entries matching "{transcriptSearch}".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: COMMENT THREADS WITH SENTIMENT FILTER */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-200 dark:border-dark-border">
                <div className="flex items-center gap-2">
                  <IoChatbubblesOutline className="w-5 h-5 text-accent-600" />
                  <span className="text-sm font-bold text-text-primary dark:text-dark-text">
                    {selectedChapterFilter
                      ? `Comments on "${selectedChapterFilter.title}"`
                      : "Viewer Comments"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-200 dark:bg-dark-border text-text-muted">
                    {filteredComments.length}
                  </span>
                  {selectedChapterFilter && (
                    <button
                      onClick={() => setSelectedChapterFilter(null)}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Clear chapter filter
                    </button>
                  )}
                </div>

                {/* Sentiment filter pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <IoFilterOutline className="w-4 h-4 text-text-muted mr-1" />
                  {["ALL", "POSITIVE", "NEUTRAL", "NEGATIVE"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSentimentFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        sentimentFilter === f
                          ? f === "POSITIVE"
                            ? "bg-success-600 text-white"
                            : f === "NEGATIVE"
                              ? "bg-rose-600 text-white"
                              : f === "NEUTRAL"
                                ? "bg-sky-600 text-white"
                                : "bg-primary-600 text-white"
                          : "bg-surface-100 dark:bg-dark-surface-light text-text-muted hover:text-text-primary hover:bg-surface-200"
                      }`}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment list */}
              <div className="max-h-[420px] overflow-y-auto space-y-3 pr-2">
                {filteredComments.length > 0 ? (
                  filteredComments.map((comment, i) => {
                    const label = (comment.sentiment?.label || "NEUTRAL").toUpperCase();
                    const isPos = label.includes("POS");
                    const isNeg = label.includes("NEG");
                    const conf = comment.sentiment?.confidence
                      ? Math.round(comment.sentiment.confidence * 100)
                      : null;

                    return (
                      <div
                        key={comment.id || i}
                        className="p-4 bg-surface-50 dark:bg-dark-surface-light border border-surface-200 dark:border-dark-border rounded-2xl flex items-start gap-3 hover:border-primary-200 transition-colors"
                      >
                        <img
                          src={
                            comment.authorAvatar ||
                            "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                          }
                          alt={comment.author || "User"}
                          className="w-9 h-9 rounded-full object-cover border border-surface-300 dark:border-dark-border flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-text-primary dark:text-dark-text">
                                {comment.author || "Anonymous"}
                              </span>
                              {comment.publishedAt && (
                                <span className="text-[11px] text-text-muted">
                                  {formatDate(comment.publishedAt)}
                                </span>
                              )}
                              {comment.timestamp_referenced && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300">
                                  @{comment.timestamp_referenced}
                                </span>
                              )}
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                                isPos
                                  ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                                  : isNeg
                                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                    : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                              }`}
                            >
                              {isPos ? (
                                <IoHappyOutline />
                              ) : isNeg ? (
                                <IoSadOutline />
                              ) : (
                                <IoRemoveOutline />
                              )}
                              {isPos ? "Positive" : isNeg ? "Negative" : "Neutral"}
                              {conf && <span className="opacity-75">({conf}%)</span>}
                            </span>
                          </div>

                          <p
                            className="text-xs sm:text-sm text-text-secondary dark:text-dark-text leading-relaxed mt-1"
                            dangerouslySetInnerHTML={{ __html: comment.text }}
                          />

                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <IoThumbsUpOutline className="w-3.5 h-3.5" />
                              {comment.likes || 0}
                            </span>
                            {comment.replyCount > 0 && (
                              <span>
                                {comment.replyCount}{" "}
                                {comment.replyCount === 1 ? "reply" : "replies"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-10 text-sm text-text-muted">
                    No comments found matching this filter.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(VideoDeepDiveModal);
