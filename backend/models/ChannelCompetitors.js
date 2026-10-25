import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ownChannelId: { type: String, required: true },
  contextKey: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true, bufferCommands: false });
schema.index({ userId: 1, ownChannelId: 1 }, { unique: true });
export default mongoose.model('ChannelCompetitors', schema);
