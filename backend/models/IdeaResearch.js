import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  intelligenceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  revision: { type: String, required: true },
  channelId: String,
  ideaKey: { type: String, required: true },
  fingerprint: { type: String, required: true },
  idea: { type: mongoose.Schema.Types.Mixed, required: true },
  context: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['queued', 'running', 'completed', 'partial', 'failed'], default: 'queued' },
  stage: { type: String, default: 'planning' },
  eligible: { type: Boolean, default: false },
  generation: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  leaseToken: String,
  leaseExpiresAt: Date,
  nextAttemptAt: { type: Date, default: Date.now },
  error: String,
  report: mongoose.Schema.Types.Mixed,
  evidence: mongoose.Schema.Types.Mixed,
  usage: mongoose.Schema.Types.Mixed,
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date
}, { timestamps: true, bufferCommands: false });

schema.index({ userId: 1, intelligenceId: 1, revision: 1, ideaKey: 1 }, { unique: true });
schema.index({ eligible: 1, status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: Date
}, { bufferCommands: false });
budgetSchema.index({ userId: 1, day: 1 }, { unique: true });
budgetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ResearchBudget = mongoose.model('ResearchBudget', budgetSchema);
export default mongoose.model('IdeaResearch', schema);
