const integer = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

export function researchConfig() {
  return {
    autoCount: integer('RESEARCH_AUTO_COUNT', 3, 0, 10),
    dailyLimit: integer('RESEARCH_DAILY_LIMIT', 20, 1, 100),
    freshnessMs: integer('RESEARCH_FRESH_HOURS', 24, 1, 168) * 3600000,
    deadlineMs: integer('RESEARCH_DEADLINE_SECONDS', 300, 30, 600) * 1000,
    serviceUrl: process.env.RESEARCH_SERVICE_URL || 'http://127.0.0.1:8001',
    serviceToken: process.env.RESEARCH_SERVICE_TOKEN?.trim() || '',
    braveKey: process.env.BRAVE_SEARCH_API_KEY?.trim() || '',
    webProvider: process.env.WEB_SEARCH_PROVIDER?.trim().toLowerCase() || 'auto',
    searxngUrl: process.env.SEARXNG_URL?.trim() || '',
    youtubeKey: process.env.YOUTUBE_API_KEY?.trim() || ''
  };
}

export function researchError(message, statusCode = 503) {
  return Object.assign(new Error(message), { statusCode });
}
