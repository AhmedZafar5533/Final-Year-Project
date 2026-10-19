import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import { once } from 'node:events';
import User from '../models/User.js';
import ideaResearchRoutes from '../routes/ideaResearchRoutes.js';
import ChannelIntelligence from '../models/ChannelIntelligence.js';
import IdeaResearch, { ResearchBudget } from '../models/IdeaResearch.js';
import { attachResearchIdentity, uniqueIdeas } from '../services/research/identity.js';
import { enqueueResearch, ownedIntelligence, prepareIntelligenceResearch, publicJob, researchForScript, scheduleAutomaticResearch } from '../services/research/queue.js';
import { runOneResearchJob } from '../workers/ideaResearchWorker.js';
import { getResearch, listResearch, refreshResearch, startResearch } from '../controllers/ideaResearchController.js';
import { evidenceFixture, reportFixture } from './fixtures/research.js';

const uri = process.env.TEST_MONGODB_URI;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; } });

describe('research persistence and ownership', { skip: !uri }, () => {
  let intelligence, userId, otherUser, ideas;
  const originalLimit = process.env.RESEARCH_DAILY_LIMIT;
  before(async () => {
    await mongoose.connect(uri, { dbName: 'onlycreators_research_test_' + process.pid, serverSelectionTimeoutMS: 5000 });
    await Promise.all([ChannelIntelligence.init(), IdeaResearch.init(), ResearchBudget.init()]);
  });
  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (originalLimit === undefined) delete process.env.RESEARCH_DAILY_LIMIT;
    else process.env.RESEARCH_DAILY_LIMIT = originalLimit;
  });
  beforeEach(async () => {
    await Promise.all([ChannelIntelligence.deleteMany({}), IdeaResearch.deleteMany({}), ResearchBudget.deleteMany({})]);
    process.env.RESEARCH_DAILY_LIMIT = '20';
    userId = new mongoose.Types.ObjectId();
    otherUser = new mongoose.Types.ObjectId();
    const recommendations = Array.from({ length: 4 }, (_, index) => ({
      id: 'idea-' + index, title: 'Study workflow ' + index, hook: 'Try a practical example',
      angle: 'A complete revision session', why_it_will_perform: 'A viewer question'
    }));
    intelligence = await ChannelIntelligence.create(attachResearchIdentity({
      userId, channelId: 'channel-' + userId, isDemo: false,
      masterSummary: { overlap_recommendations: recommendations, next_video_recommendations: recommendations }
    }));
    ideas = uniqueIdeas(intelligence);
  });

  test('another user cannot resolve recommendations or read a report', async () => {
    await assert.rejects(ownedIntelligence(otherUser, String(intelligence._id)), { statusCode: 404 });
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    const res = response();
    await getResearch({ user: { _id: otherUser }, params: { id: String(job._id) } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(await researchForScript(otherUser, { intelligenceId: String(intelligence._id), ideaKey: ideas[0].ideaKey }), null);
  });

  test('concurrent duplicate requests create exactly one job and consume one daily credit', async () => {
    const jobs = await Promise.all(Array.from({ length: 8 }, () => enqueueResearch(userId, intelligence, ideas[0].ideaKey)));
    assert.equal(new Set(jobs.map(job => String(job._id))).size, 1);
    assert.equal(await IdeaResearch.countDocuments(), 1);
    assert.equal((await ResearchBudget.findOne({ userId })).count, 1);
    assert.equal((await IdeaResearch.findOne()).eligible, true);
  });

  test('automatic scheduling deduplicates lists and selects the first three ideas', async () => {
    await scheduleAutomaticResearch(intelligence);
    const jobs = await IdeaResearch.find({ userId });
    assert.equal(jobs.length, 3);
    assert.deepEqual(new Set(jobs.map(job => job.ideaKey)), new Set(ideas.slice(0, 3).map(idea => idea.ideaKey)));
  });

  test('edited or regenerated idea keys cannot start old research', async () => {
    await assert.rejects(enqueueResearch(userId, intelligence, 'old-idea-key'), { statusCode: 409 });
    const res = response();
    await startResearch({ user: { _id: userId }, body: { intelligenceId: String(intelligence._id), ideaKey: 'old-key' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(await IdeaResearch.countDocuments(), 0);
  });

  test('daily budget prevents excess jobs from becoming runnable', async () => {
    process.env.RESEARCH_DAILY_LIMIT = '2';
    await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await enqueueResearch(userId, intelligence, ideas[1].ideaKey);
    await assert.rejects(enqueueResearch(userId, intelligence, ideas[2].ideaKey), { statusCode: 429 });
    const refused = await IdeaResearch.findOne({ ideaKey: ideas[2].ideaKey });
    assert.equal(refused.status, 'failed');
    assert.equal(refused.eligible, false);
  });

  test('worker saves a valid report, and cached requests do not consume another credit', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    const report = reportFixture();
    await runOneResearchJob({ pipeline: async (_job, { stage }) => {
      await stage('analyzing');
      return { report, evidence: evidenceFixture(), usage: { deepseekCalls: 2 }, status: 'completed' };
    } });
    const saved = await IdeaResearch.findById(job._id);
    assert.equal(saved.status, 'completed');
    assert.equal(saved.leaseToken, undefined);
    assert.equal(saved.report.refinedIdea.angle, report.refinedIdea.angle);
    assert.equal(publicJob(saved).hasReport, true);
    await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    assert.equal((await ResearchBudget.findOne({ userId })).count, 1);
    const context = await researchForScript(userId, { intelligenceId: String(intelligence._id), ideaKey: ideas[0].ideaKey });
    assert.equal(context.idea.title, ideas[0].title);
    assert.ok(context.sources.every(source => !('text' in source)));
    const list = response();
    await listResearch({ user: { _id: userId }, query: { intelligenceId: String(intelligence._id) } }, list);
    assert.equal(list.body.jobs[0].hasReport, true);
    assert.equal('evidence' in list.body.jobs[0], false);
  });

  test('refresh retains the previous report while queuing a new generation', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await IdeaResearch.updateOne({ _id: job._id }, { $set: {
      status: 'completed', eligible: false, report: reportFixture(), expiresAt: new Date(Date.now() + 60000)
    } });
    const res = response();
    await refreshResearch({ user: { _id: userId }, params: { id: String(job._id) } }, res);
    assert.equal(res.statusCode, 202);
    assert.equal(res.body.hasReport, true);
    const updated = await IdeaResearch.findById(job._id);
    assert.equal(updated.generation, 1);
    assert.equal(updated.status, 'queued');
    assert.equal((await ResearchBudget.findOne({ userId })).count, 2);
  });

  test('an expired lease is reclaimed and completed after a worker interruption', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await IdeaResearch.updateOne({ _id: job._id }, { $set: {
      status: 'running', attempts: 1, leaseToken: 'crashed-worker', leaseExpiresAt: new Date(0)
    } });
    await runOneResearchJob({ pipeline: async () => ({
      status: 'partial', report: reportFixture(), evidence: evidenceFixture(), usage: {}
    }) });
    const recovered = await IdeaResearch.findById(job._id);
    assert.equal(recovered.status, 'partial');
    assert.equal(recovered.attempts, 2);
  });

  test('repeatedly interrupted work fails rather than remaining stuck forever', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await IdeaResearch.updateOne({ _id: job._id }, { $set: {
      status: 'running', attempts: 3, leaseExpiresAt: new Date(0)
    } });
    const ran = await runOneResearchJob({ pipeline: async () => assert.fail('Must not run') });
    assert.equal(ran, false);
    assert.equal((await IdeaResearch.findById(job._id)).status, 'failed');
  });

  test('a worker that loses its generation cannot overwrite newer work', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await runOneResearchJob({ pipeline: async () => {
      await IdeaResearch.updateOne({ _id: job._id }, {
        $inc: { generation: 1 }, $set: { status: 'queued' }, $unset: { leaseToken: '' }
      });
      return { status: 'completed', report: { stale: 'must not save' }, evidence: {}, usage: {} };
    } });
    const updated = await IdeaResearch.findById(job._id);
    assert.equal(updated.status, 'queued');
    assert.equal(updated.report, undefined);
  });

  test('transient provider errors queue a bounded retry', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await runOneResearchJob({ pipeline: async () => {
      throw Object.assign(new Error('Upstream rate limit'), { retryable: true });
    } });
    const updated = await IdeaResearch.findById(job._id);
    assert.equal(updated.status, 'queued');
    assert.equal(updated.eligible, true);
    assert.ok(updated.nextAttemptAt > new Date());
  });

  test('scheduling interrupted before budget reservation fails without running inference', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await IdeaResearch.updateOne({ _id: job._id }, {
      $set: { eligible: false, updatedAt: new Date(Date.now() - 180000) }
    }, { timestamps: false });
    await runOneResearchJob({ pipeline: async () => assert.fail('Unbudgeted job must not run') });
    assert.equal((await IdeaResearch.findById(job._id)).status, 'failed');
  });

  test('queued work for a replaced recommendation never starts inference', async () => {
    const job = await enqueueResearch(userId, intelligence, ideas[0].ideaKey);
    await ChannelIntelligence.updateOne({ _id: intelligence._id }, { $set: { researchRevision: 'new-revision' } });
    await runOneResearchJob({ pipeline: async () => assert.fail('Replaced recommendation must not run') });
    assert.equal((await IdeaResearch.findById(job._id)).status, 'failed');
  });

  test('legacy saved recommendations get persistent research keys on first access', async () => {
    await ChannelIntelligence.updateOne({ _id: intelligence._id }, {
      $unset: { researchRevision: '', 'masterSummary.overlap_recommendations.0.ideaKey': '' }
    });
    const legacy = await ChannelIntelligence.findById(intelligence._id);
    const migrated = await prepareIntelligenceResearch(legacy);
    const saved = await ChannelIntelligence.findById(intelligence._id);
    assert.equal(saved.researchRevision, migrated.researchRevision);
    assert.ok(saved.masterSummary.overlap_recommendations[0].ideaKey);
  });

  test('shared demo ideas still have separate per-user jobs and are not automatically scanned', async () => {
    intelligence.isDemo = true;
    intelligence.userId = null;
    intelligence.channelId = 'demo-antigravity-studio';
    await intelligence.save();
    await scheduleAutomaticResearch(intelligence);
    assert.equal(await IdeaResearch.countDocuments(), 0);
    const first = await enqueueResearch(userId, await ownedIntelligence(userId, String(intelligence._id)), ideas[0].ideaKey);
    const second = await enqueueResearch(otherUser, await ownedIntelligence(otherUser, String(intelligence._id)), ideas[0].ideaKey);
    assert.notEqual(String(first._id), String(second._id));
  });

  test('HTTP routes enforce login and ownership while returning a queued job promptly', async () => {
    await User.create([
      { _id: userId, email: 'research-owner-' + userId + '@example.test' },
      { _id: otherUser, email: 'research-other-' + otherUser + '@example.test' }
    ]);
    const app = express();
    app.use(express.json());
    app.use('/api/idea-research', ideaResearchRoutes);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port + '/api/idea-research';
    const token = id => 'Bearer ' + jwt.sign({ id: String(id) }, process.env.JWT_SECRET || 'supersecret');
    try {
      assert.equal((await fetch(url)).status, 401);
      const started = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token(userId) },
        body: JSON.stringify({ intelligenceId: String(intelligence._id), ideaKey: ideas[0].ideaKey })
      });
      assert.equal(started.status, 202);
      const job = await started.json();
      assert.equal(job.status, 'queued');
      assert.equal((await fetch(url + '/' + job._id, { headers: { Authorization: token(otherUser) } })).status, 404);
      assert.equal((await fetch(url + '/' + job._id, { headers: { Authorization: token(userId) } })).status, 200);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
