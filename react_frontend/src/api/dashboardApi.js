/**
 * Dashboard API
 * 
 * All dashboard-related API calls
 */

import apiClient from './apiClient';
import { ENDPOINTS } from './config';

export const dashboardApi = {
  /**
   * Get dashboard statistics
   * @param {string} period - 'daily' | 'monthly' | 'yearly'
   */
  getStats: async (period = 'monthly') => {
    return apiClient.get(`${ENDPOINTS.DASHBOARD.STATS}?period=${period}`, {
      useCache: true,
      cacheKey: `dashboard-stats-${period}`,
    });
  },

  /**
   * Get recent activity
   * @param {number} limit - Number of activities to fetch
   */
  getRecentActivity: async (limit = 15) => {
    return apiClient.get(`${ENDPOINTS.DASHBOARD.RECENT_ACTIVITY}?limit=${limit}`, {
      useCache: true,
      cacheKey: `dashboard-activity-${limit}`,
    });
  },

  /**
   * Refresh dashboard data (clears cache and fetches fresh)
   */
  refresh: async () => {
    // Clear frontend cache
    apiClient.cache.remove('dashboard-stats-daily');
    apiClient.cache.remove('dashboard-stats-monthly');
    apiClient.cache.remove('dashboard-stats-yearly');
    apiClient.cache.remove('dashboard-activity-15');

    // Clear backend cache
    await apiClient.post(ENDPOINTS.DASHBOARD.REFRESH);
  },
};

export default dashboardApi;
