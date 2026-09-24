import mongoose from 'mongoose';
import { fetchAndSynthesizeMarketTrends } from '../services/trendService.js';
import { detectChannelNiche } from '../services/deepseekService.js';
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
      channel: t.relatedVideos?.[0]?.title ? "Top Niche Creators" : `${nicheName} Creators`,
      scores: {
        trend: parseFloat((oppScore / 100).toFixed(2)),
        relevance: parseFloat(Math.max(0.65, 0.94 - (idx * 0.05)).toFixed(2)),
        google: parseFloat(Math.max(0.60, 0.90 - (idx * 0.04)).toFixed(2)),
        engagement: parseFloat(Math.max(0.60, 0.88 - (idx * 0.03)).toFixed(2)),
      },
      engagement: {
        views: viewsNum,
        views_fmt: viewsNum >= 1000000 ? `${(viewsNum / 1000000).toFixed(1)}M` : `${Math.round(viewsNum / 1000)}K`,
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
    id: "gen-ai-agents",
    title: "Autonomous AI Reasoning Agents: Local LLMs, Tool-Use & Multi-Agent Systems",
    topic: "Autonomous AI Agents & Reasoning Models",
    category: "Artificial Intelligence & Tech",
    channel: "AI Frontier Labs",
    scores: { trend: 0.96, relevance: 0.82, google: 0.95, engagement: 0.92 },
    engagement: { views: 3200000, views_fmt: "3.2M", likes: 145000, comments: 9200 },
    match: {
      matched_keywords: ["#AIAgents", "#MachineLearning", "#LLMs", "#DeepSeek"],
      reason: "High viewer retention on technical walkthroughs, local LLM installations, and agent workflows."
    }
  },
  {
    id: "gen-creator-production",
    title: "Cinematic High-Retention Editing: Sound Design, Pacing & Visual Storytelling Secrets",
    topic: "Modern Video Editing & Retention Architecture",
    category: "Creator Economy & Production",
    channel: "Creator Masterclass",
    scores: { trend: 0.93, relevance: 0.79, google: 0.91, engagement: 0.89 },
    engagement: { views: 2400000, views_fmt: "2.4M", likes: 110000, comments: 6400 },
    match: {
      matched_keywords: ["#VideoEditing", "#Storytelling", "#CreatorEconomy", "#YouTubeTips"],
      reason: "Surging creator demand for advanced storytelling techniques that maintain average view duration > 60%."
    }
  },
  {
    id: "gen-nextgen-hardware",
    title: "Next-Gen Silicon & Desktop Performance: Neural Chips, GPUs & Efficient Workstations",
    topic: "Next-Gen Computing & Custom Hardware",
    category: "Hardware & Gadgets",
    channel: "Hardware Nexus",
    scores: { trend: 0.89, relevance: 0.74, google: 0.88, engagement: 0.86 },
    engagement: { views: 1950000, views_fmt: "1.9M", likes: 82000, comments: 4800 },
    match: {
      matched_keywords: ["#Hardware", "#TechReview", "#CustomPC", "#Silicon"],
      reason: "Consistent organic interest in benchmark comparisons, power efficiency, and creator workstation builds."
    }
  },
  {
    id: "gen-smart-automation",
    title: "Full-Stack Automation Pipelines: Webhooks, API Integration & Workflow Architecture",
    topic: "Full-Stack Automation & Developer Tools",
    category: "Software & Automation",
    channel: "Modern Engineering",
    scores: { trend: 0.87, relevance: 0.71, google: 0.86, engagement: 0.84 },
    engagement: { views: 1600000, views_fmt: "1.6M", likes: 64000, comments: 3900 },
    match: {
      matched_keywords: ["#Automation", "#APIs", "#Productivity", "#WebDev"],
      reason: "Massive growth in viewers seeking to automate repetitive tasks and connect modern software services."
    }
  }
];

/**
 * Helper to get or build an authenticated YouTube client for a user
 */
