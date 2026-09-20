import mongoose from 'mongoose';
import { fetchAndSynthesizeMarketTrends } from '../services/trendService.js';
import ChannelIntelligence from '../models/ChannelIntelligence.js';
import User from '../models/User.js';
import oauth2Client from '../config/youtube.js';
import { google } from 'googleapis';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Format raw synthesized trends into the schema expected by LiveTrendsPanel
 */
function formatLiveTrendItems(trends, nicheName = 'Science & Technology') {
  return trends.map((t, idx) => {
    const oppScore = t.opportunityScore || 85;
    const viewsNum = parseInt((t.searchVolume || '350K').replace(/[^\d]/g, ''), 10) * 1000 || 1200000;
    
    return {
      id: t.id || `trend-live-${idx + 1}`,
      title: t.topic,
      topic: t.topic,
      category: t.category || nicheName,
      channel: t.relatedVideos?.[0]?.title ? "Top Niche Channels" : "Science Creators",
      scores: {
        trend: parseFloat((oppScore / 100).toFixed(2)),
        relevance: 0.92 - (idx * 0.04),
        google: 0.88 - (idx * 0.03),
        engagement: 0.86 - (idx * 0.02),
      },
      engagement: {
        views: viewsNum,
        views_fmt: `${(viewsNum / 1000000).toFixed(1)}M`,
        likes: Math.round(viewsNum * 0.04),
        comments: Math.round(viewsNum * 0.003),
      },
      match: {
        matched_keywords: t.hashtags || [`#${nicheName.replace(/\s+/g, '')}`, '#Trending'],
        reason: t.marketInsight || "High engagement velocity and viewer interest in your content niche.",
      },
      marketInsight: t.marketInsight,
      hashtags: t.hashtags,
      opportunityScore: oppScore,
      growthData: t.growthData || [40, 55, 65, 75, 88, oppScore],
      relatedVideos: t.relatedVideos || [],
    };
  });
}

/**
 * High-velocity cross-niche general trending topics for YouTube
 */
const GENERAL_TRENDING_ITEMS = [
  {
    id: "gen-superconductors",
    title: "Next-Gen Ambient Superconductors & Condensed Matter Physics Breakthroughs",
    topic: "Room-Temperature Superconductivity",
    category: "Physics & Engineering",
    channel: "Applied Physics Research",
    scores: { trend: 0.96, relevance: 0.75, google: 0.94, engagement: 0.91 },
    engagement: { views: 3400000, views_fmt: "3.4M", likes: 125000, comments: 8400 },
    match: {
      matched_keywords: ["#Superconductivity", "#MaterialsScience", "#QuantumPhysics"],
      reason: "Surging multi-week global search velocity and debate across science communities."
    }
  },
  {
    id: "gen-ai-agents",
    title: "Autonomous AI Agents: Local LLMs, Tool-Use & Multi-Agent Orchestration",
    topic: "Autonomous AI Reasoning Models",
    category: "Computer Science & AI",
    channel: "AI Frontier Labs",
    scores: { trend: 0.93, relevance: 0.68, google: 0.91, engagement: 0.87 },
    engagement: { views: 2800000, views_fmt: "2.8M", likes: 98000, comments: 5600 },
    match: {
      matched_keywords: ["#AIAgents", "#MachineLearning", "#LLMs"],
      reason: "High viewer retention on technical walkthroughs and agent system architectures."
    }
  },
  {
    id: "gen-starship-orbital",
    title: "SpaceX Starship Flight Tests: Orbital Re-entry & Mechanical Tower Catches",
    topic: "Starship Flight Architecture",
    category: "Aerospace & Engineering",
    channel: "Cosmic Frontier",
    scores: { trend: 0.89, relevance: 0.82, google: 0.90, engagement: 0.88 },
    engagement: { views: 4200000, views_fmt: "4.2M", likes: 210000, comments: 15400 },
    match: {
      matched_keywords: ["#SpaceX", "#Starship", "#SpaceExploration"],
      reason: "Massive organic viewership around heavy-lift rocketry and thermal protection systems."
    }
  },
  {
    id: "gen-quantum-computing",
    title: "Fault-Tolerant Quantum Computing: Neutral Atom Qubits & Logical Gate Fidelity",
    topic: "Neutral Atom Quantum Processors",
    category: "Quantum Computing",
    channel: "Quantum Horizons",
    scores: { trend: 0.87, relevance: 0.88, google: 0.85, engagement: 0.84 },
    engagement: { views: 1600000, views_fmt: "1.6M", likes: 62000, comments: 3900 },
    match: {
      matched_keywords: ["#QuantumComputing", "#Qubits", "#QuantumTech"],
      reason: "Growing mainstream curiosity about physical vs logical quantum error correction."
    }
  }
];

/**
 * 1. GET /api/trends/live
 * Runs the live trend-detection pipeline for the channel's niche
 */
