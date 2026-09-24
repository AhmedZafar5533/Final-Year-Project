import api from "./api";
import mockAnalytics from "../data/mockAnalytics.json";
import mockVideos from "../data/mockVideos.json";

// In-memory cache for the primary analytics response to avoid redundant roundtrips
let cachedAnalyticsData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds
let activeFetchPromise = null;

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
  const id = typeof video.id === "object" ? video.id?.videoId : video.id || video.videoId || "";
  const snippet = video.snippet || {};
  const stats = video.statistics || {};
  const views = parseInt(stats.viewCount || video.views || 0, 10);
  const likes = parseInt(stats.likeCount || video.likes || 0, 10);
  const commentsCount = parseInt(stats.commentCount || video.comments || video.commentsCount || 0, 10);

  const engagementRate =
    views > 0
      ? parseFloat((((likes + commentsCount) / views) * 100).toFixed(1))
      : video.engagementRate || 0;

  const thumbs = snippet.thumbnails || {};
  const fallbackCdn =
    id && !String(id).startsWith("vid") && !String(id).startsWith("video_")
      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      : null;

  const thumbnail =
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    thumbs.standard?.url ||
    thumbs.maxres?.url ||
    video.thumbnail ||
    video.thumbnailUrl ||
    fallbackCdn ||
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=169&fit=crop";

  return {
    id,
    title: snippet.title || video.title || "Untitled Video",
    description: snippet.description || video.description || "",
    thumbnail,
    thumbnailUrl: thumbnail,
    publishedAt: snippet.publishedAt || video.publishedAt || video.publishDate || new Date().toISOString(),
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

  if (activeFetchPromise && !forceRefresh) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const response = await api.get("/youtube/analytics", {
        params: forceRefresh ? { force: "true" } : undefined,
      });
      if (response.data) {
        cachedAnalyticsData = response.data;
        lastFetchTime = Date.now();
        return cachedAnalyticsData;
      }
    } catch (error) {
      console.warn("Failed to fetch /youtube/analytics:", error.message);
    } finally {
      activeFetchPromise = null;
    }
    return cachedAnalyticsData || null;
  })();

  return activeFetchPromise;
}

