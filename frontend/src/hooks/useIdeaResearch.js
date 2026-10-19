import { useCallback, useEffect, useMemo, useState } from "react";
import ideaResearchService from "../services/ideaResearchService";

export default function useIdeaResearch(intelligenceId, revision) {
  const scope = intelligenceId + "/" + revision;
  const [state, setState] = useState({ scope: "", jobs: [], error: null });
  const [version, setVersion] = useState(0);
  const [busyKey, setBusyKey] = useState(null);
  useEffect(() => {
    if (!intelligenceId || !revision) return;
    const controller = new AbortController();
    let timer;
    let failures = 0;
    const graceUntil = Date.now() + 15000;
    async function poll() {
      try {
        const jobs = await ideaResearchService.list(intelligenceId, controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        setState({ scope, jobs, error: null });
        if (jobs.some(job => ["queued", "running"].includes(job.status)) || Date.now() < graceUntil) {
          timer = setTimeout(poll, 4000);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState(previous => ({ scope, jobs: previous.scope === scope ? previous.jobs : [],
          error: error.response?.data?.error || "Research status is unavailable." }));
        if (++failures < 4) timer = setTimeout(poll, Math.min(30000, 4000 * 2 ** failures));
      }
    }
    timer = setTimeout(poll, 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [intelligenceId, revision, scope, version]);

  const record = useCallback(job => {
    setState(previous => ({
      scope, error: null,
      jobs: [...(previous.scope === scope ? previous.jobs : []).filter(item => item.ideaKey !== job.ideaKey), job],
    }));
    setVersion(value => value + 1);
  }, [scope]);
  const start = useCallback(async ideaKey => {
    setBusyKey(ideaKey);
    try {
      const job = await ideaResearchService.start(intelligenceId, ideaKey);
      record(job);
      return job;
    } catch (error) {
      setState(previous => ({ ...previous, scope,
        error: error.response?.data?.error || "Research could not be started." }));
      return null;
    } finally { setBusyKey(null); }
  }, [intelligenceId, record, scope]);
  const jobs = useMemo(() => Object.fromEntries(
    (state.scope === scope ? state.jobs : []).map(job => [job.ideaKey, job])
  ), [state, scope]);
  return { jobs, start, record, busyKey, error: state.scope === scope ? state.error : null };
}
