import oauth2Client, { SCOPES } from '../config/youtube.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ChannelIntelligence from '../models/ChannelIntelligence.js';
import { google } from 'googleapis';
import {
  mockVideos,
  getMockComments,
  generateDailyStats,
  generateVideoDailyStats,
  getMockCountryStats,
  getMockVideoCountryStats
} from '../config/mockYoutubeData.js';
import { getCommentsSentiment } from '../services/sentimentService.js';
import { getVideoTranscriptData, extractTimestampSentiments } from '../services/transcriptService.js';
import { fetchAndSynthesizeMarketTrends } from '../services/trendService.js';
import {
  generateVideoIntelligence,
  detectChannelNiche,
  analyzeVideoDeeply,
  generateMasterChannelSynthesis,
  chatScriptStudio
} from '../services/deepseekService.js';

// Helper: set up authenticated clients for a user
const getAuthenticatedClients = async (userId) => {
  const user = await User.findById(userId);
  if (!user?.youtubeTokens?.connected) {
    throw new Error('YouTube not connected');
  }

  oauth2Client.setCredentials({
    access_token: user.youtubeTokens.accessToken,
    refresh_token: user.youtubeTokens.refreshToken,
    expiry_date: user.youtubeTokens.expiryDate,
  });

  return {
    youtubeAnalytics: google.youtubeAnalytics({ version: 'v2', auth: oauth2Client }),
    youtube: google.youtube({ version: 'v3', auth: oauth2Client }),
  };
};

// 1. Generate Auth URL
export const getAuthUrl = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: 'youtube_connect',
  });
  res.json({ url });
};

// 2. Handle Callback & Store Tokens
export const handleCallback = async (req, res) => {
  const { code } = req.query;
  const userId = req.user._id;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await User.findByIdAndUpdate(userId, {
      youtubeTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        connected: true,
      },
    });

    res.redirect('http://localhost:5173/profile?youtube=connected');
  } catch (error) {
    console.error('YouTube Auth Error:', error);
    res.redirect('http://localhost:5173/profile?error=youtube_auth_failed');
  }
};

