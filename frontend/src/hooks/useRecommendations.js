import { useCallback, useEffect, useState } from "react";
import trendsService from "../services/trendsService";

function extractMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Pulls the real recommendation-model output (posting-time heatmap, content
 * tips, suggested tags) from the Python service via Express. If the ML
 * service is offline/misconfigured, `error` is set with a clear explanation
 * so the UI can surface the real problem instead of silently failing.
 */
export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await trendsService.getRecommendations();
      setRecommendations(data);
      setError(null);
    } catch (err) {
      setError(
        extractMessage(
          err,
          "Failed to fetch recommendations from the ML service.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { recommendations, isLoading, error, reload: load };
};

export default useRecommendations;
