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
   */
  getStats: async () => {
    return apiClient.get(ENDPOINTS.DASHBOARD.STATS, {
      useCache: true,
      cacheKey: 'dashboard-stats',
    });
  },
  
  /**
   * Get recent activity
   * @param {number} limit - Number of activities to fetch
   */
  getRecentActivity: async (limit = 10) => {
    return apiClient.get(ENDPOINTS.DASHBOARD.RECENT_ACTIVITY, {
      params: { limit },
      useCache: true,
      cacheKey: `dashboard-activity-${limit}`,
    });
  },
  
  /**
   * Refresh dashboard data (clears cache and fetches fresh)
   */
  refresh: async () => {
    apiClient.cache.remove('dashboard-stats');
    apiClient.cache.remove('dashboard-activity-10');
    
    const [stats, activity] = await Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getRecentActivity(),
    ]);
    
    return { stats, activity };
  },
};

export default dashboardApi;
