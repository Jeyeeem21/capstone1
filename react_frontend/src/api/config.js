/**
 * API Configuration
 * 
 * This file contains all API-related configuration.
 * When deploying, only change the BASE_URL here!
 */

// ============================================
// 🔧 DEPLOYMENT: Change this URL when deploying
// ============================================
// Development
export const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Production (uncomment and update when deploying)
// export const API_BASE_URL = 'https://your-production-domain.com/api';

// ============================================
// OpenRouteService API (Free - address autocomplete & distance)
// ============================================
export const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdiYTlmZThhY2QwODQ2ZDViMDU3NDlmOWQ4NTY3N2Y2IiwiaCI6Im11cm11cjY0In0=';
export const ORS_BASE_URL = 'https://api.openrouteservice.org';

// ============================================
// API Endpoints Configuration
// ============================================
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },
  
  // Products
  PRODUCTS: {
    BASE: '/products',
    FEATURED: '/products/featured',
    VARIETIES: '/varieties',
    BY_ID: (id) => `/products/${id}`,
  },
  
  // Orders
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    BY_STATUS: (status) => `/orders?status=${status}`,
  },
  
  // Inventory
  INVENTORY: {
    BASE: '/inventory',
    BY_ID: (id) => `/inventory/${id}`,
    LOW_STOCK: '/inventory/low-stock',
  },
  
  // Sales
  SALES: {
    BASE: '/sales',
    SUMMARY: '/sales/summary',
    BY_DATE: (start, end) => `/sales?start=${start}&end=${end}`,
  },
  
  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ACTIVITY: '/dashboard/recent-activity',
    REFRESH: '/dashboard/refresh',
  },
  
  // Settings
  SETTINGS: {
    BASE: '/settings',
    PROFILE: '/settings/profile',
  },
  
  // Contact
  CONTACT: {
    SEND: '/contact',
  },
  
  // Website Content
  WEBSITE_CONTENT: {
    BASE: '/website-content',
    HOME: '/website-content/home',
    ABOUT: '/website-content/about',
    SEED: '/website-content/seed',
  },

  // Drivers
  DRIVERS: {
    BASE: '/drivers',
    STATISTICS: '/drivers/statistics',
    BY_ID: (id) => `/drivers/${id}`,
  },

  // Deliveries
  DELIVERIES: {
    BASE: '/deliveries',
    STATISTICS: '/deliveries/statistics',
    BY_DRIVER: (driverId) => `/deliveries/driver/${driverId}`,
    BY_ID: (id) => `/deliveries/${id}`,
    UPDATE_STATUS: (id) => `/deliveries/${id}/status`,
  },
};

// ============================================
// Request Configuration
// ============================================
export const REQUEST_CONFIG = {
  TIMEOUT: 15000, // 15 seconds
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 500, // 0.5 second
};

// ============================================
// Cache Configuration
// ============================================
export const CACHE_CONFIG = {
  ENABLED: true,
  PREFIX: 'kjp-',
  TTL: 10 * 60 * 1000, // 10 minutes - longer cache for faster loads
};
