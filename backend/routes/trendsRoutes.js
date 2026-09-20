import express from 'express';
import {
  getLiveTrends,
  getLiveTrendsCached,
  getPythonServiceHealth,
  getTrends
} from '../controllers/trendsController.js';
import { protectOptional } from '../middleware/authMiddleware.js';

const router = express.Router();

// Live Trend Pipeline & ML Health Check
router.get('/live/health', getPythonServiceHealth);
router.get('/live/cached', protectOptional, getLiveTrendsCached);
router.get('/live', protectOptional, getLiveTrends);

// Standard Market Trends
router.get('/', protectOptional, getTrends);

export default router;
