const clean = value => typeof value === 'string' ? value.replace(/[\r\n]/g, ' ').slice(0, 240) : value;
export function createResearchLogger(scope, id, onEvent) {
  const started = Date.now();
  return (event, details = {}) => {
    const data = Object.fromEntries(Object.entries(details).filter(([key]) =>
      !/secret|token|authorization|cookie|password|prompt|draft|apiKey/i.test(key)).map(([key, value]) => {
      if (key === 'url' || key === 'endpoint') {
        try { const url = new URL(value); value = url.origin + url.pathname; } catch { value = 'invalid URL'; }
      }
      return [key, clean(value)];
    }));
    const entry = { time: new Date().toISOString(), scope, id: String(id || 'request'), event,
      elapsedMs: Date.now() - started, ...data };
    if (process.env.RESEARCH_LOGGING !== '0') console.log('[research]', JSON.stringify(entry));
    onEvent?.(entry);
  };
}
