import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  supabaseId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  fullName: String,
  avatarUrl: String,
  lastLogin: { type: Date, default: Date.now },
  youtubeTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Number,
    connected: { type: Boolean, default: false }
  }
});

const User = mongoose.model('User', userSchema);
export default User;
