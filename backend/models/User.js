import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  supabaseId: { type: String, required: false, sparse: true },
  googleId: { type: String, required: false, sparse: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String }, // Hashed password for email/password authentication
  fullName: { type: String, trim: true },
  avatarUrl: { type: String },
  lastLogin: { type: Date, default: Date.now },
  youtubeTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number,
    connected: { type: Boolean, default: false }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
