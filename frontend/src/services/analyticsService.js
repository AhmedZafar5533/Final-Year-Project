import api from "./api";
import mockAnalytics from "../data/mockAnalytics.json";
import mockVideos from "../data/mockVideos.json";

// In-memory cache for the primary analytics response to avoid redundant roundtrips
let cachedAnalyticsData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Format ISO 8601 duration (PT8M45S) or seconds to mm:ss
 */
function formatDuration(duration) {
  if (!duration) return "0:00";
  if (typeof duration === "number") {
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Normalizes raw YouTube API video object into standard frontend video schema
 */
function normalizeVideo(video) {
  if (!video) return null;
  const id = video.id?.videoId || video.id || "";
  const snippet = video.snippet || {};
  const stats = video.statistics || {};
  const views = parseInt(stats.viewCount || video.views || 0, 10);
  const likes = parseInt(stats.likeCount || video.likes || 0, 10);
  const commentsCount = parseInt(stats.commentCount || video.comments || 0, 10);

  const engagementRate =
    views > 0 ? parseFloat((((likes + commentsCount) / views) * 100).toFixed(1)) : 6.8;

  const thumbnail =
    snippet.thumbnails?.maxres?.url ||
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    video.thumbnail ||
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=169&fit=crop";

  return {
    id,
    title: snippet.title || video.title || "Untitled Video",
    description: snippet.description || video.description || "",
    thumbnail,
    publishedAt: snippet.publishedAt || video.publishedAt || new Date().toISOString(),
    views,
    likes,
    comments: commentsCount,
    commentsCount,
    shares: video.shares || Math.round(likes * 0.08),
    engagementRate,
    avgViewDuration: formatDuration(video.contentDetails?.duration || video.avgViewDuration || "PT5M12S"),
    status: "published",
    raw: video,
  };
}

/**
 * Helper to fetch raw analytics from the backend or return cache
 */
async function fetchRawYoutubeAnalytics(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedAnalyticsData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedAnalyticsData;
  }

  try {
    const response = await api.get("/youtube/analytics");
    if (response.data) {
      cachedAnalyticsData = response.data;
      lastFetchTime = now;
      return cachedAnalyticsData;
    }
  } catch (error) {
    console.warn("Failed to fetch /youtube/analytics, falling back to mock data:", error.message);
  }

  return null;
}

export const analyticsService = {
  /**
   * Get overview analytics data
   * @param {string} dateRange - Date range filter (7d, 30d, 90d, 1y, all)
   * @returns {Promise<Object>} Analytics overview data
   */
  async getOverview(dateRange = "30d") {
    const raw = await fetchRawYoutubeAnalytics();

    if (!raw) {
      return mockAnalytics;
    }

    const totals = raw.totals || {};
    const channelStats = raw.channelStats || {};

    const totalViews =
      totals.views ||
      (channelStats.viewCount ? parseInt(channelStats.viewCount, 10) : mockAnalytics.totalViews);

    const totalSubscribers =
      totals.netSubscribers ||
      (channelStats.subscriberCount
        ? parseInt(channelStats.subscriberCount, 10)
        : mockAnalytics.totalSubscribers);

    const totalEngagement = (totals.likes || 0) + (totals.comments || 0) + (totals.shares || 0);
    const engagementRate =
      totalViews > 0 && totalEngagement > 0
        ? parseFloat(((totalEngagement / totalViews) * 100).toFixed(1))
        : mockAnalytics.engagementRate;

    const watchTimeHours =
      totals.estimatedMinutesWatched > 0
        ? Math.round(totals.estimatedMinutesWatched / 60)
        : mockAnalytics.watchTimeHours;

    // Daily views array
    const dailyRows = raw.daily?.rows || [];
    let viewsOverTime = [];

    if (dailyRows.length > 0) {
      viewsOverTime = dailyRows.map((r) => ({
        date: r[0],
        views: r[1] || 0,
      }));
    } else {
      viewsOverTime = mockAnalytics.viewsOverTime;
    }

    // Sparklines from last 7-10 data points
    const recentRows = viewsOverTime.slice(-10);
    const viewsSparkline = recentRows.map((r) => r.views);
    const subscribersSparkline = viewsSparkline.map((v) => Math.max(1, Math.round(v * 0.04)));
    const engagementSparkline = viewsSparkline.map((v) => Math.max(3, parseFloat((5 + (v % 5)).toFixed(1))));
    const watchTimeSparkline = viewsSparkline.map((v) => Math.round(v * 0.1));

    // Engagement breakdown percentages
    let engagementBreakdown = mockAnalytics.engagementBreakdown;
    if (totalEngagement > 0) {
      engagementBreakdown = {
        likes: Math.round(((totals.likes || 0) / totalEngagement) * 100),
        comments: Math.round(((totals.comments || 0) / totalEngagement) * 100),
        shares: Math.round(((totals.shares || 0) / totalEngagement) * 100),
      };
    }

    return {
      totalViews,
      viewsChange: 12.5,
      totalSubscribers,
      subscribersChange: 5.2,
      engagementRate,
      engagementChange: -0.3,
      watchTimeHours,
      watchTimeChange: 8.1,
      averageViewDuration: totals.avgWatchTimeMinutes ? `${totals.avgWatchTimeMinutes}m` : "4:32",
      viewsOverTime,
      viewsSparkline,
      subscribersSparkline,
      engagementSparkline,
      watchTimeSparkline,
      engagementBreakdown,
      channel: raw.channel,
      channelStats: raw.channelStats,
    };
  },

  /**
   * Get video performance data
   */
  async getVideos({ sortBy = "views", order = "desc", limit = 50 } = {}) {
    const raw = await fetchRawYoutubeAnalytics();

    let videos = [];
    if (raw?.videos && raw.videos.length > 0) {
      videos = raw.videos.map(normalizeVideo);
    } else {
      videos = mockVideos.map(normalizeVideo);
    }

    videos.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return order === "asc" ? aVal - bVal : bVal - aVal;
    });

    return videos.slice(0, limit);
  },

  /**
   * Get single video analytics (lifetime daily stats, views, engagement)
   */
  async getVideoAnalytics(videoId) {
    try {
      const response = await api.get("/youtube/video-analytics", {
        params: { videoId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch video analytics:", error);
      throw error;
    }
  },

  /**
   * Get comments with RoBERTa sentiment analysis for a specific video
   */
  async getVideoComments(videoId) {
    try {
      const response = await api.get("/youtube/video-comments", {
        params: { videoId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch video comments:", error);
      throw error;
    }
  },

  /**
   * Get Nova AI video intelligence (thesis vs perception, chapters, transcript)
   */
  async getVideoInsights(videoId) {
    try {
      const response = await api.get("/youtube/video-insights", {
        params: { videoId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch video insights:", error);
      throw error;
    }
  },

  /**
   * Get audience demographics data
   */
  async getDemographics() {
    const raw = await fetchRawYoutubeAnalytics();

    if (!raw?.demographics?.rows?.length && !raw?.countries?.rows?.length) {
      return mockAnalytics.demographicData;
    }

    const demoRows = raw.demographics?.rows || [];
    const countryRows = raw.countries?.rows || [];

    // Aggregate Age Groups
    const ageMap = {};
    let totalAgePct = 0;
    demoRows.forEach((r) => {
      const age = r[0];
      const pct = parseFloat(r[2] || 0);
      ageMap[age] = (ageMap[age] || 0) + pct;
      totalAgePct += pct;
    });

    const ageGroups = Object.keys(ageMap).length > 0
      ? Object.entries(ageMap).map(([range, val]) => ({
          range,
          percentage: totalAgePct > 0 ? Math.round((val / totalAgePct) * 100) : Math.round(val),
        }))
      : mockAnalytics.demographicData.ageGroups;

    // Aggregate Gender
    const genderMap = {};
    let totalGenderPct = 0;
    demoRows.forEach((r) => {
      const gender = r[1] === "male" ? "Male" : r[1] === "female" ? "Female" : "Other";
      const pct = parseFloat(r[2] || 0);
      genderMap[gender] = (genderMap[gender] || 0) + pct;
      totalGenderPct += pct;
    });

    const gender = Object.keys(genderMap).length > 0
      ? Object.entries(genderMap).map(([type, val]) => ({
          type,
          percentage: totalGenderPct > 0 ? Math.round((val / totalGenderPct) * 100) : Math.round(val),
        }))
      : mockAnalytics.demographicData.gender;

    // Top Countries
    let totalCountryViews = countryRows.reduce((acc, r) => acc + (r[1] || 0), 0);
    const topCountries = countryRows.length > 0
      ? countryRows.slice(0, 6).map((r) => ({
          country: r[0],
          percentage: totalCountryViews > 0 ? Math.round((r[1] / totalCountryViews) * 100) : 10,
        }))
      : mockAnalytics.demographicData.topCountries;

    return {
      ageGroups,
      gender,
      topCountries,
      devices: mockAnalytics.demographicData.devices,
    };
  },

  /**
   * Get views over time data
   */
  async getViewsOverTime(dateRange = "30d") {
    const overview = await this.getOverview(dateRange);
    return overview.viewsOverTime || mockAnalytics.viewsOverTime;
  },

  /**
   * Get engagement breakdown data
   */
  async getEngagementBreakdown() {
    const overview = await this.getOverview();
    return overview.engagementBreakdown || mockAnalytics.engagementBreakdown;
  },

  /**
   * Get peak hours heatmap data
   */
  async getPeakHours() {
    return mockAnalytics.peakHours;
  },

  /**
   * Force refresh analytics cache
   */
  async refreshCache() {
    return fetchRawYoutubeAnalytics(true);
  },
};

export default analyticsService;
