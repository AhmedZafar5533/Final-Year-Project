import express from 'express';
import { login, callback, logout, getCurrentUser, emailSignup, emailSignin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/login', login);
router.post('/signup', emailSignup);
router.post('/signin', emailSignin);
router.get('/callback', callback);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

export default router;
