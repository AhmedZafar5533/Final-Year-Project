import express from 'express';
import { getAuthUrl, handleCallback, getYoutubeAnalytics, getVideoAnalytics, getVideoComments } from '../controllers/youtubeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/auth-url', protect, getAuthUrl);
router.get('/callback', protect, handleCallback);
router.get('/analytics', protect, getYoutubeAnalytics);
router.get('/video-analytics', protect, getVideoAnalytics);
router.get('/video-comments', protect, getVideoComments);

export default router;
