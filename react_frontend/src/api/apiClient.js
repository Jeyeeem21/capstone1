/**
 * API Client
 * 
 * Centralized HTTP client with:
 * - Request/response interceptors
 * - Error handling
 * - Timeout support
 * - Multi-layer caching (memory + localStorage)
 * - Auth token management
 * - Stale-while-revalidate pattern
 */

import { API_BASE_URL, REQUEST_CONFIG, CACHE_CONFIG } from './config';

// Track API availability
let apiAvailable = null;

// In-memory cache for instant access (faster than localStorage)
const memoryCache = new Map();
const memoryCacheTimestamps = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TTL = 10 * 1000; // 10 seconds before considered stale

/**
 * Get auth token from storage
 */
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Set auth token to storage
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

/**
 * Build full URL from endpoint
 */
const buildUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
};

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_CONFIG.TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    apiAvailable = true;
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      apiAvailable = false;
      throw new Error('Request timeout - server may be unavailable');
    }
    apiAvailable = false;
    throw error;
  }
};

/**
 * Cache helpers - Multi-layer: Memory (instant) + localStorage (persistent)
 */
const cache = {
  // Get from memory cache first (instant), then localStorage
  get: (key) => {
    // Try memory cache first (fastest)
    if (memoryCache.has(key)) {
      const timestamp = memoryCacheTimestamps.get(key) || 0;
      const age = Date.now() - timestamp;
      
      if (age < MEMORY_CACHE_TTL) {
        return {
          data: memoryCache.get(key),
          isStale: age > STALE_TTL,
          fromMemory: true,
        };
      }
    }
    
    // Fall back to localStorage
    if (!CACHE_CONFIG.ENABLED) return null;
    
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isExpired = age > CACHE_CONFIG.TTL;
      
      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Restore to memory cache for next access
      memoryCache.set(key, data);
      memoryCacheTimestamps.set(key, timestamp);
      
      return {
        data,
        isStale: age > STALE_TTL,
        fromMemory: false,
      };
    } catch {
      localStorage.removeItem(cacheKey);
      return null;
    }
  },
  
  // Set to both memory and localStorage
  set: (key, data) => {
    const now = Date.now();
    
    // Always set memory cache
    memoryCache.set(key, data);
    memoryCacheTimestamps.set(key, now);
    
    // Set localStorage if enabled
    if (!CACHE_CONFIG.ENABLED) return;
    
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    const cacheData = {
      data,
      timestamp: now,
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      // Storage full, clear old cache
      console.warn('Cache storage full, clearing old entries');
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_CONFIG.PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  },
  
  remove: (key) => {
    // Clear from memory
    memoryCache.delete(key);
    memoryCacheTimestamps.delete(key);
    
    // Clear from localStorage
    const cacheKey = `${CACHE_CONFIG.PREFIX}${key}`;
    localStorage.removeItem(cacheKey);
  },
  
  clear: () => {
    // Clear memory cache
    memoryCache.clear();
    memoryCacheTimestamps.clear();
    
    // Clear localStorage cache
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_CONFIG.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

/**
 * Main API client
 */
const apiClient = {
  /**
   * Check if API is available
   */
  isAvailable: () => apiAvailable !== false,
  
  /**
   * GET request with stale-while-revalidate pattern
   */
  get: async (endpoint, { params = {}, useCache = false, cacheKey = null } = {}) => {
    const effectiveCacheKey = cacheKey || endpoint;
    
    // Try cache first if enabled (returns instantly if cached)
    if (useCache) {
      const cached = cache.get(effectiveCacheKey);
      if (cached?.data) {
        // Return cached data immediately
        // If stale, we'll still return it but could trigger background refresh
        return { 
          success: true, 
          data: cached.data, 
          fromCache: true,
          isStale: cached.isStale,
        };
      }
    }
    
    // Skip network if API is known to be unavailable
    if (apiAvailable === false && useCache) {
      const cached = cache.get(effectiveCacheKey);
      if (cached?.data) {
        return { success: true, data: cached.data, fromCache: true };
      }
    }
    
    try {
      const url = buildUrl(endpoint, params);
      const token = getAuthToken();
      
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      // Cache the response (to both memory and localStorage)
      if (useCache && data.success !== false) {
        cache.set(effectiveCacheKey, data.data || data);
      }
      
      return data;
    } catch (error) {
      // Return cached data on error if available
      if (useCache) {
        const cached = cache.get(effectiveCacheKey);
        if (cached?.data) {
          return { success: true, data: cached.data, fromCache: true, error: error.message };
        }
      }
      
      return { success: false, error: error.message };
    }
  },
  
  /**
   * POST request
   */
  post: async (endpoint, body = {}, options = {}) => {
    try {
      const url = buildUrl(endpoint);
      const token = getAuthToken();
      
      // Check if body is FormData (for file uploads)
      const isFormData = body instanceof FormData;
      
      const headers = {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
      
      // Don't set Content-Type for FormData - browser sets it automatically with boundary
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: isFormData ? body : JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Preserve validation errors for proper error handling
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Attach the response data including validation errors
        throw error;
      }
      
      return data;
    } catch (error) {
      // Re-throw to preserve error structure including validation errors
      throw error;
    }
  },
  
  /**
   * PUT request
   */
  put: async (endpoint, body = {}) => {
    try {
      const url = buildUrl(endpoint);
      const token = getAuthToken();
      
      const response = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Preserve validation errors for proper error handling
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Attach the response data including validation errors
        throw error;
      }
      
      return data;
    } catch (error) {
      // Re-throw to preserve error structure including validation errors
      throw error;
    }
  },
  
  /**
   * PATCH request
   */
  patch: async (endpoint, body = {}) => {
    try {
      const url = buildUrl(endpoint);
      const token = getAuthToken();
      
      const response = await fetchWithTimeout(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Preserve validation errors for proper error handling
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Attach the response data including validation errors
        throw error;
      }
      
      return data;
    } catch (error) {
      // Re-throw to preserve error structure including validation errors
      throw error;
    }
  },
  
  /**
   * DELETE request
   */
  delete: async (endpoint) => {
    try {
      const url = buildUrl(endpoint);
      const token = getAuthToken();
      
      const response = await fetchWithTimeout(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Preserve validation errors for proper error handling
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Attach the response data including validation errors
        throw error;
      }
      
      return data;
    } catch (error) {
      // Re-throw to preserve error structure including validation errors
      throw error;
    }
  },
  
  /**
   * Upload file (multipart/form-data)
   */
  upload: async (endpoint, formData) => {
    try {
      const url = buildUrl(endpoint);
      const token = getAuthToken();
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          // Don't set Content-Type, let browser set it with boundary
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Preserve validation errors for proper error handling
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data }; // Attach the response data including validation errors
        throw error;
      }
      
      return data;
    } catch (error) {
      // Re-throw to preserve error structure including validation errors
      throw error;
    }
  },
  
  // Expose cache methods
  cache,
};

export default apiClient;
