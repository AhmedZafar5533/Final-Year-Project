import { supabase } from '../config/supabase.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:5000/api/auth/callback',
    },
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Redirect the user to the Supabase OAuth URL
  res.redirect(data.url);
};

export const emailSignup = async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    // 1. Check if user already exists in our DB
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please login instead.' 
      });
    }

    // 2. Attempt Supabase Signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) return res.status(400).json({ error: error.message });
    
    const user = data.user;
    if (!user) return res.status(400).json({ error: 'Signup failed' });

    // 3. Handle Email Verification (OTP)
    // If Supabase is configured to require email confirmation, session will be null
    if (data.session === null && user.identities?.length > 0) {
      return res.status(200).json({ 
        message: 'Signup successful! Please check your email for a verification link.',
        requiresVerification: true 
      });
    }

    // 4. If already verified or auto-confirm is on, sync and login
    const dbUser = await User.findOneAndUpdate(
      { email: user.email },
      {
        supabaseId: user.id,
        fullName: fullName,
        lastLogin: new Date(),
      },
      { returnDocument: 'after', upsert: true }
    );

    const token = jwt.sign(
      { id: dbUser._id, supabaseId: dbUser.supabaseId },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: dbUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const emailSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return res.status(400).json({ error: 'Please verify your email before logging in.' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    const user = data.user;

    const dbUser = await User.findOneAndUpdate(
      { email: user.email },
      {
        supabaseId: user.id,
        lastLogin: new Date(),
      },
      { returnDocument: 'after', upsert: true }
    );

    const token = jwt.sign(
      { id: dbUser._id, supabaseId: dbUser.supabaseId },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: dbUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const callback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect('http://localhost:5173/?error=NoCodeProvided');
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return res.redirect(`http://localhost:5173/?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.user;

  try {
    // Sync user with Database
    const dbUser = await User.findOneAndUpdate(
      { email: user.email },
      {
        supabaseId: user.id,
        fullName: user.user_metadata.full_name,
        avatarUrl: user.user_metadata.avatar_url,
        lastLogin: new Date(),
      },
      { returnDocument: 'after', upsert: true }
    );

    // Issue internal JWT
    const token = jwt.sign(
      { id: dbUser._id, supabaseId: dbUser.supabaseId },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    res.redirect('http://localhost:5173/');
  } catch (dbError) {
    console.error('Error syncing user info to DB:', dbError);
    res.redirect('http://localhost:5173/?error=DatabaseSyncFailed');
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

export const getCurrentUser = (req, res) => {
  // req.user is set by the protect middleware
  res.json({ user: req.user });
};
