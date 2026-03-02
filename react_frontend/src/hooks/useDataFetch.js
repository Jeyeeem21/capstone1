/**
 * useDataFetch Hook
 * 
 * Super-fast data fetching with:
 * - Instant cache display (stale-while-revalidate)
 * - In-memory + localStorage cache
 * - Background refresh
 * - Optimistic updates
 * - Auto-retry on failure
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api';

// In-memory cache for instant access (faster than localStorage)
const memoryCache = new Map();
const cacheTimestamps = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for memory cache
const STALE_TTL = 10 * 1000; // 10 seconds before background refresh

/**
 * Get data from memory cache
 */
const getFromMemoryCache = (key) => {
  if (!memoryCache.has(key)) return null;
  
  const timestamp = cacheTimestamps.get(key) || 0;
  const age = Date.now() - timestamp;
  
  // Return data even if stale (we'll refresh in background)
  return {
    data: memoryCache.get(key),
    isStale: age > STALE_TTL,
    isExpired: age > MEMORY_CACHE_TTL,
  };
};

/**
 * Set data to memory cache
 */
const setToMemoryCache = (key, data) => {
  memoryCache.set(key, data);
  cacheTimestamps.set(key, Date.now());
};

/**
 * Clear specific cache key from all cache layers
 */
export const invalidateCache = (key) => {
  // Clear from hook's memory cache
  memoryCache.delete(key);
  cacheTimestamps.delete(key);
  
  // Clear from localStorage - try both possible prefixes
  localStorage.removeItem(`kjp-${key}`);
  localStorage.removeItem(`kjp_cache_${key}`);
  
  // Also clear the raw key just in case
  localStorage.removeItem(key);
  
  // Clear from apiClient's memory cache too
  apiClient.cache.remove(key);
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  memoryCache.clear();
  cacheTimestamps.clear();
  // Clear localStorage cache
  Object.keys(localStorage)
    .filter(k => k.startsWith('kjp-'))
    .forEach(k => localStorage.removeItem(k));
};

/**
 * Main data fetching hook
 */
