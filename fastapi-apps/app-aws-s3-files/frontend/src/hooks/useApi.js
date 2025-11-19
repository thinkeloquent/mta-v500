import { useCallback, useState } from 'react';

// Custom hook for API calls with loading states and error handling
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    clearError,
  };
};

// Hook for managing API state with data
export const useApiState = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('[useApiState] Hook state:', {
    dataType: typeof data,
    dataIsArray: Array.isArray(data),
    dataValue: data,
    loading,
    hasError: !!error,
  });

  const execute = useCallback(async (apiCall) => {
    console.log('[useApiState] Executing API call...');
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      console.log('[useApiState] API call result:', {
        resultType: typeof result,
        resultIsArray: Array.isArray(result),
        resultLength: result?.length,
        resultPreview: Array.isArray(result) ? result.slice(0, 2) : result,
      });
      setData(result);
      console.log('[useApiState] Data state updated');
      return result;
    } catch (err) {
      console.error('[useApiState] API call error:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
      console.log('[useApiState] API call completed, loading=false');
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};
