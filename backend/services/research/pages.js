import { fetchJson, withTransientRetry } from './providers.js';

export function collectPublicPage(page, config, run) {
  return withTransientRetry(async () => {
    run.usage.pageRequests = (run.usage.pageRequests || 0) + 1;
    try {
      return await fetchJson(config.serviceUrl.replace(/\/$/, '') + '/collect', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.serviceToken },
        body: JSON.stringify({ url: page.url })
      }, run.signal, 17000);
    } catch (error) {
      // Collector 502 means this public page failed; another page is more useful than a repeat.
      if (error.upstreamStatus === 502) error.retryable = false;
      throw error;
    }
  }, { signal: run.signal, log: run.log, event: 'page.retry', url: page.url });
}