export const useDataFetch = (endpoint, options = {}) => {
  const {
    cacheKey = endpoint,
    enabled = true,
    onSuccess = null,
    onError = null,
    initialData = [],
    transformData = (data) => data,
  } = options;

  const [data, setData] = useState(() => {
    // Try to get initial data from memory cache first (instant!)
    const memCached = getFromMemoryCache(cacheKey);
    if (memCached?.data) {
      return transformData(memCached.data);
    }
    
    // Then try localStorage cache
    const localCached = localStorage.getItem(`kjp-${cacheKey}`);
    if (localCached) {
      try {
        const { data: cachedData } = JSON.parse(localCached);
        return transformData(cachedData);
      } catch {
        // Invalid cache
      }
    }
    
    return initialData;
  });
  
  const [loading, setLoading] = useState(() => {
    // Only show loading if we have no cached data
    const memCached = getFromMemoryCache(cacheKey);
    if (memCached?.data) return false;
    
    const localCached = localStorage.getItem(`kjp-${cacheKey}`);
    return !localCached;
  });
  
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  const fetchData = useCallback(async (showLoading = true, isBackground = false, forceNetwork = false) => {
    if (!enabled) return;
    
    // Allow force network to bypass in-progress check
    if (fetchInProgress.current && !forceNetwork) return;
    
    fetchInProgress.current = true;
    
    // Only show loading spinner if no cached data and not background refresh
    if (showLoading && !isBackground) {
      const memCached = getFromMemoryCache(cacheKey);
      if (!memCached?.data) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }
    
    try {
      // When forceNetwork is true, don't use cache
      const response = await apiClient.get(endpoint, {
        useCache: !forceNetwork,
        cacheKey: cacheKey,
      });
      
      if (!isMounted.current) return;
      
      if (response.success && response.data) {
        const transformedData = transformData(response.data);
        setData(transformedData);
        setError(null);
        
        // Update memory cache
        setToMemoryCache(cacheKey, response.data);
        
        // Also persist to localStorage for fast page refresh
        try {
          localStorage.setItem(`kjp-${cacheKey}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Storage full, ignore
        }
        
        onSuccess?.(transformedData);
        
        // Stale-while-revalidate: if data came from cache and is stale,
        // do a background network fetch to update with fresh data
        if (response.fromCache && response.isStale && !forceNetwork) {
          fetchInProgress.current = false; // allow the background fetch
          try {
            const freshResponse = await apiClient.get(endpoint, {
              useCache: false,
              cacheKey: cacheKey,
            });
            if (isMounted.current && freshResponse.success && freshResponse.data) {
              const freshTransformed = transformData(freshResponse.data);
              setData(freshTransformed);
              setToMemoryCache(cacheKey, freshResponse.data);
              try {
                localStorage.setItem(`kjp-${cacheKey}`, JSON.stringify({
                  data: freshResponse.data,
                  timestamp: Date.now()
                }));
              } catch (e) {
                // Storage full, ignore
              }
            }
          } catch {
            // Background refresh failed, keep cached data
          }
        }
      } else if (response.success === false) {
        // Only set error if we have no cached data
        const memCached = getFromMemoryCache(cacheKey);
        if (!memCached?.data) {
          setError(response.error || 'Failed to load data');
          onError?.(response.error);
        }
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      const memCached = getFromMemoryCache(cacheKey);
      if (!memCached?.data) {
        setError(err.message);
        onError?.(err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setIsRefreshing(false);
        fetchInProgress.current = false;
      }
    }
  }, [endpoint, cacheKey, enabled, transformData, onSuccess, onError]);

  // Initial fetch with smart loading
  useEffect(() => {
    isMounted.current = true;
    
    if (!enabled) return;
    
    // Check memory cache first
    const memCached = getFromMemoryCache(cacheKey);
    
    if (memCached?.data && !memCached.isExpired) {
      // We have fresh enough data, show it immediately
      setData(transformData(memCached.data));
      setLoading(false);
      
      // If data is stale, refresh in background
      if (memCached.isStale) {
        fetchData(false, true);
      }
    } else {
      // No memory cache, fetch data
      fetchData(true, false);
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [enabled, cacheKey]); // Removed fetchData from deps to prevent infinite loop

  // Manual refetch function - forces fresh data from server
  const refetch = useCallback(async () => {
    // Clear all caches first
    invalidateCache(cacheKey);
    
    // Reset fetch in progress to allow new fetch
    fetchInProgress.current = false;
    
    // Force network request (bypass cache)
    return fetchData(false, false, true);
  }, [cacheKey, fetchData]);

  // Optimistic update function
  const optimisticUpdate = useCallback((updater) => {
    setData(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      // Also update memory cache
      setToMemoryCache(cacheKey, newData);
      return newData;
    });
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    refetch,
    optimisticUpdate,
    setData,
  };
};

/**
 * Hook for mutations (POST, PUT, DELETE) with cache invalidation
 */
export const useMutation = (options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    invalidateKeys = [],
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      switch (method.toUpperCase()) {
        case 'POST':
          response = await apiClient.post(endpoint, data);
          break;
        case 'PUT':
          response = await apiClient.put(endpoint, data);
          break;
        case 'PATCH':
          response = await apiClient.patch(endpoint, data);
          break;
        case 'DELETE':
          response = await apiClient.delete(endpoint);
          break;
        default:
          throw new Error(`Invalid method: ${method}`);
      }
      
      if (response.success) {
        // Invalidate related caches
        invalidateKeys.forEach(key => invalidateCache(key));
        onSuccess?.(response.data);
        return response;
      } else {
        const errorMsg = response.error || response.message || 'Operation failed';
        setError(errorMsg);
        onError?.(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invalidateKeys, onSuccess, onError]);

  return {
    mutate,
    loading,
    error,
  };
};

export default useDataFetch;