async function getAuthenticatedYoutubeClient(userId) {
  if (!userId) return null;
  try {
    const user = await User.findById(userId);
    if (!user?.youtubeTokens?.connected || !user?.youtubeTokens?.accessToken) {
      return null;
    }

    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/auth/callback'
    );

    let accessToken = user.youtubeTokens.accessToken;
    let refreshToken = user.youtubeTokens.refreshToken;
    let expiryDate = user.youtubeTokens.expiryDate;

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });

    if (expiryDate && Date.now() >= (expiryDate - 120000) && refreshToken) {
      try {
        const { credentials } = await auth.refreshAccessToken();
        auth.setCredentials(credentials);
        await User.findByIdAndUpdate(userId, {
          $set: {
            'youtubeTokens.accessToken': credentials.access_token,
            'youtubeTokens.expiryDate': credentials.expiry_date,
            'youtubeTokens.connected': true,
          }
        });
      } catch (refErr) {
        console.warn('Failed to refresh YouTube token for trends:', refErr.message);
      }
    }

    return google.youtube({ version: 'v3', auth });
  } catch (err) {
    console.warn('Could not initialize authenticated YouTube client:', err.message);
    return null;
  }
}

/**
 * 1. GET /api/trends/live
 * Runs the live trend-detection pipeline for the channel's niche
 */
