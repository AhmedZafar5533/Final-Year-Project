import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import IdeaResearch, { ResearchBudget } from '../models/IdeaResearch.js';
import ChannelIntelligence from '../models/ChannelIntelligence.js';
import { researchConfig } from '../config/research.js';
import { runResearch } from '../services/research/pipeline.js';
import { createResearchLogger } from '../services/research/logger.js';

export async function runOneResearchJob({ Model = IdeaResearch, pipeline = runResearch,
  isCurrent = async job => Boolean(await ChannelIntelligence.exists({ _id: job.intelligenceId, researchRevision: job.revision }))
} = {}) {
  const now = new Date();
  // A process interrupted between record creation and budget reservation must not run unbudgeted work.
  await Model.updateMany({
    status: 'queued', eligible: false, updatedAt: { $lt: new Date(Date.now() - 120000) }
  }, { $set: { status: 'failed', error: 'Research scheduling was interrupted. Please retry.' } });
  await Model.updateMany({
    status: 'running', leaseExpiresAt: { $lte: now }, attempts: { $gte: 3 }
  }, { $set: { status: 'failed', error: 'Research was interrupted repeatedly. Please retry.', eligible: false } });

  const token = randomUUID();
  const job = await Model.findOneAndUpdate({
    eligible: true, attempts: { $lt: 3 },
    $or: [
      { status: 'queued', nextAttemptAt: { $lte: now } },
      { status: 'running', leaseExpiresAt: { $lte: now } }
    ]
  }, {
    $set: { status: 'running', leaseToken: token, leaseExpiresAt: new Date(Date.now() + 90000),
      startedAt: now, error: null },
    $inc: { attempts: 1 }
  }, { returnDocument: 'after', sort: { createdAt: 1 }, lean: true });
  if (!job) return false;
  const log = createResearchLogger('worker', job._id);
  log('job.claimed', { attempt: job.attempts, generation: job.generation });

  const owner = { _id: job._id, generation: job.generation, leaseToken: token, status: 'running' };
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(researchConfig().deadlineMs)]);
  let heartbeating = false;
  const heartbeat = setInterval(async () => {
    if (heartbeating) return;
    heartbeating = true;
    try {
      const result = await Model.updateOne(owner, { $set: { leaseExpiresAt: new Date(Date.now() + 90000) } });
      if (!result.matchedCount) controller.abort(new Error('Research lease lost'));
    } catch { controller.abort(new Error('Research database unavailable')); }
    finally { heartbeating = false; }
  }, 20000);
  try {
    if (!await isCurrent(job)) {
      log('job.obsolete');
      await Model.updateOne(owner, {
        $set: { status: 'failed', eligible: false, error: 'This recommendation was replaced. Research the current idea instead.' },
        $unset: { leaseToken: '', leaseExpiresAt: '' }
      });
      return true;
    }
    const result = await pipeline(job, {
      signal,
      stage: async value => {
        signal.throwIfAborted();
        const updated = await Model.updateOne(owner, { $set: { stage: value } });
        if (!updated.matchedCount) throw new Error('Research lease lost');
      }
    });
    signal.throwIfAborted();
    await Model.updateOne(owner, {
      $set: { ...result, eligible: false, stage: 'done', completedAt: new Date(),
        expiresAt: new Date(Date.now() + researchConfig().freshnessMs), error: null },
      $unset: { leaseToken: '', leaseExpiresAt: '' }
    });
    log('job.saved', { status: result.status });
  } catch (error) {
    const retry = error.retryable === true && job.attempts < 3 && !signal.aborted;
    log('job.failed', { retry, attempt: job.attempts, status: error.upstreamStatus, error: error.cause?.code || error.name, timedOut: signal.aborted });
    await Model.updateOne(owner, {
      $set: { status: retry ? 'queued' : 'failed', eligible: retry,
        nextAttemptAt: new Date(Date.now() + 30000 * job.attempts),
        error: retry ? 'A provider is unavailable. Research will retry.' :
          error.statusCode ? error.message : 'Research could not finish. Check service configuration and retry.' },
      $unset: { leaseToken: '', leaseExpiresAt: '' }
    });
  } finally { clearInterval(heartbeat); }
  return true;
}

export async function startWorker() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([IdeaResearch.init(), ResearchBudget.init()]);
  console.log('Competitor research worker started.');
  let stopped = false;
  let wake;
  const stop = () => { stopped = true; wake?.(); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    while (!stopped) {
      try { if (await runOneResearchJob()) continue; }
      catch { console.error('Research worker is waiting for its database connection.'); }
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 3000);
        wake = () => { clearTimeout(timer); resolve(); };
      });
    }
  } finally { await mongoose.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startWorker().catch(() => { console.error('Research worker could not connect to MongoDB.'); process.exitCode = 1; });
}
