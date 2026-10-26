import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compactScriptChannelContext, loadScriptChannelContext } from '../services/research/scriptChannelContext.js';

const id = '507f1f77bcf86cd799439011';
const doc = {
  _id: id, channelTitle: 'Cooking for families', analyzedAt: '2026-10-26T00:00:00Z',
  niche: { primary_niche: 'Cooking', target_audience: 'Busy parents', content_tone: 'Practical' },
  masterSummary: { best_performing_patterns: ['Simple examples'], friction_points: ['Long intros'],
    audience_demand_themes: ['Budget meals'], growth_roadmap: ['Show the result first'],
    demand_recommendations: [{ ideaKey: 'one', title: 'Cheap lunches', hook: 'Five meals' }],
    next_video_recommendations: [{ ideaKey: 'one', title: 'Cheap lunches', hook: 'Five meals' }] },
  marketTrends: [{ topic: 'Meal preparation', marketInsight: 'Time saving recipes' }],
  videoAnalyses: [{ title: 'School lunches', weaknesses: ['Slow introduction'],
    audience_demands_identified: ['Vegetarian options'], metrics: { views: 120, likes: 10 } }],
  accessToken: 'never-send-this'
};

test('channel context includes real strategy and demand, deduplicates ideas, and omits unrelated fields', () => {
  const context = compactScriptChannelContext(doc, Date.parse('2026-10-26T12:00:00Z'));
  assert.equal(context.niche, 'Cooking');
  assert.equal(context.audience, 'Busy parents');
  assert.deepEqual(context.strategy.weaknesses, ['Long intros']);
  assert.deepEqual(context.strategy.growthRoadmap, ['Show the result first']);
  assert.equal(context.recommendations.length, 1);
  assert.equal(context.trends[0].topic, 'Meal preparation');
  assert.deepEqual(context.videos[0].audienceQuestions, ['Vegetarian options']);
  assert.equal(context.videos[0].metrics.views, 120);
  assert.equal(context.stale, false);
  assert.equal(compactScriptChannelContext(doc, Date.parse('2026-10-28')).stale, true);
  assert.ok(!JSON.stringify(context).includes('never-send-this'));
  assert.deepEqual(compactScriptChannelContext({ ...doc, isDemo: true }), { status: 'missing' });
});

test('large saved analyses remain within the prompt budget with usable JSON and insight coverage', () => {
  const huge = 'x'.repeat(10000);
  const large = structuredClone(doc);
  for (const key of ['content_pillars', 'sub_niches', 'differentiators']) large.niche[key] = Array(100).fill(huge);
  for (const key of ['best_performing_patterns', 'friction_points', 'growth_roadmap', 'audience_demand_themes', 'market_trend_themes']) {
    large.masterSummary[key] = Array(100).fill(huge);
  }
  large.masterSummary.next_video_recommendations = Array.from({ length: 100 }, (_, i) => ({ ideaKey: String(i), title: huge, hook: huge, angle: huge }));
  large.videoAnalyses = Array(100).fill({ title: huge, strengths: Array(100).fill(huge), weaknesses: Array(100).fill(huge), audience_demands_identified: Array(100).fill(huge) });
  const context = compactScriptChannelContext(large);
  assert.ok(JSON.stringify(context).length <= 24000);
  assert.ok(context.recommendations.length && context.videos.length && context.trends.length);
  assert.equal(context.coverage.savedVideos, 100);
});

test('resolution scopes every read to the owner and linked analysis; uses latest analysis for blank sessions', async () => {
  const reads = [];
  const model = { findOne(filter) {
    reads.push(filter);
    return { sort(order) {
      assert.deepEqual(order, { analyzedAt: -1 }); return this;
    }, select() { return this; }, maxTimeMS() { return this; },
    async lean() { return filter.userId === 'owner' ? doc : null; } };
  } };
  assert.equal((await loadScriptChannelContext('owner', { intelligenceId: id }, { model, ready: true })).status, 'available');
  assert.deepEqual(reads[0], { userId: 'owner', isDemo: false, status: 'completed', _id: id });
  assert.equal((await loadScriptChannelContext('stranger', { intelligenceId: id }, { model, ready: true })).status, 'missing');
  await loadScriptChannelContext('owner', undefined, { model, ready: true });
  assert.equal(reads[2]._id, undefined);
  assert.equal(reads[2].userId, 'owner');
  assert.deepEqual(await loadScriptChannelContext('owner', undefined, { model, ready: false }), { status: 'unavailable' });
  assert.equal(reads.length, 3);
});
