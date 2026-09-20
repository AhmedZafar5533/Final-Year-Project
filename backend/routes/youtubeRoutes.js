import express from 'express';
import {
  getAuthUrl,
  handleCallback,
  getYoutubeAnalytics,
  getVideoAnalytics,
  getVideoComments,
  getVideoInsights,
  disconnectYoutube,
  getChannelIntelligence,
  analyzeChannelIntelligence,
  handleScriptStudioChat
} from '../controllers/youtubeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/auth-url', protect, getAuthUrl);
router.get('/callback', protect, handleCallback);
router.get('/analytics', protect, getYoutubeAnalytics);
router.get('/video-analytics', protect, getVideoAnalytics);
router.get('/video-comments', protect, getVideoComments);
router.get('/video-insights', protect, getVideoInsights);
router.post('/disconnect', protect, disconnectYoutube);

// Channel Ingestion, Niche Detection & Strategy Synthesis
router.get('/channel-intelligence', protect, getChannelIntelligence);
router.post('/channel-intelligence/analyze', protect, analyzeChannelIntelligence);

// Interactive AI Script Studio Chatbot
router.post('/script-studio/chat', protect, handleScriptStudioChat);

export default router;
