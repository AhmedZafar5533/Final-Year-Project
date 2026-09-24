import api from "./api";
import mockTrends from "../data/mockTrends.json";
import mockInsights from "../data/mockInsights.json";

const INTEL_STORAGE_KEY = "onlycreators_channel_intelligence";
const INTEL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function loadCachedIntelligenceFromStorage() {
  try {
    const raw = localStorage.getItem(INTEL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        return parsed.data;
      }
    }
  } catch (e) {
    console.warn("Failed to load cached intelligence from storage:", e);
  }
  return null;
}

function saveIntelligenceToStorage(data) {
  try {
    if (data) {
      localStorage.setItem(
        INTEL_STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );
    }
  } catch (e) {
    console.warn("Failed to save intelligence to storage:", e);
  }
}

// In-memory cache for channel intelligence
let cachedIntelligence = loadCachedIntelligenceFromStorage();
let lastIntelFetch = cachedIntelligence ? Date.now() : 0;

export const trendsService = {
  /**
   * Synchronously get whatever intelligence is already in cache/storage (no delay)
   */
  getCachedIntelligence() {
    if (!cachedIntelligence) {
      cachedIntelligence = loadCachedIntelligenceFromStorage();
    }
    return cachedIntelligence || null;
  },

  /**
   * Get synthesized market trends for the channel's niche
   */
  async getTrends(category = "all") {
    try {
      const intel = await this.getChannelIntelligence();
      let list = intel?.marketTrends;

      if (!list || list.length === 0) {
        try {
          const res = await api.get("/trends/live/cached");
          if (res.data?.data?.niche_trends?.length > 0) {
            list = res.data.data.niche_trends;
          }
        } catch (e) {
          try {
            const fallbackRes = await api.get("/trends");
            if (fallbackRes.data?.data?.length > 0) {
              list = fallbackRes.data.data;
            }
          } catch (e2) {}
        }
      }

      if (!list || list.length === 0) {
        list = mockTrends;
      }

      if (category !== "all") {
        return list.filter(
          (t) => t.category?.toLowerCase() === category.toLowerCase(),
        );
      }
      return list;
    } catch (error) {
      console.warn("Falling back to mock trends due to error:", error.message);
      if (category !== "all") {
        return mockTrends.filter(
          (t) => t.category?.toLowerCase() === category.toLowerCase(),
        );
      }
      return mockTrends;
    }
  },

  /**
   * Fetch full Channel Intelligence (niche detection, video analyses, master summary, market trends)
   */
  async getChannelIntelligence(refresh = false) {
    const now = Date.now();
    if (!refresh) {
      if (cachedIntelligence && now - lastIntelFetch < INTEL_CACHE_TTL) {
        return cachedIntelligence;
      }
      const stored = loadCachedIntelligenceFromStorage();
      if (stored) {
        cachedIntelligence = stored;
        lastIntelFetch = now;
        return stored;
      }
    }

    try {
      const response = await api.get("/youtube/channel-intelligence", {
        params: { refresh: refresh ? "true" : undefined },
        timeout: 120000,
      });
      if (response.data) {
        cachedIntelligence = response.data;
        lastIntelFetch = now;
        saveIntelligenceToStorage(response.data);
        return cachedIntelligence;
      }
    } catch (error) {
      console.warn("Failed to fetch channel intelligence:", error.message);
    }

    if (!cachedIntelligence) {
      cachedIntelligence = loadCachedIntelligenceFromStorage();
    }
    return cachedIntelligence || null;
  },

  /**
   * Interactive AI Script Studio Chatbot
   */
  async chatScriptStudio({ idea, channelContext, messages, currentScript }) {
    try {
      const response = await api.post("/youtube/script-studio/chat", {
        idea,
        channelContext,
        messages,
        currentScript,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to call script studio chat:", error);
      throw error;
    }
  },

  async getTrendDetails(trendId) {
    try {
      const trends = await this.getTrends();
      const found = trends.find((t) => t.id === trendId);
      if (found) return found;
      return mockTrends.find((t) => t.id === trendId) || null;
    } catch (error) {
      console.error("Failed to fetch trend details:", error);
      return mockTrends.find((t) => t.id === trendId) || null;
    }
  },

  async getContentGaps() {
    try {
      const trends = await this.getTrends();
      return trends.filter((t) => !t.covered);
    } catch (error) {
      return mockTrends.filter((t) => !t.covered);
    }
  },

  async getInsights(category = "all") {
    try {
      const intel = await this.getChannelIntelligence();
      // If we have master summary insights, format them into insight cards
      if (intel?.masterSummary?.growth_friction_points) {
        const customInsights = [
          ...intel.masterSummary.growth_friction_points.map((p, idx) => ({
            id: `insight-friction-${idx}`,
            title: `Address Viewer Friction: ${p.slice(0, 45)}...`,
            category: "Content Strategy",
            priority: "High",
            description: p,
            impact: "High Retention Growth",
            actionableSteps: ["Clarify technical jargon", "Add on-screen diagrams", "Pace complex concepts"],
            metrics: { current: "6.8%", potential: "8.5%" },
            status: "new",
          })),
          ...(intel.masterSummary.strategic_growth_roadmap || []).map((step, idx) => ({
            id: `insight-roadmap-${idx}`,
            title: `${step.phase || `Phase ${idx + 1}`}: ${step.objective || "Strategic Milestone"}`,
            category: "Audience Growth",
            priority: idx === 0 ? "High" : "Medium",
            description: step.actions?.join(" • ") || "Key channel milestone",
            impact: "+25% Velocity",
            actionableSteps: step.actions || [],
            metrics: { current: "Current", potential: step.target_metric || "+30%" },
            status: "new",
          })),
        ];

        if (category !== "all") {
          return customInsights.filter((i) => i.category.toLowerCase().includes(category.toLowerCase()));
        }
        return customInsights;
      }
      return mockInsights;
    } catch (error) {
      return mockInsights;
    }
  },

  async applyInsight(insightId) {
    return { success: true, message: "Insight marked as applied." };
  },

  async dismissInsight(insightId) {
    return { success: true, message: "Insight dismissed." };
  },

  async getRecommendations() {
    try {
      const intel = await this.getChannelIntelligence();
      let contentTips = [];

      if (intel?.masterSummary?.friction_points?.length || intel?.masterSummary?.best_performing_patterns?.length) {
        const frictions = intel.masterSummary.friction_points || [];
        const patterns = intel.masterSummary.best_performing_patterns || [];

        frictions.forEach((f, idx) => {
          contentTips.push({
            id: `rec-friction-${idx}`,
            category: "Audience Retention & Pacing",
            current: "Viewer Drop-Off Point Detected",
            recommendation: f,
            impact: "+22% Watch Time",
            status: "error",
          });
        });

        patterns.forEach((p, idx) => {
          contentTips.push({
            id: `rec-pattern-${idx}`,
            category: "Proven Channel Formula",
            current: "Standard Production",
            recommendation: `Double down on: ${p}`,
            impact: "+35% Engagement",
            status: "success",
          });
        });
      }

      if (contentTips.length === 0) {
        contentTips = [
          {
            id: 1,
            category: "Viewer Retention & Pacing",
            current: "Standard 30s Intro",
            recommendation: "Deliver the core promise within the first 10 seconds to hook viewers",
            impact: "+25% Retention",
            status: "warning",
          },
          {
            id: 2,
            category: "Thumbnail & Title Synergy",
            current: "Generic Titles",
            recommendation: "Use curiosity gap questions with high-contrast, face-forward visuals",
            impact: "+40% CTR",
            status: "error",
          },
          {
            id: 3,
            category: "Audience Call-to-Action",
            current: "End Screen Link Only",
            recommendation: "Place an interactive pinned comment question within 1 hour of upload",
            impact: "+50% Comments",
            status: "success",
          },
          {
            id: 4,
            category: "Publishing Strategy",
            current: "Irregular Upload Times",
            recommendation: "Publish during your audience's peak active hours (4 PM - 7 PM)",
            impact: "+18% Initial Views",
            status: "warning",
          },
        ];
      }

      return {
        heatmap: [
          [2, 3, 5, 4, 3, 2, 1],
          [3, 4, 6, 5, 4, 3, 2],
          [4, 5, 7, 6, 5, 4, 3],
          [5, 6, 8, 7, 6, 5, 4],
          [6, 7, 9, 8, 7, 6, 5],
          [7, 8, 10, 9, 8, 7, 6],
          [8, 9, 11, 10, 9, 8, 7],
        ],
        contentTips,
        suggestedTags: intel?.niche?.content_pillars?.length
          ? intel.niche.content_pillars
          : [
              "#YouTubeGrowth",
              "#ContentCreation",
              "#VideoSEO",
              "#CreatorEconomy",
              "#AudienceRetention",
              "#AlgorithmOptimization",
            ],
      };
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      return {
        heatmap: [
          [2, 3, 5, 4, 3, 2, 1],
          [3, 4, 6, 5, 4, 3, 2],
          [4, 5, 7, 6, 5, 4, 3],
          [5, 6, 8, 7, 6, 5, 4],
          [6, 7, 9, 8, 7, 6, 5],
          [7, 8, 10, 9, 8, 7, 6],
          [8, 9, 11, 10, 9, 8, 7],
        ],
        contentTips: [
          {
            id: 1,
            category: "Viewer Retention & Pacing",
            current: "Standard 30s Intro",
            recommendation: "Deliver the core promise within the first 10 seconds to hook viewers",
            impact: "+25% Retention",
            status: "warning",
          },
          {
            id: 2,
            category: "Thumbnail & Title Synergy",
            current: "Generic Titles",
            recommendation: "Use curiosity gap questions with high-contrast, face-forward visuals",
            impact: "+40% CTR",
            status: "error",
          },
          {
            id: 3,
            category: "Audience Call-to-Action",
            current: "End Screen Link Only",
            recommendation: "Place an interactive pinned comment question within 1 hour of upload",
            impact: "+50% Comments",
            status: "success",
          },
        ],
        suggestedTags: [
          "#YouTubeGrowth",
          "#ContentCreation",
          "#VideoSEO",
          "#CreatorEconomy",
          "#AudienceRetention",
        ],
      };
    }
  },

  // --- Live trend detection (proxies to the Python microservice) ---

  async getLiveTrends(params = {}) {
    try {
      const response = await api.get("/trends/live", {
        params,
        timeout: 90000,
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch live trends:", error);
      throw error;
    }
  },

  async getLiveTrendsCached(limit = 20) {
    try {
      const response = await api.get("/trends/live/cached", {
        params: { limit },
      });
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch cached live trends:", error);
      throw error;
    }
  },

  async getLiveTrendsHealth() {
    try {
      const response = await api.get("/trends/live/health");
      return response.data;
    } catch (error) {
      console.error("Failed to check live trends service health:", error);
      throw error;
    }
  },

  async bookmarkTrend(trendId) {
    return { success: true, trendId };
  },

  async searchTrends(query) {
    const trends = await this.getTrends();
    return trends.filter(
      (t) =>
        t.topic?.toLowerCase().includes(query.toLowerCase()) ||
        t.category?.toLowerCase().includes(query.toLowerCase()),
    );
  },
};

export default trendsService;