export const getLiveTrends = async (req, res) => {
  const { region = "Global" } = req.query;
  const userId = req.user?._id;

  try {
    let niche = null;
    let channelName = "Antigravity Studio";
    let youtubeClient = null;
    let isConnected = false;
    let sampleVideos = [];
    let channelMeta = null;

    if (userId && mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        if (user.channelTitle) channelName = user.channelTitle;
        if (user.youtubeTokens?.connected) {
          isConnected = true;
          youtubeClient = await getAuthenticatedYoutubeClient(userId);
        }
      }

      // Check stored ChannelIntelligence for this specific user first
      const channelIntel = await ChannelIntelligence.findOne({
        $or: [{ userId }, { channelId: `channel-${userId}` }]
      }).sort({ createdAt: -1 });

      if (channelIntel?.niche?.primary_niche) {
        niche = channelIntel.niche;
        if (channelIntel.channelTitle) channelName = channelIntel.channelTitle;
      }
    }

    // If user is connected to YouTube but has no niche saved yet, dynamically fetch channel info and sample videos to detect niche
    if (isConnected && youtubeClient && (!niche || !niche.primary_niche)) {
      try {
        const channelResponse = await youtubeClient.channels.list({
          mine: true,
          part: 'snippet,contentDetails,statistics',
        });
        const channel = channelResponse.data.items?.[0];
        if (channel) {
          channelName = channel.snippet?.title || channelName;
          channelMeta = {
            title: channel.snippet?.title || '',
            description: channel.snippet?.description || '',
            subscriberCount: channel.statistics?.subscriberCount || '0',
            videoCount: channel.statistics?.videoCount || '0'
          };
          const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
          if (uploadsPlaylistId) {
            const playlistRes = await youtubeClient.playlistItems.list({
              playlistId: uploadsPlaylistId,
              part: 'snippet',
              maxResults: 6,
            });
            const videoIds = playlistRes.data.items?.map(item => item.snippet?.resourceId?.videoId).filter(Boolean).join(',');
            if (videoIds) {
              const vidsRes = await youtubeClient.videos.list({
                id: videoIds,
                part: 'snippet,statistics',
              });
              sampleVideos = vidsRes.data.items || [];
            }
          }
          // Detect the channel's niche dynamically
          niche = await detectChannelNiche({
            channel: channelMeta,
            channelStats: channelMeta,
            sampleVideos
          });
        }
      } catch (ytErr) {
        console.warn('Error fetching live channel metadata for trends:', ytErr.message);
      }
    }

    // Fallback if still no niche
    if (!niche) {
      if (!userId || !isConnected) {
        // Fallback to demo channel intelligence if available
        let demoIntel = null;
        if (mongoose.connection.readyState === 1) {
          demoIntel = await ChannelIntelligence.findOne({ channelId: 'demo-antigravity-studio' });
        }
        if (demoIntel?.niche?.primary_niche) {
          niche = demoIntel.niche;
          channelName = demoIntel.channelTitle || channelName;
        } else {
          niche = {
            primary_niche: "Astrophysics, Space & Deep Tech",
            sub_niches: ["Quantum Mechanics", "Exoplanets", "Theoretical Physics"],
            content_pillars: ["#Astrophysics", "#QuantumPhysics", "#SpaceExploration"]
          };
        }
      } else {
        // Connected user with custom name but offline API
        niche = await detectChannelNiche({
          channel: { title: channelName },
          channelStats: {},
          sampleVideos: []
        });
      }
    }

    // Fetch and synthesize trends for the channel's detected niche
    const rawTrends = await fetchAndSynthesizeMarketTrends({
      niche,
      youtubeClient,
      isDemo: !isConnected
    });

    const nicheTrends = formatLiveTrendItems(rawTrends, niche.primary_niche);

    // Save/update ChannelIntelligence cache for connected user
    if (userId && mongoose.connection.readyState === 1) {
      try {
        await ChannelIntelligence.findOneAndUpdate(
          { $or: [{ userId }, { channelId: `channel-${userId}` }] },
          {
            $set: {
              userId,
              channelId: `channel-${userId}`,
              channelTitle: channelName,
              niche,
              marketTrends: rawTrends,
              updatedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
      } catch (saveErr) {
        console.warn('Could not cache synthesized trends in ChannelIntelligence:', saveErr.message);
      }
    }

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
    let isConnected = false;

    // Pull from saved ChannelIntelligence if DB is connected
    let channelIntel = null;
    if (mongoose.connection.readyState === 1 && userId) {
      const user = await User.findById(userId);
      if (user) {
        if (user.channelTitle) channelName = user.channelTitle;
        if (user.youtubeTokens?.connected) isConnected = true;
      }
      channelIntel = await ChannelIntelligence.findOne({
        $or: [{ userId }, { channelId: `channel-${userId}` }]
      }).sort({ createdAt: -1 });
    }

    // Only fallback to demo channel if user is NOT connected to their own channel
    if (!channelIntel && (!userId || !isConnected)) {
      if (mongoose.connection.readyState === 1) {
        channelIntel = await ChannelIntelligence.findOne({ channelId: 'demo-antigravity-studio' });
      }
    }

    if (channelIntel && channelIntel.marketTrends?.length > 0) {
      if (channelIntel.channelTitle) channelName = channelIntel.channelTitle;
      if (channelIntel.niche?.primary_niche) channelNiche = channelIntel.niche.primary_niche;
      nicheTrends = formatLiveTrendItems(channelIntel.marketTrends, channelNiche);
    } else {
      let detectedNiche = { primary_niche: channelNiche };
      if (channelIntel?.niche) {
        detectedNiche = channelIntel.niche;
        channelNiche = detectedNiche.primary_niche;
      } else if (isConnected) {
        detectedNiche = await detectChannelNiche({
          channel: { title: channelName },
          channelStats: {},
          sampleVideos: []
        });
        channelNiche = detectedNiche.primary_niche;
      }
      const rawTrends = await fetchAndSynthesizeMarketTrends({
        niche: detectedNiche,
        isDemo: !isConnected
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
          source: isConnected ? "Channel Intelligence Live Cache" : "Saved Channel Intelligence Cache",
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
    let channelIntel = null;
    let isConnected = false;
    let channelName = "Antigravity Studio";

    if (userId && mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        if (user.channelTitle) channelName = user.channelTitle;
        if (user.youtubeTokens?.connected) isConnected = true;
      }
      channelIntel = await ChannelIntelligence.findOne({
        $or: [{ userId }, { channelId: `channel-${userId}` }]
      }).sort({ createdAt: -1 });
    }

    if (!channelIntel && (!userId || !isConnected)) {
      if (mongoose.connection.readyState === 1) {
        channelIntel = await ChannelIntelligence.findOne({ channelId: 'demo-antigravity-studio' });
      }
    }

    let trends = channelIntel?.marketTrends || [];
    if (trends.length === 0) {
      let niche = channelIntel?.niche;
      if (!niche) {
        if (isConnected) {
          niche = await detectChannelNiche({
            channel: { title: channelName },
            channelStats: {},
            sampleVideos: []
          });
        } else {
          niche = { primary_niche: "Astrophysics, Space & Deep Tech" };
        }
      }
      trends = await fetchAndSynthesizeMarketTrends({
        niche,
        isDemo: !isConnected
      });
    }

    res.status(200).json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
