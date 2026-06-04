import oauth2Client, { SCOPES } from '../config/youtube.js';
import User from '../models/User.js';
import { google } from 'googleapis';

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
    const startDate = '2020-01-01';

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
    // Column order matches the metrics string above:
    // day, views, likes, dislikes, comments, shares, subscribersGained, subscribersLost, estimatedMinutesWatched, averageViewDuration
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
      // Pre-computed totals so the frontend doesn't have to re-sum
      totals: aggregated,

      // Raw daily rows + column headers for charting
      daily: {
        headers: dailyAnalytics.data.columnHeaders?.map((h) => h.name) || [],
        rows: dailyAnalytics.data.rows || [],
      },

      // Country data
      countries: {
        headers: countryAnalytics.data.columnHeaders?.map((h) => h.name) || [],
        rows: countryAnalytics.data.rows || [],
      },

      // Demographics
      demographics: {
        rows: demographicsResult.data.rows || [],
      },

      // Channel metadata from Data API
      channel: channel?.snippet || null,
      channelStats: channel?.statistics || null,

      // All videos with lifetime stats from Data API
      videos: videosData,
    });
  } catch (error) {
    if (error.message === 'YouTube not connected') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Analytics Fetch Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 4. Get per-video analytics
export const getVideoAnalytics = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  try {
    const { youtubeAnalytics } = await getAuthenticatedClients(req.user._id);
    const today = new Date().toISOString().split('T')[0];

    const [dailyResponse, countryResponse] = await Promise.all([
      youtubeAnalytics.reports.query({
        ids: 'channel==MINE',
        startDate: '2020-01-01',
        endDate: today,
        metrics: 'views,likes,dislikes,comments,shares,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'day',
        sort: 'day',
        filters: `video==${videoId}`,
      }),
      youtubeAnalytics.reports
        .query({
          ids: 'channel==MINE',
          startDate: '2020-01-01',
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
      return res.status(400).json({ error: error.message });
    }
    console.error('Video Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 5. Get video comments
export const getVideoComments = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  try {
    const { youtube } = await getAuthenticatedClients(req.user._id);

    const response = await youtube.commentThreads.list({
      part: 'snippet',
      videoId: videoId,
      maxResults: 20,
      order: 'relevance',
    });

    const comments = response.data.items?.map((item) => {
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

    res.json({ comments });
  } catch (error) {
    if (error.message === 'YouTube not connected') {
      return res.status(400).json({ error: error.message });
    }
    // Handle comments disabled by video owner (typical YouTube API error: commentThreadsDisabled)
    if (error.errors?.[0]?.reason === 'commentsDisabled' || error.message?.includes('commentsDisabled')) {
      return res.json({ comments: [], commentsDisabled: true });
    }
    console.error('Video Comments Error:', error);
    res.status(500).json({ error: error.message });
  }
};

