import express from 'express';
import { getAuthUrl, handleCallback, getYoutubeAnalytics, getVideoAnalytics } from '../controllers/youtubeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/auth-url', protect, getAuthUrl);
router.get('/callback', protect, handleCallback);
router.get('/analytics', protect, getYoutubeAnalytics);
router.get('/video-analytics', protect, getVideoAnalytics);

export default router;
