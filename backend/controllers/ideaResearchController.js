import IdeaResearch from '../models/IdeaResearch.js';
import { researchError } from '../config/research.js';
import {
  ownedIntelligence, enqueueResearch, publicJob, validId, requireResearchDatabase
} from '../services/research/queue.js';

const handle = action => async (req, res) => {
  try { await action(req, res); }
  catch (error) {
    res.status(error.statusCode || 503).json({
      error: error.statusCode ? error.message : 'Research is temporarily unavailable.'
    });
  }
};

export const startResearch = handle(async (req, res) => {
  const { intelligenceId, ideaKey } = req.body;
  const intelligence = await ownedIntelligence(req.user._id, intelligenceId);
  if (typeof ideaKey !== 'string' || ideaKey.length > 64) throw researchError('Select a saved idea.', 400);
  const job = await enqueueResearch(req.user._id, intelligence, ideaKey);
  res.status(['queued', 'running'].includes(job.status) ? 202 : 200).json(publicJob(job, true));
});

export const listResearch = handle(async (req, res) => {
  const intelligence = await ownedIntelligence(req.user._id, req.query.intelligenceId);
  const jobs = await IdeaResearch.find({
    userId: req.user._id, intelligenceId: intelligence._id, revision: intelligence.researchRevision
  }).select('-evidence -report -idea -context').lean();
  // Select a small projection while retaining report existence for status badges.
  const reportIds = await IdeaResearch.find({
    userId: req.user._id, intelligenceId: intelligence._id, revision: intelligence.researchRevision,
    report: { $exists: true }
  }).select('_id').lean();
  const withReport = new Set(reportIds.map(job => String(job._id)));
  res.json({ jobs: jobs.map(job => publicJob({ ...job, report: withReport.has(String(job._id)) ? {} : undefined })) });
});

export const getResearch = handle(async (req, res) => {
  requireResearchDatabase();
  if (!validId(req.params.id)) throw researchError('Research not found.', 404);
  const job = await IdeaResearch.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!job) throw researchError('Research not found.', 404);
  res.json(publicJob(job, true));
});

export const refreshResearch = handle(async (req, res) => {
  requireResearchDatabase();
  if (!validId(req.params.id)) throw researchError('Research not found.', 404);
  const previous = await IdeaResearch.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!previous) throw researchError('Research not found.', 404);
  const intelligence = await ownedIntelligence(req.user._id, previous.intelligenceId);
  const job = await enqueueResearch(req.user._id, intelligence, previous.ideaKey, true);
  res.status(202).json(publicJob(job, true));
});
