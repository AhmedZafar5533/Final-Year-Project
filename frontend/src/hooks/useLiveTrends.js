import { useCallback, useEffect, useState } from "react";
import trendsService from "../services/trendsService";

function extractMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Runs the real trend-detection pipeline (YouTube Data API + Google Trends +
 * niche matching) via Express -> Python. Not fetched automatically on mount —
 * the pipeline calls external APIs and can take a while / cost API quota, so
 * the caller decides when to trigger it (see LiveTrendsPanel's "Run" button).
 */
export const useLiveTrends = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);

  const run = useCallback(async (params = {}) => {
    setIsLoading(true);
    setHasRun(true);
    try {
      const result = await trendsService.getLiveTrends(params);
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        extractMessage(err, "Failed to run the live trend-detection pipeline."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCached = useCallback(async (limit = 20) => {
    setIsLoading(true);
    setHasRun(true);
    try {
      const result = await trendsService.getLiveTrendsCached(limit);
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        extractMessage(err, "Failed to load cached trend results."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, hasRun, run, loadCached };
};

/**
 * Lightweight health check for the Python ML service, used to show a status
 * dot next to the "Live Detection" tab without requiring a manual run first.
 */
export const usePythonServiceHealth = () => {
  const [status, setStatus] = useState("checking"); // "checking" | "online" | "offline"
  const [message, setMessage] = useState(null);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await trendsService.getLiveTrendsHealth();
      setStatus("online");
      setMessage(null);
    } catch (err) {
      setStatus("offline");
      setMessage(extractMessage(err, "ML service unreachable."));
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { status, message, recheck: check };
};

export default useLiveTrends;
