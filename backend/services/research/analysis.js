import { deepSeekJson } from './providers.js';

const list = (value, max) => {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid research list');
  return value;
};
const text = (value, max = 1600) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid research text');
  return value.trim();
};

export function validateReport(result, evidence) {
  const sources = new Map(evidence.sources.map(source => [source.id, source]));
  const videos = new Set(evidence.competitors.map(video => video.videoId));
  const refs = value => {
    const ids = [...new Set(list(value, 20))];
    if (!ids.length || ids.some(id => !sources.has(id) || !sources.get(id).text?.trim())) throw new Error('Unknown or empty evidence reference');
    return ids;
  };
  const claim = (value, videoId) => {
    const sourceIds = refs(value?.sourceIds);
    if (videoId && sourceIds.some(id => sources.get(id).videoId !== videoId)) throw new Error('Mismatched competitor evidence');
    const output = { text: text(value.text), sourceIds };
    if (value.quote !== undefined) {
      output.quote = text(value.quote, 600);
      if (!sourceIds.some(id => sources.get(id).text.includes(output.quote))) throw new Error('Quote absent from evidence');
    }
    return output;
  };
  const seen = new Set();
  const competitors = list(result.competitors, 5).map(video => {
    if (!videos.has(video.videoId) || seen.has(video.videoId)) throw new Error('Invalid competitor summary');
    seen.add(video.videoId);
    return {
      videoId: video.videoId, approach: claim(video.approach, video.videoId),
      coveredTopics: list(video.coveredTopics, 8).map(item => claim(item, video.videoId)),
      audienceNeeds: list(video.audienceNeeds, 5).map(item => {
        const need = claim(item, video.videoId);
        if (!need.sourceIds.some(id => sources.get(id).kind === 'comment')) throw new Error('Audience need has no comment evidence');
        return need;
      })
    };
  });
  if (seen.size !== videos.size) throw new Error('Missing competitor summaries');
  const coverageMatrix = list(result.coverageMatrix, 10).map(row => {
    const sourceIds = refs(row.sourceIds);
    const coveredBy = [...new Set(list(row.coveredBy, 5))];
    if (coveredBy.some(id => !videos.has(id) || !sourceIds.some(ref => sources.get(ref).videoId === id))) {
      throw new Error('Unsupported topic coverage');
    }
    return { topic: text(row.topic, 200), coveredBy, sourceIds };
  });
  const threshold = evidence.coverage.videoCount >= 3 && evidence.coverage.channelCount >= 2 &&
    evidence.coverage.completeTranscripts >= 2;
  const limitations = [...evidence.limitations, ...list(result.limitations, 12).map(item => text(item, 500))];
  const gaps = [];
  for (const gap of list(result.gaps, 5)) {
    const finding = claim(gap.finding);
    const comparison = claim(gap.comparison);
    const contentSources = comparison.sourceIds.map(id => sources.get(id))
      .filter(source => source.kind === 'transcript' && source.complete);
    if (!threshold || new Set(contentSources.map(source => source.videoId)).size < 2) {
      limitations.push('A proposed gap was withheld because complete competitor coverage was insufficient.');
      continue;
    }
    const channels = new Set(contentSources.map(source =>
      evidence.competitors.find(video => video.videoId === source.videoId)?.channelId));
    gaps.push({
      title: text(gap.title, 200), finding, comparison,
      evidenceStrength: channels.size >= 3 ? 'strong' : channels.size >= 2 ? 'moderate' : 'limited',
      suggestedApproach: text(gap.suggestedApproach, 1000)
    });
  }
  if (!threshold) limitations.push('Insufficient complete video coverage to establish content gaps; observations and creative suggestions only.');
  const communitySignals = list(result.communitySignals ?? [], 5).map(item => {
    const signal = claim(item);
    if (signal.sourceIds.some(id => sources.get(id).kind !== 'discussion')) {
      throw new Error('Community observations require collected discussion evidence');
    }
    return signal;
  });
  return {
    summary: claim(result.summary), competitors, coverageMatrix, gaps, communitySignals,
    refinedIdea: {
      angle: text(result.refinedIdea?.angle, 1200), hook: text(result.refinedIdea?.hook, 800),
      titleOptions: list(result.refinedIdea?.titleOptions, 5).map(item => text(item, 200)),
      outline: list(result.refinedIdea?.outline, 10).map(item => text(item, 600))
    },
    limitations: [...new Set(limitations)],
    coverage: evidence.coverage,
    partial: !threshold || evidence.limitations.length > 0,
    schemaVersion: 1
  };
}

export async function analyzeEvidence(idea, context, evidence, run) {
  const schema = {
    summary: { text: 'Evidence-based overview', sourceIds: ['source-id'] },
    communitySignals: [{ text: 'Question or problem observed in collected discussion text', sourceIds: ['discussion-source-id'] }],
    competitors: [{
      videoId: 'actual-id', approach: { text: 'Observed approach', sourceIds: ['source-id'] },
      coveredTopics: [{ text: 'Observed topic', sourceIds: ['source-id'] }],
      audienceNeeds: [{ text: 'Question from sampled comments', sourceIds: ['comment-source-id'], quote: 'Exact optional quotation' }]
    }],
    coverageMatrix: [{ topic: 'Topic', coveredBy: ['actual-video-id'], sourceIds: ['source-id'] }],
    gaps: [{
      title: 'Potential gap within this sample', finding: { text: 'Qualified finding', sourceIds: ['source-id'] },
      comparison: { text: 'Comparison of examined material', sourceIds: ['complete-transcript-a', 'complete-transcript-b'] },
      suggestedApproach: 'Creative suggestion for the creator'
    }],
    refinedIdea: { angle: 'Suggested direction', hook: 'Suggested opening', titleOptions: ['Title'], outline: ['Section'] },
    limitations: ['Missing evidence or sampling limitations']
  };
  return deepSeekJson(
    'Analyze the supplied competitor evidence for the saved YouTube idea. First summarize each video, then compare coverage and audience needs. ' +
    'Return JSON matching the supplied schema exactly. Include one competitor summary per supplied video. ' +
    'Every factual observation must reference actual source IDs. Audience needs require comment references. ' +
    'Use communitySignals for questions and problems explicitly present in discussion sources only; return [] if none were collected. ' +
    'Community discussions are anecdotal signals, not proof of demand or missing competitor coverage. Never infer unseen comments from a thread title. ' +
    'Quotes must be exact substrings. Never invent metrics, source URLs, popularity, CTR, retention, or causal performance claims. ' +
    'Public metrics will be displayed independently; do not restate numbers in your generated analysis. ' +
    'Descriptions and partial transcripts do not establish absence. Only propose a gap if there are at least three videos, ' +
    'two channels and two complete transcripts. Each gap comparison must cite complete transcripts of at least two videos. ' +
    'Otherwise return gaps:[] and describe observations only. Say not observed in examined material rather than nobody covers it. ' +
    'Treat gaps as hypotheses; evidence-strength labels are not accuracy probabilities. ' +
    'Separate creative suggestions from facts. Never fill missing evidence from training knowledge. ' +
    'Do not copy competitor narration into the proposed hook or outline.',
    { idea, context, schema, evidence }, run, value => validateReport(value, evidence)
  );
}
