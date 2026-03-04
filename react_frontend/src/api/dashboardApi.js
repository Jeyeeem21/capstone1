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
   * @param {string} period - 'daily' | 'weekly' | 'monthly' | 'bi-annually' | 'annually'
   * @param {object} chartParams - { month, year, yearFrom, yearTo }
   */
  getStats: async (period = 'monthly', chartParams = {}) => {
    const params = new URLSearchParams({ period });
    if (chartParams.month) params.set('month', chartParams.month);
    if (chartParams.year) params.set('year', chartParams.year);
    if (chartParams.yearFrom) params.set('year_from', chartParams.yearFrom);
    if (chartParams.yearTo) params.set('year_to', chartParams.yearTo);
    const cacheKey = `dashboard-stats-${period}-${JSON.stringify(chartParams)}`;
    return apiClient.get(`${ENDPOINTS.DASHBOARD.STATS}?${params.toString()}`, {
      useCache: true,
      cacheKey,
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