// 3. Get comprehensive Analytics Data
export const getYoutubeAnalytics = async (req, res) => {
  try {
    const { youtubeAnalytics, youtube } = await getAuthenticatedClients(req.user._id);
    const today = new Date().toISOString().split('T')[0];
    const startDate = '2005-01-01';

    // ---------- Run all independent queries in parallel ----------
    const [
      channelResponse,
      dailyAnalytics,
      countryAnalytics,
      demographicsResult,
    ] = await Promise.all([
      // Channel Info (Data API v3)
      youtube.channels.list({
        mine: true,
        part: 'snippet,contentDetails,statistics',
      }),

      // Daily metrics (Analytics API)
      youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate: today,
        metrics: 'views,likes,dislikes,comments,shares,subscribersGained,subscribersLost,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'day',
        sort: 'day',
      }),

      // Country breakdown (Analytics API)
      youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate: today,
        metrics: 'views,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'country',
        sort: '-views',
        maxResults: 25,
      }),

      // Demographics (Analytics API) — wrapped so a failure doesn't kill everything
      youtubeAnalytics.reports
        .query({
          ids: 'channel==MINE',
          startDate,
          endDate: today,
          metrics: 'viewerPercentage',
          dimensions: 'ageGroup,gender',
        })
        .catch((e) => {
          console.warn('Demographics unavailable:', e.message);
          return { data: { rows: [] } };
        }),
    ]);

    // Log raw data for debugging
    console.log('--- RAW YOUTUBE API RESULTS ---');
    console.log('Channel Data:', JSON.stringify(channelResponse.data, null, 2));
    console.log('Daily Analytics:', JSON.stringify(dailyAnalytics.data, null, 2));
    console.log('Country Analytics:', JSON.stringify(countryAnalytics.data, null, 2));
    console.log('Demographics Result:', JSON.stringify(demographicsResult.data, null, 2));
    console.log('-------------------------------');

    // ---------- Process channel & videos ----------
    const channel = channelResponse.data.items?.[0];
    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;

    let videosData = [];
    if (uploadsPlaylistId) {
      // Fetch up to 50 videos from the uploads playlist
      const playlistResponse = await youtube.playlistItems.list({
        playlistId: uploadsPlaylistId,
        part: 'snippet',
        maxResults: 50,
      });

      const videoIds = playlistResponse.data.items
        .map((item) => item.snippet.resourceId.videoId)
        .join(',');

      if (videoIds) {
        const videosResponse = await youtube.videos.list({
          id: videoIds,
          part: 'snippet,statistics,contentDetails',
        });
        videosData = videosResponse.data.items;
      }
    }

    // ---------- Aggregate totals from daily analytics rows ----------
    const rows = dailyAnalytics.data.rows || [];
    const aggregated = rows.reduce(
      (acc, row) => ({
        views: acc.views + row[1],
        likes: acc.likes + row[2],
        dislikes: acc.dislikes + row[3],
        comments: acc.comments + row[4],
        shares: acc.shares + row[5],
        subscribersGained: acc.subscribersGained + row[6],
        subscribersLost: acc.subscribersLost + row[7],
        estimatedMinutesWatched: acc.estimatedMinutesWatched + row[8],
      }),
      { views: 0, likes: 0, dislikes: 0, comments: 0, shares: 0, subscribersGained: 0, subscribersLost: 0, estimatedMinutesWatched: 0 }
    );

    // Derived metrics
    aggregated.netSubscribers = aggregated.subscribersGained - aggregated.subscribersLost;
    aggregated.likeRatio = aggregated.likes + aggregated.dislikes > 0
      ? ((aggregated.likes / (aggregated.likes + aggregated.dislikes)) * 100).toFixed(1)
      : '100.0';
    aggregated.avgWatchTimeMinutes = rows.length > 0
      ? (aggregated.estimatedMinutesWatched / aggregated.views).toFixed(2)
      : '0';

    // ---------- Send response ----------
    res.json({
      totals: aggregated,
      daily: {
        headers: dailyAnalytics.data.columnHeaders?.map((h) => h.name) || [],
        rows: dailyAnalytics.data.rows || [],
      },
      countries: {
        headers: countryAnalytics.data.columnHeaders?.map((h) => h.name) || [],
        rows: countryAnalytics.data.rows || [],
      },
      demographics: {
        rows: demographicsResult.data.rows || [],
      },
      channel: channel?.snippet || null,
      channelStats: channel?.statistics || null,
      videos: videosData,
    });
  } catch (error) {
    if (error.message === 'YouTube not connected') {
      const dailyStats = generateDailyStats();
      const countryStats = getMockCountryStats();
      
      const aggregated = dailyStats.reduce(
        (acc, row) => ({
          views: acc.views + row[1],
          likes: acc.likes + row[2],
          dislikes: acc.dislikes + row[3],
          comments: acc.comments + row[4],
          shares: acc.shares + row[5],
          subscribersGained: acc.subscribersGained + row[6],
          subscribersLost: acc.subscribersLost + row[7],
          estimatedMinutesWatched: acc.estimatedMinutesWatched + row[8],
        }),
        { views: 0, likes: 0, dislikes: 0, comments: 0, shares: 0, subscribersGained: 0, subscribersLost: 0, estimatedMinutesWatched: 0 }
      );

      aggregated.netSubscribers = aggregated.subscribersGained - aggregated.subscribersLost;
      aggregated.likeRatio = ((aggregated.likes / (aggregated.likes + aggregated.dislikes)) * 100).toFixed(1);
      aggregated.avgWatchTimeMinutes = (aggregated.estimatedMinutesWatched / aggregated.views).toFixed(2);

      const formattedVideos = mockVideos.map(v => ({
        id: v.id,
        snippet: {
          title: v.title,
          description: v.description,
          publishedAt: v.publishDate,
          thumbnails: {
            default: { url: v.thumbnailUrl },
            medium: { url: v.thumbnailUrl },
            high: { url: v.thumbnailUrl }
          }
        },
        statistics: {
          viewCount: v.views.toString(),
          likeCount: v.likes.toString(),
          dislikeCount: v.dislikes.toString(),
          commentCount: v.commentsCount.toString(),
          favoriteCount: '0'
        },
        contentDetails: {
          duration: v.duration
        }
      }));

      return res.json({
        totals: aggregated,
        daily: {
          headers: ['day', 'views', 'likes', 'dislikes', 'comments', 'shares', 'subscribersGained', 'subscribersLost', 'estimatedMinutesWatched', 'averageViewDuration'],
          rows: dailyStats
        },
        countries: {
          headers: countryStats.headers,
          rows: countryStats.rows
        },
        demographics: {
          rows: [
            ['18-24', 'male', 28.5],
            ['18-24', 'female', 12.0],
            ['25-34', 'male', 35.2],
            ['25-34', 'female', 15.1],
            ['35-44', 'male', 6.2],
            ['35-44', 'female', 3.0]
          ]
        },
        channel: {
          title: 'Antigravity Studio',
          description: 'Exploring space, futuristic physics, and antigravity technology.',
          thumbnails: {
            default: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60' }
          }
        },
        channelStats: {
          viewCount: '2085000',
          subscriberCount: '124500',
          videoCount: '2'
        },
        videos: formattedVideos,
        isDemo: true
      });
    }
    console.error('Analytics Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 4. Get per-video analytics
export const getVideoAnalytics = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  if (videoId.startsWith('vid')) {
    const dailyStats = generateVideoDailyStats(videoId);
    const countryStats = getMockVideoCountryStats(videoId);
    return res.json({
      daily: {
        headers: ['day', 'views', 'likes', 'dislikes', 'comments', 'shares', 'estimatedMinutesWatched', 'averageViewDuration'],
        rows: dailyStats
      },
      countries: {
        rows: countryStats.rows
      }
    });
  }

  try {
    const { youtubeAnalytics } = await getAuthenticatedClients(req.user._id);
    const today = new Date().toISOString().split('T')[0];

    const [dailyResponse, countryResponse] = await Promise.all([
      youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: '2005-01-01',
        endDate: today,
        metrics: 'views,likes,dislikes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'day',
        sort: 'day',
        filters: `video==${videoId}`,
      }),
      youtubeAnalytics.reports
        .query({
          ids: 'channel==MINE',
          startDate: '2005-01-01',
          endDate: today,
          metrics: 'views,estimatedMinutesWatched',
          dimensions: 'country',
          filters: `video==${videoId}`,
          sort: '-views',
          maxResults: 15,
        })
        .catch(() => ({ data: { rows: [] } })),
    ]);

    res.json({
      daily: {
        headers: dailyResponse.data.columnHeaders?.map((h) => h.name) || [],
        rows: dailyResponse.data.rows || [],
      },
      countries: {
        rows: countryResponse.data.rows || [],
      },
    });
  } catch (error) {
    if (error.message === 'YouTube not connected') {
      const dailyStats = generateVideoDailyStats(videoId);
      const countryStats = getMockVideoCountryStats(videoId);
      return res.json({
        daily: {
          headers: ['day', 'views', 'likes', 'dislikes', 'comments', 'shares', 'estimatedMinutesWatched', 'averageViewDuration'],
          rows: dailyStats
        },
        countries: {
          rows: countryStats.rows
        }
      });
    }
    console.error('Video Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 5. Get video comments
export const getVideoComments = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  if (videoId.startsWith('vid')) {
    const { comments, totalComments } = getMockComments(videoId, 100);
    const { comments: enrichedComments, sentimentSummary } = await getCommentsSentiment(comments, videoId);
    return res.json({ comments: enrichedComments, totalComments, sentimentSummary });
  }

  try {
    const { youtube } = await getAuthenticatedClients(req.user._id);

    const response = await youtube.commentThreads.list({
      part: 'snippet',
      videoId: videoId,
      maxResults: 50,
      order: 'relevance',
    });

    const rawComments = response.data.items?.map((item) => {
      const topComment = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        author: topComment.authorDisplayName,
        authorAvatar: topComment.authorProfileImageUrl,
        text: topComment.textDisplay,
        likes: topComment.likeCount,
        publishedAt: topComment.publishedAt,
        replyCount: item.snippet.totalReplyCount,
      };
    }) || [];

    const { comments: enrichedComments, sentimentSummary } = await getCommentsSentiment(rawComments, videoId);

    res.json({ comments: enrichedComments, totalComments: rawComments.length, sentimentSummary });
  } catch (error) {
    if (error.message === 'YouTube not connected') {
      const { comments, totalComments } = getMockComments(videoId, 100);
      const { comments: enrichedComments, sentimentSummary } = await getCommentsSentiment(comments, videoId);
      return res.json({ comments: enrichedComments, totalComments, sentimentSummary });
    }
    if (error.errors?.[0]?.reason === 'commentsDisabled' || error.message?.includes('commentsDisabled')) {
      return res.json({ comments: [], commentsDisabled: true, sentimentSummary: null });
    }
    console.error('Video Comments Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 6. Disconnect YouTube
export const disconnectYoutube = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { youtubeTokens: 1 }
    });
    res.json({ message: 'YouTube channel disconnected successfully' });
  } catch (error) {
    console.error('Disconnect YouTube Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 7. Get Nova AI Video Insights, Transcript & Chapter-Level Sentiment
export const getVideoInsights = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  try {
    let videoTitle = '';
    let videoDescription = '';
    let comments = [];

    if (videoId.startsWith('vid')) {
      const mockVid = mockVideos.find(v => v.id === videoId) || mockVideos[0];
      videoTitle = mockVid.title;
      videoDescription = mockVid.description;
      const { comments: rawMockComments } = getMockComments(videoId, 100);
      const sentimentResult = await getCommentsSentiment(rawMockComments, videoId);
      comments = sentimentResult.comments;
    } else {
      try {
        const { youtube } = await getAuthenticatedClients(req.user._id);
        const videoResponse = await youtube.videos.list({
          id: videoId,
          part: 'snippet',
        });
        const snippet = videoResponse.data.items?.[0]?.snippet;
        videoTitle = snippet?.title || 'Video';
        videoDescription = snippet?.description || '';

        const commsResponse = await youtube.commentThreads.list({
          part: 'snippet',
          videoId: videoId,
          maxResults: 50,
          order: 'relevance',
        }).catch(() => ({ data: { items: [] } }));

        const rawComments = commsResponse.data.items?.map((item) => {
          const topComment = item.snippet.topLevelComment.snippet;
          return {
            id: item.id,
            author: topComment.authorDisplayName,
            authorAvatar: topComment.authorProfileImageUrl,
            text: topComment.textDisplay,
            likes: topComment.likeCount,
            publishedAt: topComment.publishedAt,
            replyCount: item.snippet.totalReplyCount,
          };
        }) || [];

        const sentimentResult = await getCommentsSentiment(rawComments, videoId);
        comments = sentimentResult.comments;
      } catch (authErr) {
        console.warn('Live API clients unavailable for video insights, using defaults:', authErr.message);
      }
    }

    const transcriptData = await getVideoTranscriptData(videoId);
    const transcriptText = transcriptData.transcript.map(t => t.text).join(' ');
    const chaptersWithSentiment = extractTimestampSentiments(comments, transcriptData.chapters);

    const total = comments.length;
    const posCount = comments.filter(c => c.sentiment?.label?.includes('POS')).length;
    const neuCount = comments.filter(c => c.sentiment?.label?.includes('NEU')).length;
    const negCount = comments.filter(c => c.sentiment?.label?.includes('NEG')).length;
    const sentimentSummary = {
      positive_count: posCount,
      neutral_count: neuCount,
      negative_count: negCount,
      positive_percentage: total > 0 ? Math.round((posCount / total) * 100) : 0,
      neutral_percentage: total > 0 ? Math.round((neuCount / total) * 100) : 0,
      negative_percentage: total > 0 ? Math.round((negCount / total) * 100) : 0,
      total
    };

    const deepseekInsights = await generateVideoIntelligence({
      videoId,
      title: videoTitle,
      description: videoDescription,
      transcriptText,
      sentimentSummary,
      chapters: transcriptData.chapters
    });

    res.json({
      videoId,
      title: videoTitle,
      description: videoDescription,
      chapters: chaptersWithSentiment,
      transcript: transcriptData.transcript,
      aiInsights: deepseekInsights,
      sentimentSummary
    });
  } catch (error) {
    console.error('Video Insights Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Memory fallback cache in case MongoDB is temporarily disconnected
const intelligenceCache = new Map();

// Helper to run the 3-step DeepSeek channel intelligence pipeline
const executeChannelAnalysisPipeline = async (userId, isDemo = false) => {
  let channelMeta = {
    title: 'Antigravity Studio',
    description: 'Exploring space, futuristic physics, and antigravity technology.',
    subscriberCount: '124500',
    videoCount: '5'
  };
  let targetVideos = mockVideos.slice(0, 5);

  let liveYoutubeClient = null;

  if (!isDemo && userId) {
    try {
      const { youtube } = await getAuthenticatedClients(userId);
      liveYoutubeClient = youtube;
      const channelResponse = await youtube.channels.list({
        mine: true,
        part: 'snippet,contentDetails,statistics',
      });
      const channel = channelResponse.data.items?.[0];
      if (channel) {
        channelMeta = {
          title: channel.snippet?.title || 'YouTube Channel',
          description: channel.snippet?.description || '',
          subscriberCount: channel.statistics?.subscriberCount || '0',
          videoCount: channel.statistics?.videoCount || '0'
        };

        const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) {
          const playlistRes = await youtube.playlistItems.list({
            playlistId: uploadsPlaylistId,
            part: 'snippet',
            maxResults: 5,
          });
          const videoIds = playlistRes.data.items.map(item => item.snippet.resourceId.videoId).join(',');
          if (videoIds) {
            const vidsRes = await youtube.videos.list({
              id: videoIds,
              part: 'snippet,statistics,contentDetails',
            });
            targetVideos = vidsRes.data.items || [];
          }
        }
      }
    } catch (authErr) {
      console.warn('Live clients unavailable for pipeline, using demo channel:', authErr.message);
      isDemo = true;
    }
  }

  const detectedNiche = await detectChannelNiche({
    channel: channelMeta,
    channelStats: channelMeta,
    sampleVideos: targetVideos
  });

  const marketTrends = await fetchAndSynthesizeMarketTrends({
    niche: detectedNiche,
    youtubeClient: liveYoutubeClient,
    isDemo
  });

  const videoPromises = targetVideos.slice(0, 5).map(async (video) => {
    try {
      let rawComments = [];
      const videoId = video.id;

      if (isDemo || (typeof videoId === 'string' && videoId.startsWith('vid'))) {
        const { comments } = getMockComments(videoId, 50);
        rawComments = comments;
      } else if (userId && liveYoutubeClient) {
        try {
          const commsRes = await liveYoutubeClient.commentThreads.list({
            part: 'snippet',
            videoId,
            maxResults: 30,
            order: 'relevance',
          });
          rawComments = (commsRes.data.items || []).map(item => {
            const top = item.snippet.topLevelComment.snippet;
            return {
              id: item.id,
              author: top.authorDisplayName,
              authorAvatar: top.authorProfileImageUrl,
              text: top.textDisplay,
              likes: top.likeCount || 0
            };
          });
        } catch (commErr) {
          console.warn(`Could not fetch comments for ${videoId}:`, commErr.message);
        }
      }

      const [sentimentResult, transcriptData] = await Promise.all([
        getCommentsSentiment(rawComments, videoId),
        getVideoTranscriptData(videoId)
      ]);
      const transcriptText = transcriptData?.transcript?.map(t => t.text).join(' ') || '';

      return await analyzeVideoDeeply({
        video,
        comments: sentimentResult.comments || rawComments,
        transcriptText,
        sentimentSummary: sentimentResult.sentimentSummary || {}
      });
    } catch (vidErr) {
      console.error(`Error analyzing video in pipeline:`, vidErr);
      return null;
    }
  });

  const rawAnalyses = await Promise.all(videoPromises);
  const videoAnalyses = rawAnalyses.filter(Boolean);

  const masterSummary = await generateMasterChannelSynthesis({
    channel: channelMeta,
    niche: detectedNiche,
    videoAnalyses,
    marketTrends
  });

  const channelId = isDemo ? 'demo-antigravity-studio' : `channel-${userId}`;
  const payload = {
    userId: isDemo ? null : userId,
    channelId,
    channelTitle: channelMeta.title,
    isDemo,
    niche: detectedNiche,
    marketTrends,
    videoAnalyses,
    masterSummary,
    analyzedAt: new Date(),
    status: 'completed'
  };

  if (mongoose.connection.readyState === 1) {
    try {
      const updated = await ChannelIntelligence.findOneAndUpdate(
        { channelId },
        payload,
        { upsert: true, returnDocument: 'after' }
      );
      return updated;
    } catch (dbErr) {
      console.warn('MongoDB save skipped, using memory cache:', dbErr.message);
    }
  }
  intelligenceCache.set(channelId, payload);
  return payload;
};

// 8. Get Channel Intelligence
export const getChannelIntelligence = async (req, res) => {
  const { refresh } = req.query;
  const userId = req.user?._id;

  let isDemo = true;
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user?.youtubeTokens?.connected) {
        isDemo = false;
      }
    } catch (e) {
      isDemo = true;
    }
  }

  const channelId = isDemo ? 'demo-antigravity-studio' : `channel-${userId}`;

  if (refresh !== 'true') {
    if (mongoose.connection.readyState === 1) {
      try {
        const existing = await ChannelIntelligence.findOne({ channelId });
        if (existing) {
          return res.json(existing);
        }
      } catch (e) {}
    }
    if (intelligenceCache.has(channelId)) {
      return res.json(intelligenceCache.get(channelId));
    }
  }

  try {
    const intelligence = await executeChannelAnalysisPipeline(userId, isDemo);
    res.json(intelligence);
  } catch (error) {
    console.error('Channel Intelligence Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 9. Re-Analyze Channel Intelligence
export const analyzeChannelIntelligence = async (req, res) => {
  const userId = req.user?._id;
  let isDemo = true;
  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user?.youtubeTokens?.connected) {
        isDemo = false;
      }
    } catch (e) {
      isDemo = true;
    }
  }

  try {
    const intelligence = await executeChannelAnalysisPipeline(userId, isDemo);
    res.json(intelligence);
  } catch (error) {
    console.error('Channel Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 10. AI Script Studio Chatbot Endpoint
export const handleScriptStudioChat = async (req, res) => {
  const { idea, channelContext, messages = [], currentScript = '' } = req.body;

  try {
    const response = await chatScriptStudio({
      idea,
      channelContext,
      messages,
      currentScript
    });

    res.json(response);
  } catch (error) {
    console.error('Script Studio Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
};
