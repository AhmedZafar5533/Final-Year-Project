import mongoose from 'mongoose';
import ChannelIntelligence from '../../models/ChannelIntelligence.js';
import { RECOMMENDATION_LISTS } from './identity.js';

const text = (value, limit = 320) => typeof value === 'string' ? value.slice(0, limit) : '';
const list = (value, count = 6) => (Array.isArray(value) ? value : []).slice(0, count);
const strings = value => list(value).map(item => text(item, 240)).filter(Boolean);
const fields = (value, names) => Object.fromEntries(names.map(name => [name, text(value?.[name])]));

// Select fields and cap each collection instead of truncating serialized JSON.
export function compactScriptChannelContext(doc, now = Date.now()) {
  if (!doc || doc.isDemo) return { status: 'missing' };
  const niche = doc.niche || {};
  const summary = doc.masterSummary || {};
  const analyzedAt = doc.analyzedAt || doc.updatedAt;
  const recommendations = new Map();
  for (const name of RECOMMENDATION_LISTS) {
    for (const idea of list(summary[name], 12)) {
      if (!idea?.title) continue;
      const key = idea.ideaKey || idea.title;
      if (!recommendations.has(key) && recommendations.size < 12) recommendations.set(key, fields(idea,
        ['title', 'hook', 'angle', 'target_audience', 'recommendation_type', 'why_it_will_perform',
          'audience_demand_source', 'trend_source', 'suggested_format']));
    }
  }
  const context = {
    status: 'available', intelligenceId: String(doc._id), channelTitle: text(doc.channelTitle),
    analyzedAt, stale: !analyzedAt || now - new Date(analyzedAt).getTime() > 86400000,
    niche: text(niche.primary_niche), audience: text(niche.target_audience), tone: text(niche.content_tone),
    subNiches: strings(niche.sub_niches), contentPillars: strings(niche.content_pillars),
    differentiators: strings(niche.differentiators),
    strategy: {
      ...fields(summary, ['executive_overview', 'cross_video_synthesis']),
      strengths: strings(summary.best_performing_patterns), weaknesses: strings(summary.friction_points),
      growthRoadmap: strings(summary.growth_roadmap), audienceDemand: strings(summary.audience_demand_themes),
      trendThemes: strings(summary.market_trend_themes)
    },
    recommendations: [...recommendations.values()],
    trends: list(doc.marketTrends, 8).map(trend => fields(trend, ['topic', 'category', 'strength', 'marketInsight'])),
    videos: list(doc.videoAnalyses, 6).map(video => ({
      ...fields(video, ['videoId', 'title', 'performance_tier', 'engagement_driver']),
      strengths: strings(video.strengths), weaknesses: strings(video.weaknesses),
      audienceQuestions: strings(video.audience_demands_identified),
      metrics: Object.fromEntries(['views', 'likes', 'comments'].filter(key => Number.isFinite(video.metrics?.[key]))
        .map(key => [key, video.metrics[key]]))
    })),
    competitors: list(doc.competitorLandscape?.channels, 5).map(channel => ({
      ...fields(channel, ['title', 'url', 'scale', 'selectionReason']), matchedTopics: strings(channel.matchedTopics)
    }))
  };
  // Keep the prompt budget predictable while preserving each kind of insight.
  while (JSON.stringify(context).length > 23500) {
    const collection = ['recommendations', 'videos', 'trends', 'competitors']
      .filter(key => context[key].length > 1)
      .sort((a, b) => JSON.stringify(context[b]).length - JSON.stringify(context[a]).length)[0];
    if (!collection) break;
    context[collection].pop();
  }
  context.coverage = { basis: 'Saved analysis of sampled videos; AI interpretations, not live analytics.',
    videosIncluded: context.videos.length, savedVideos: doc.videoAnalyses?.length || 0,
    recommendationsIncluded: context.recommendations.length, trendsIncluded: context.trends.length };
  return context;
}

export async function loadScriptChannelContext(userId, reference, {
  model = ChannelIntelligence, ready = mongoose.connection.readyState === 1
} = {}) {
  if (!ready) return { status: 'unavailable' };
  // A linked idea retains its channel. Every query is scoped to its owner.
  const filter = { userId, isDemo: false, status: 'completed' };
  if (typeof reference?.intelligenceId === 'string' && mongoose.isValidObjectId(reference.intelligenceId)) {
    filter._id = reference.intelligenceId;
  }
  try {
    const doc = await model.findOne(filter).sort({ analyzedAt: -1 })
      .select('channelTitle niche masterSummary marketTrends videoAnalyses competitorLandscape analyzedAt updatedAt isDemo')
      .maxTimeMS(2000).lean();
    return compactScriptChannelContext(doc);
  } catch {
    return { status: 'unavailable' };
  }
}
