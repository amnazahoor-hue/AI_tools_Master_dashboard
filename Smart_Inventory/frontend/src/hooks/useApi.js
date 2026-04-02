import { useCallback, useMemo, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:5108/api";

export const useApi = () => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoadingCount((count) => count + 1);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");
      const payload = isJson ? await response.json() : await response.blob();

      if (!response.ok) {
        const message = isJson ? payload.error || "API request failed." : "API request failed.";
        throw new Error(message);
      }

      return payload;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      throw err;
    } finally {
      setLoadingCount((count) => Math.max(0, count - 1));
    }
  }, []);

  return useMemo(
    () => ({
      request,
      loading: loadingCount > 0,
      error,
      clearError: () => setError(null),
    }),
    [request, loadingCount, error]
  );
};

