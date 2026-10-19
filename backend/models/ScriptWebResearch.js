import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sessionId: { type: String, required: true },
  sources: { type: [mongoose.Schema.Types.Mixed], default: [] },
  images: { type: [mongoose.Schema.Types.Mixed], default: [] },
  searchResults: { type: [mongoose.Schema.Types.Mixed], default: [] },
  expiresAt: { type: Date, required: true }
}, { timestamps: true, bufferCommands: false });

schema.index({ userId: 1, sessionId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('ScriptWebResearch', schema);
