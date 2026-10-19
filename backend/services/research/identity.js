import { createHash, randomUUID } from 'node:crypto';

export const RECOMMENDATION_LISTS = [
  'overlap_recommendations', 'demand_recommendations',
  'trend_recommendations', 'next_video_recommendations'
];
export const fingerprint = (idea) => createHash('sha256').update(JSON.stringify(
  ['title', 'hook', 'angle', 'target_audience', 'suggested_format']
    .map(field => String(idea?.[field] || '').trim().toLowerCase())
)).digest('hex');

const structuredIdea = idea => idea && typeof idea === 'object' && !Array.isArray(idea) &&
  typeof idea.title === 'string' && Boolean(idea.title.trim());

export function normalizeRecommendations(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return summary;
  const byTitle = new Map();
  for (const name of RECOMMENDATION_LISTS) {
    for (const idea of Array.isArray(summary[name]) ? summary[name] : []) {
      if (!structuredIdea(idea)) continue;
      const title = idea.title.trim().toLowerCase();
      if (!byTitle.has(title)) byTitle.set(title, new Map());
      byTitle.get(title).set(fingerprint(idea), idea);
    }
  }
  let discarded = 0;
  for (const name of RECOMMENDATION_LISTS) {
    const items = Array.isArray(summary[name]) ? summary[name] : [];
    if (summary[name] != null && !Array.isArray(summary[name])) discarded++;
    summary[name] = items.flatMap(idea => {
      if (structuredIdea(idea)) return [idea];
      // Some model responses use title strings to refer to the full categorized objects.
      const matches = typeof idea === 'string' ? byTitle.get(idea.trim().toLowerCase()) : null;
      if (matches?.size === 1) return [{ ...matches.values().next().value }];
      discarded++;
      return [];
    });
  }
  const combined = new Map();
  for (const name of ['next_video_recommendations', ...RECOMMENDATION_LISTS.slice(0, 3)]) {
    for (const idea of summary[name]) {
      const key = fingerprint(idea);
      if (!combined.has(key)) combined.set(key, idea);
    }
  }
  summary.next_video_recommendations = [...combined.values()];
  if (discarded) console.warn(`Channel recommendations: omitted ${discarded} invalid or unresolved entries; no recommendation details were fabricated.`);
  return summary;
}

export function attachResearchIdentity(intelligence, newRevision = false) {
  normalizeRecommendations(intelligence.masterSummary);
  if (newRevision || !intelligence.researchRevision) intelligence.researchRevision = randomUUID();
  for (const list of RECOMMENDATION_LISTS) {
    for (const idea of intelligence.masterSummary?.[list] || []) {
      idea.ideaKey = createHash('sha256')
        .update(intelligence.researchRevision + fingerprint(idea)).digest('hex').slice(0, 32);
    }
  }
  return intelligence;
}

export function uniqueIdeas(intelligence) {
  const found = new Map();
  for (const list of RECOMMENDATION_LISTS) {
    const items = intelligence.masterSummary?.[list];
    for (const idea of Array.isArray(items) ? items : []) {
      if (structuredIdea(idea) && idea.ideaKey && !found.has(idea.ideaKey)) found.set(idea.ideaKey, idea);
    }
  }
  return [...found.values()];
}