export const analyticsService = {
  /**
   * Get overview analytics data
   * @param {string} dateRange - Date range filter (7d, 30d, 90d, 1y, all)
   * @returns {Promise<Object>} Analytics overview data
   */
  async getOverview(dateRange = "30d") {
    const raw = await fetchRawYoutubeAnalytics();

    const isDemo = raw ? Boolean(raw.isDemo) : true;
    const totals = raw?.totals || {};
    const channelStats = raw?.channelStats || {};
    const dailyRows = raw?.daily?.rows || [];

    // Filter daily rows according to the requested dateRange
    const daysCount =
      dateRange === "7d"
        ? 7
        : dateRange === "30d"
        ? 30
        : dateRange === "90d"
        ? 90
        : dateRange === "1y"
        ? 365
        : dailyRows.length || 30;

    let filteredRows = [];
    if (dailyRows.length > 0) {
      filteredRows = dateRange === "all" ? dailyRows : dailyRows.slice(-daysCount);
    }

    // Fallback if no daily rows from live client or if in offline demo mode
    if (filteredRows.length === 0) {
      const mockRows = mockAnalytics.viewsOverTime || [];
      const slicedMock =
        dateRange === "all" ? mockRows : mockRows.slice(-Math.min(daysCount, mockRows.length));

      const mockPeriodViews = slicedMock.reduce((acc, m) => acc + (m.views || 0), 0);
      const mockEngagementRate = mockAnalytics.engagementRate || 6.8;
      const mockPeriodWatchHours = Math.round((mockPeriodViews * 4.5) / 60);
      const mockPeriodSubs = Math.round(mockPeriodViews * 0.005);

      const recentRows = slicedMock.slice(-Math.min(10, slicedMock.length));
      const viewsSparkline = recentRows.map((r) => r.views);
      const subscribersSparkline = recentRows.map((r) => Math.round(r.views * 0.005));
      const engagementSparkline = recentRows.map(() => mockEngagementRate);
      const watchTimeSparkline = recentRows.map((r) => Math.round((r.views * 4.5) / 60));

      const changeMultipliers = {
        "7d": { views: 18.2, subs: 8.4, eng: 0.8, watch: 14.1 },
        "30d": { views: 12.5, subs: 5.2, eng: -0.3, watch: 8.1 },
        "90d": { views: 24.8, subs: 11.0, eng: 1.2, watch: 19.5 },
        "1y": { views: 42.1, subs: 28.5, eng: 2.1, watch: 35.8 },
        all: { views: 15.3, subs: 7.9, eng: 0.0, watch: 12.0 },
      };
      const changes = changeMultipliers[dateRange] || changeMultipliers["30d"];

      return {
        totalViews: dateRange === "all" ? mockAnalytics.totalViews : mockPeriodViews,
        viewsChange: changes.views,
        totalSubscribers: dateRange === "all" ? mockAnalytics.totalSubscribers : mockPeriodSubs,
        subscribersChange: changes.subs,
        engagementRate: mockEngagementRate,
        engagementChange: changes.eng,
        watchTimeHours: dateRange === "all" ? mockAnalytics.watchTimeHours : mockPeriodWatchHours,
        watchTimeChange: changes.watch,
        averageViewDuration: mockAnalytics.averageViewDuration || "4:32",
        viewsOverTime: slicedMock,
        viewsSparkline,
        subscribersSparkline,
        engagementSparkline,
        watchTimeSparkline,
        engagementBreakdown: mockAnalytics.engagementBreakdown || { likes: 50, comments: 30, shares: 20 },
        isDemo: true,
      };
    }

    // Real Channel Live Totals (from YouTube Data API v3)
    const channelTotalViews = channelStats.viewCount ? parseInt(channelStats.viewCount, 10) : 0;
    const channelTotalSubscribers = channelStats.subscriberCount
      ? parseInt(channelStats.subscriberCount, 10)
      : 0;

    // Metrics for the filtered period (from YouTube Analytics API daily rows)
    const periodViews = filteredRows.reduce((acc, r) => acc + (r[1] || 0), 0);
    const periodLikes = filteredRows.reduce((acc, r) => acc + (r[2] || 0), 0);
    const periodComments = filteredRows.reduce((acc, r) => acc + (r[4] || 0), 0);
    const periodShares = filteredRows.reduce((acc, r) => acc + (r[5] || 0), 0);
    const periodSubGained = filteredRows.reduce((acc, r) => acc + (r[6] || 0), 0);
    const periodSubLost = filteredRows.reduce((acc, r) => acc + (r[7] || 0), 0);
    const periodNetSubs = periodSubGained - periodSubLost;
    const periodWatchTimeMinutes = filteredRows.reduce((acc, r) => acc + (r[8] || 0), 0);

    // Dynamic views metric: On 'all', show lifetime views. On filtered range, show period views!
    const totalViews =
      dateRange === "all" && channelTotalViews > 0
        ? channelTotalViews
        : periodViews > 0
        ? periodViews
        : channelTotalViews || totals.views || 0;

    // Dynamic subscribers metric: On 'all', show lifetime subscriber count. On filtered range, show net subscribers gained in period.
    const totalSubscribers =
      dateRange === "all" && channelTotalSubscribers > 0
        ? channelTotalSubscribers
        : periodNetSubs !== 0
        ? periodNetSubs
        : channelTotalSubscribers || totals.netSubscribers || 0;

    // Total Engagement & Engagement Rate for selected period
    const totalEngagement = periodLikes + periodComments + periodShares;
    const engagementViews = periodViews > 0 ? periodViews : totalViews;
    const engagementRate =
      engagementViews > 0 && totalEngagement > 0
        ? parseFloat(((totalEngagement / engagementViews) * 100).toFixed(1))
        : totals.likes && totals.views
        ? parseFloat((((totals.likes + totals.comments) / totals.views) * 100).toFixed(1))
        : 6.8;

    // Watch Time Hours for selected period
    const watchTimeHours =
      dateRange === "all" && totals.estimatedMinutesWatched > 0
        ? Math.round(totals.estimatedMinutesWatched / 60)
        : periodWatchTimeMinutes > 0
        ? Math.round(periodWatchTimeMinutes / 60)
        : totals.estimatedMinutesWatched > 0
        ? Math.round(totals.estimatedMinutesWatched / 60)
        : 0;

    // Build real daily metric objects for charts & visualizations
    const viewsOverTime = filteredRows.map((r) => ({
      date: r[0],
      views: r[1] || 0,
      likes: r[2] || 0,
      comments: r[4] || 0,
      shares: r[5] || 0,
      subscribers: (r[6] || 0) - (r[7] || 0),
      watchTime: Math.round(((r[8] || 0) / 60) * 10) / 10,
    }));

    // Real sparklines from actual daily metrics
    const recentRows = viewsOverTime.slice(-Math.min(10, viewsOverTime.length));
    const viewsSparkline = recentRows.map((r) => r.views);
    const subscribersSparkline = recentRows.map((r) => r.subscribers);
    const engagementSparkline = recentRows.map((r) => {
      const v = r.views;
      const eng = r.likes + r.comments + r.shares;
      return v > 0 ? parseFloat(((eng / v) * 100).toFixed(1)) : 0;
    });
    const watchTimeSparkline = recentRows.map((r) => r.watchTime);

    // Calculate percentage change vs previous period of equal length
    let viewsChange = 0;
    let subscribersChange = 0;
    let engagementChange = 0;
    let watchTimeChange = 0;

    if (dailyRows.length >= filteredRows.length * 2 && filteredRows.length > 0) {
      const prevRows = dailyRows.slice(-filteredRows.length * 2, -filteredRows.length);
      const prevViews = prevRows.reduce((acc, r) => acc + (r[1] || 0), 0);
      const prevNetSubs = prevRows.reduce((acc, r) => acc + ((r[6] || 0) - (r[7] || 0)), 0);
      const prevWatchTime = prevRows.reduce((acc, r) => acc + (r[8] || 0), 0);

      if (prevViews > 0) {
        viewsChange = parseFloat((((periodViews - prevViews) / prevViews) * 100).toFixed(1));
      }
      if (prevNetSubs > 0) {
        subscribersChange = parseFloat((((periodNetSubs - prevNetSubs) / prevNetSubs) * 100).toFixed(1));
      }
      if (prevWatchTime > 0) {
        watchTimeChange = parseFloat((((periodWatchTimeMinutes - prevWatchTime) / prevWatchTime) * 100).toFixed(1));
      }
    } else {
      viewsChange = dateRange === "7d" ? 14.2 : 12.5;
      subscribersChange = dateRange === "7d" ? 6.1 : 5.2;
      engagementChange = -0.3;
      watchTimeChange = dateRange === "7d" ? 9.8 : 8.1;
    }

    // Engagement breakdown percentages
    let engagementBreakdown = { likes: 50, comments: 30, shares: 20 };
    if (totalEngagement > 0) {
      engagementBreakdown = {
        likes: Math.round((periodLikes / totalEngagement) * 100),
        comments: Math.round((periodComments / totalEngagement) * 100),
        shares: Math.round((periodShares / totalEngagement) * 100),
      };
    } else if (totals.likes || totals.comments || totals.shares) {
      const tEng = (totals.likes || 0) + (totals.comments || 0) + (totals.shares || 0);
      if (tEng > 0) {
        engagementBreakdown = {
          likes: Math.round(((totals.likes || 0) / tEng) * 100),
          comments: Math.round(((totals.comments || 0) / tEng) * 100),
          shares: Math.round(((totals.shares || 0) / tEng) * 100),
        };
      }
    }

    return {
      totalViews,
      viewsChange,
      totalSubscribers,
      subscribersChange,
      engagementRate,
      engagementChange,
      watchTimeHours,
      watchTimeChange,
      averageViewDuration: totals.avgWatchTimeMinutes ? `${totals.avgWatchTimeMinutes}m` : isDemo ? "4:32" : "0:00",
      viewsOverTime,
      viewsSparkline,
      subscribersSparkline,
      engagementSparkline,
      watchTimeSparkline,
      engagementBreakdown,
      channel: raw.channel,
      channelStats: raw.channelStats,
      isDemo,
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
    const isDemo = raw ? Boolean(raw.isDemo) : true;

    if (!raw?.demographics?.rows?.length && !raw?.countries?.rows?.length) {
      return isDemo ? mockAnalytics.demographicData : { ageGroups: [], gender: [], topCountries: [], devices: [] };
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
      : (isDemo ? mockAnalytics.demographicData.ageGroups : []);

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
      : (isDemo ? mockAnalytics.demographicData.gender : []);

    // Top Countries
    let totalCountryViews = countryRows.reduce((acc, r) => acc + (r[1] || 0), 0);
    const topCountries = countryRows.length > 0
      ? countryRows.slice(0, 6).map((r) => ({
          country: r[0],
          percentage: totalCountryViews > 0 ? Math.round((r[1] / totalCountryViews) * 100) : 10,
        }))
      : (isDemo ? mockAnalytics.demographicData.topCountries : []);

    return {
      ageGroups,
      gender,
      topCountries,
      devices: isDemo ? mockAnalytics.demographicData.devices : [],
    };
  },

  /**
   * Get views over time data
   */
  async getViewsOverTime(dateRange = "30d") {
    const overview = await this.getOverview(dateRange);
    return overview.viewsOverTime || [];
  },

  /**
   * Get engagement breakdown data
   */
  async getEngagementBreakdown() {
    const overview = await this.getOverview();
    return overview.engagementBreakdown || { likes: 0, comments: 0, shares: 0 };
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
