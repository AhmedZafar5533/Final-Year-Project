import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    req.user = await User.findById(decoded.id).select('-password -__v');
    if (!req.user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};
