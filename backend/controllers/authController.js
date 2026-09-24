import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Direct Google OAuth client for application authentication
const getGoogleAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/auth/callback'
  );
};

// 1. Google OAuth Initiate
export const login = async (req, res) => {
  try {
    const client = getGoogleAuthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'select_account',
    });
    res.redirect(url);
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    res.redirect(`http://localhost:5173/login?error=${encodeURIComponent('Failed to initiate Google sign-in')}`);
  }
};

// 2. Google OAuth Callback
export const callback = async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('http://localhost:5173/login?error=NoCodeProvided');
  }

  try {
    const client = getGoogleAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    let profile = {};
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const { data } = await oauth2.userinfo.get();
      profile = data || {};
    } catch (profileErr) {
      console.warn('Could not fetch Google profile info:', profileErr.message);
    }

    let dbUser = null;

    // Check if user is logged in via HTTP-only token cookie
    const existingToken = req.cookies?.token;
    if (existingToken) {
      try {
        const decoded = jwt.verify(existingToken, process.env.JWT_SECRET || 'supersecret');
        if (decoded?.id) {
          dbUser = await User.findById(decoded.id);
        }
      } catch (jwtErr) {
        console.warn('Existing JWT invalid or expired during callback:', jwtErr.message);
      }
    }

    // If not found via token cookie, find or create by email
    if (!dbUser && profile.email) {
      const emailNormalized = profile.email.toLowerCase().trim();
      dbUser = await User.findOne({ email: emailNormalized });

      if (!dbUser) {
        dbUser = await User.create({
          email: emailNormalized,
          fullName: profile.name || emailNormalized.split('@')[0],
          avatarUrl: profile.picture,
          googleId: profile.id,
          lastLogin: new Date(),
        });
      } else {
        dbUser.lastLogin = new Date();
        if (!dbUser.avatarUrl && profile.picture) dbUser.avatarUrl = profile.picture;
        if (!dbUser.fullName && profile.name) dbUser.fullName = profile.name;
        if (!dbUser.googleId && profile.id) dbUser.googleId = profile.id;
        await dbUser.save();
      }
    }

    if (!dbUser) {
      return res.redirect('http://localhost:5173/login?error=GoogleAccountMissingEmail');
    }

    // Save YouTube Tokens if present or if state is youtube_connect
    const hasYouTubeScope = tokens.scope && (tokens.scope.includes('youtube') || tokens.scope.includes('yt-analytics'));
    if (state === 'youtube_connect' || hasYouTubeScope || tokens.access_token) {
      dbUser.youtubeTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || dbUser.youtubeTokens?.refreshToken,
        expiryDate: tokens.expiry_date,
        connected: true,
      };
      dbUser.lastLogin = new Date();
      await dbUser.save();

      if (state === 'youtube_connect') {
        return res.redirect('http://localhost:5173/settings?youtube=connected');
      }
    }

    const token = jwt.sign(
      { id: dbUser._id },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = {
      id: dbUser._id,
      _id: dbUser._id,
      name: dbUser.fullName,
      fullName: dbUser.fullName,
      email: dbUser.email,
      avatar: dbUser.channelAvatarUrl || dbUser.avatarUrl,
      avatarUrl: dbUser.avatarUrl,
      channelTitle: dbUser.channelTitle,
      channelAvatarUrl: dbUser.channelAvatarUrl,
      youtubeTokens: dbUser.youtubeTokens,
    };

    const encodedUser = encodeURIComponent(JSON.stringify(userObj));
    res.redirect(`http://localhost:5173/dashboard?auth_token=${token}&user=${encodedUser}`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`http://localhost:5173/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`);
  }
};

// 3. Email & Password Signup (Native MongoDB Auth)
export const emailSignup = async (req, res) => {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please login instead.',
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in MongoDB
    const dbUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: fullName?.trim() || normalizedEmail.split('@')[0],
      lastLogin: new Date(),
    });

    // Issue internal JWT
    const token = jwt.sign(
      { id: dbUser._id },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = dbUser.toObject();
    delete userObj.password;
    userObj.id = userObj._id;
    userObj.name = userObj.fullName;
    userObj.avatar = userObj.avatarUrl;

    res.status(201).json({
      success: true,
      token,
      user: userObj,
      data: userObj,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
};

// 4. Email & Password Signin (Native MongoDB Auth)
export const emailSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(400).json({
        error: 'This account was created with Google. Please use Google Login.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    // Issue internal JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'supersecret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.password;
    userObj.id = userObj._id;
    userObj.name = userObj.fullName;
    userObj.avatar = userObj.avatarUrl;

    res.json({
      success: true,
      token,
      user: userObj,
      data: userObj,
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, error: err.message || 'Signin failed' });
  }
};

// 5. Logout
export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

// 6. Get Current Authenticated User
export const getCurrentUser = (req, res) => {
  // req.user is set by the protect middleware
  const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete userObj.password;
  userObj.id = userObj._id;
  userObj.name = userObj.fullName;
  userObj.avatar = userObj.channelAvatarUrl || userObj.avatarUrl;

  const token = req.cookies?.token || jwt.sign(
    { id: userObj._id },
    process.env.JWT_SECRET || 'supersecret',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    user: userObj,
    data: userObj,
    token,
  });
};
