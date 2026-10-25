import { researchConfig } from '../../config/research.js';
import { discover } from './discovery.js';
import { collectEvidence } from './evidence.js';
import { analyzeEvidence } from './analysis.js';
import { createResearchLogger } from './logger.js';
import { getChannelCompetitors } from './channelCompetitors.js';

export async function runResearch(job, { signal, stage = async () => {} } = {}) {
  const config = researchConfig();
  const usage = {};
  const started = Date.now();
  const log = createResearchLogger('competitor', job._id || job.ideaKey);
  const reportStage = async value => { log('stage', { stage: value }); await stage(value); };
  const run = { signal, usage, language: job.context?.language || 'en', log };
  log('research.started');
  await reportStage('planning');
  const context = { ...(job.context || {}), refreshComments: job.generation > 0 };
  if (job.userId && context.ownChannelId) {
    try {
      await reportStage('channel competitors');
      context.channelCompetitors = await getChannelCompetitors({ userId: job.userId,
        channel: { youtubeChannelId: context.ownChannelId, title: context.channelTitle, subscriberCount: context.ownSubscribers, researchLanguage: context.language },
        niche: context.nicheDetails || { primary_niche: context.niche }, config, signal, log, usage });
    } catch (error) {
      signal.throwIfAborted();
      log('channels.unavailable', { error: error.name });
    }
  }
  const discovery = await discover(job.idea, context, config, run);
  if (job.userId && context.ownChannelId && !context.channelCompetitors) discovery.limitations.push('Saved channel competitors were unavailable; topic discovery was used.');
  log('discovery.completed', { videos: discovery.videos.length, pages: discovery.pages.length });
  await reportStage('collecting');
  const evidence = await collectEvidence(discovery, config, run);
  signal.throwIfAborted();
  // Bound persistence and model input even when upstream providers return large content.
  if (Buffer.byteLength(JSON.stringify(evidence)) > 2 * 1024 * 1024) throw new Error('Research evidence exceeded the size limit');
  log('evidence.completed', { ...evidence.coverage, warnings: evidence.limitations.length });
  await reportStage('analyzing');
  const report = await analyzeEvidence(job.idea, job.context || {}, evidence, run);
  usage.elapsedMs = Date.now() - started;
  await reportStage('saving');
  log('research.completed', { status: report.partial ? 'partial' : 'completed', elapsedMs: usage.elapsedMs });
  return { report, evidence, usage, status: report.partial ? 'partial' : 'completed' };
}
