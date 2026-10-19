import mongoose from 'mongoose';
import IdeaResearch, { ResearchBudget } from '../../models/IdeaResearch.js';
import ChannelIntelligence from '../../models/ChannelIntelligence.js';
import { researchConfig, researchError } from '../../config/research.js';
import { attachResearchIdentity, fingerprint, uniqueIdeas } from './identity.js';

export const active = job => ['queued', 'running'].includes(job.status);
export const fresh = job => Boolean(job.report && job.expiresAt && new Date(job.expiresAt) > new Date());
export const validId = id => typeof id === 'string' && mongoose.isValidObjectId(id);

export function requireResearchDatabase() {
  if (mongoose.connection.readyState !== 1) throw researchError('Research needs a database connection.');
}

export async function prepareIntelligenceResearch(document) {
  if (document.researchRevision) return document;
  const value = attachResearchIdentity(document.toObject ? document.toObject() : structuredClone(document));
  const migrated = await ChannelIntelligence.findOneAndUpdate(
    { _id: document._id, researchRevision: { $exists: false } },
    { $set: { researchRevision: value.researchRevision, masterSummary: value.masterSummary } },
    { returnDocument: 'after' }
  );
  return migrated || ChannelIntelligence.findById(document._id);
}

export async function ownedIntelligence(userId, id) {
  requireResearchDatabase();
  if (!validId(String(id))) throw researchError('Recommendation set not found.', 404);
  const doc = await ChannelIntelligence.findOne({
    _id: id,
    $or: [{ userId }, { isDemo: true, channelId: 'demo-antigravity-studio' }]
  });
  if (!doc) throw researchError('Recommendation set not found.', 404);
  return prepareIntelligenceResearch(doc);
}

async function reserveBudget(userId) {
  const day = new Date().toISOString().slice(0, 10);
  const key = { userId, day };
  try {
    await ResearchBudget.updateOne(key, {
      $setOnInsert: { ...key, count: 0, expiresAt: new Date(Date.now() + 3 * 86400000) }
    }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const budget = await ResearchBudget.findOneAndUpdate(
    { ...key, count: { $lt: researchConfig().dailyLimit } }, { $inc: { count: 1 } }, { returnDocument: 'after' }
  );
  if (!budget) throw researchError('The daily research limit has been reached. Try again tomorrow.', 429);
}

export async function enqueueResearch(userId, intelligence, ideaKey, refresh = false) {
  requireResearchDatabase();
  await Promise.all([IdeaResearch.init(), ResearchBudget.init()]);
  const idea = uniqueIdeas(intelligence).find(item => item.ideaKey === ideaKey);
  if (!idea) throw researchError('This idea has changed. Reload recommendations before researching it.', 409);
  const key = { userId, intelligenceId: intelligence._id, revision: intelligence.researchRevision, ideaKey };
  let job = await IdeaResearch.findOne(key);
  let created = false;
  if (!job) {
    try {
      job = await IdeaResearch.create({
        ...key, fingerprint: fingerprint(idea),
        channelId: intelligence.channelId,
        idea: idea.toObject ? idea.toObject() : idea,
        context: {
          niche: intelligence.niche?.primary_niche || '',
          audience: intelligence.niche?.target_audience || '',
          ownChannelId: intelligence.youtubeChannelId || '',
          language: intelligence.researchLanguage || 'en'
        }
      });
      created = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      job = await IdeaResearch.findOne(key);
    }
  }
  if (!created) {
    if (active(job) || (!refresh && fresh(job))) return job;
    job = await IdeaResearch.findOneAndUpdate({
      _id: job._id, userId, status: { $in: ['completed', 'partial', 'failed'] }, generation: job.generation
    }, {
      $set: { status: 'queued', eligible: false, stage: 'planning', error: null, attempts: 0 },
      $inc: { generation: 1 }
    }, { returnDocument: 'after' });
    if (!job) return IdeaResearch.findOne(key);
  }
  try {
    await reserveBudget(userId);
    return await IdeaResearch.findOneAndUpdate(
      { _id: job._id, generation: job.generation, status: 'queued', eligible: false },
      { $set: { eligible: true, nextAttemptAt: new Date() } }, { returnDocument: 'after' }
    );
  } catch (error) {
    await IdeaResearch.updateOne({ _id: job._id, generation: job.generation, eligible: false }, {
      $set: { status: 'failed', error: error.statusCode ? error.message : 'Research could not be queued.' }
    });
    throw error;
  }
}

export async function scheduleAutomaticResearch(intelligence) {
  if (intelligence.isDemo || !intelligence.userId) return;
  for (const idea of uniqueIdeas(intelligence).slice(0, researchConfig().autoCount)) {
    try { await enqueueResearch(intelligence.userId, intelligence, idea.ideaKey); }
    catch (error) { console.warn('Automatic research unavailable:', error.statusCode || 'database error'); }
  }
}

export function publicJob(job, detail = false) {
  const value = job.toObject ? job.toObject() : job;
  return {
    _id: String(value._id), intelligenceId: String(value.intelligenceId), ideaKey: value.ideaKey,
    status: value.status, stage: value.stage, error: value.error,
    hasReport: Boolean(value.report), stale: Boolean(value.report && !fresh(value)),
    completedAt: value.completedAt, expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
    ...(detail ? { report: value.report, evidence: value.evidence, usage: value.usage } : {})
  };
}

export async function researchForScript(userId, reference) {
  if (typeof reference?.ideaKey !== 'string' || !reference.ideaKey || reference.ideaKey.length > 64 ||
      !validId(reference.intelligenceId)) return null;
  requireResearchDatabase();
  const job = await IdeaResearch.findOne({
    userId, intelligenceId: reference.intelligenceId, ideaKey: reference.ideaKey, report: { $exists: true }
  }).lean();
  if (!job?.report) return null;
  // Only saved, validated reports owned by this user reach the model.
  return {
    idea: job.idea, researchedAt: job.completedAt, stale: !fresh(job),
    findings: job.report,
    sources: (job.evidence?.sources || []).map(({ id, url, title }) => ({ id, url, title }))
  };
}