export const getLiveTrends = async (req, res) => {
  const { region = "Global" } = req.query;
  const userId = req.user?._id;

  try {
    let niche = {
      primary_niche: "Astrophysics, Space & Deep Tech",
      sub_niches: ["Quantum Mechanics", "Exoplanets", "Theoretical Physics"],
      content_pillars: ["#Astrophysics", "#QuantumPhysics", "#SpaceExploration"]
    };
    let channelName = "Antigravity Studio";
    let youtubeClient = null;

    if (userId && mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        if (user.channelTitle) channelName = user.channelTitle;
        if (user.youtubeTokens?.connected && user.youtubeTokens?.accessToken) {
          oauth2Client.setCredentials({
            access_token: user.youtubeTokens.accessToken,
            refresh_token: user.youtubeTokens.refreshToken,
          });
          youtubeClient = google.youtube({ version: 'v3', auth: oauth2Client });
        }
      }

      // Check stored ChannelIntelligence for detected niche
      const channelIntel = await ChannelIntelligence.findOne({
        $or: [{ userId }, { channelId: 'demo-antigravity-studio' }]
      }).sort({ createdAt: -1 });

      if (channelIntel?.niche?.primary_niche) {
        niche = channelIntel.niche;
        if (channelIntel.channelTitle) channelName = channelIntel.channelTitle;
      }
    }

    // Fetch and synthesize trends
    const rawTrends = await fetchAndSynthesizeMarketTrends({
      niche,
      youtubeClient,
      isDemo: !youtubeClient
    });

    const nicheTrends = formatLiveTrendItems(rawTrends, niche.primary_niche);

    res.status(200).json({
      success: true,
      data: {
        channel: {
          name: channelName,
          niche: niche.primary_niche,
          region,
        },
        meta: {
          fetched_time: new Date().toLocaleTimeString(),
          source: youtubeClient ? "YouTube Data API v3 + Nova AI Synthesis" : "Nova AI Pre-Computed Market Intelligence",
        },
        niche_trends: nicheTrends,
        general_trends: GENERAL_TRENDING_ITEMS,
      }
    });
  } catch (error) {
    console.error("Failed to run live trend detection:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to execute live trend detection."
    });
  }
};

/**
 * 2. GET /api/trends/live/cached
 * Fast retrieval of previously synthesized trends from Mongo / memory
 */
export const getLiveTrendsCached = async (req, res) => {
  const userId = req.user?._id;

  try {
    let nicheTrends = [];
    let channelName = "Antigravity Studio";
    let channelNiche = "Astrophysics, Space & Deep Tech";

    // Attempt to pull from saved ChannelIntelligence if DB is connected
    let channelIntel = null;
    if (mongoose.connection.readyState === 1) {
      channelIntel = await ChannelIntelligence.findOne({
        $or: [{ userId }, { channelId: 'demo-antigravity-studio' }]
      }).sort({ createdAt: -1 });
    }

    if (channelIntel && channelIntel.marketTrends?.length > 0) {
      if (channelIntel.channelTitle) channelName = channelIntel.channelTitle;
      if (channelIntel.niche?.primary_niche) channelNiche = channelIntel.niche.primary_niche;
      nicheTrends = formatLiveTrendItems(channelIntel.marketTrends, channelNiche);
    } else {
      const rawTrends = await fetchAndSynthesizeMarketTrends({
        niche: { primary_niche: channelNiche },
        isDemo: true
      });
      nicheTrends = formatLiveTrendItems(rawTrends, channelNiche);
    }

    res.status(200).json({
      success: true,
      data: {
        channel: {
          name: channelName,
          niche: channelNiche,
          region: "Global",
        },
        meta: {
          fetched_time: "Cached",
          source: "Saved Channel Intelligence Cache",
        },
        niche_trends: nicheTrends,
        general_trends: GENERAL_TRENDING_ITEMS,
      }
    });
  } catch (error) {
    console.error("Failed to load cached live trends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load cached trends."
    });
  }
};

/**
 * 3. GET /api/trends/live/health
 * Health check querying the Python microservice on port 8000
 */
export const getPythonServiceHealth = async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        data: {
          status: "online",
          model: data.model || "cardiffnlp/twitter-roberta-base-sentiment-latest",
          classes: data.classes || ["POSITIVE", "NEUTRAL", "NEGATIVE"],
          service: "FastAPI Sentiment & NLP Microservice",
        }
      });
    }
    throw new Error(`Service returned HTTP ${response.status}`);
  } catch (err) {
    // If python microservice is temporarily stopped, report offline status without HTTP 500 error
    res.status(200).json({
      success: true,
      data: {
        status: "offline",
        message: "Python microservice offline on port 8000. Start it with ./start.sh in sentiment_service.",
        service: "FastAPI Sentiment & NLP Microservice",
      }
    });
  }
};

/**
 * 4. GET /api/trends
 * Returns standard synthesized market trends for the channel
 */
export const getTrends = async (req, res) => {
  const userId = req.user?._id;
  try {
    const channelIntel = await ChannelIntelligence.findOne({
      $or: [{ userId }, { channelId: 'demo-antigravity-studio' }]
    }).sort({ createdAt: -1 });

    const trends = channelIntel?.marketTrends || [];
    res.status(200).json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
