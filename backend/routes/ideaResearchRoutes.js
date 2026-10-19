import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { startResearch, listResearch, getResearch, refreshResearch } from '../controllers/ideaResearchController.js';

const router = express.Router();
router.use(protect);
router.post('/', startResearch);
router.get('/', listResearch);
router.get('/:id', getResearch);
router.post('/:id/refresh', refreshResearch);
export default router;
