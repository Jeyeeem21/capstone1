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
    CATEGORIES: '/products/categories',
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
};

// ============================================
// Request Configuration
// ============================================
export const REQUEST_CONFIG = {
  TIMEOUT: 5000, // 5 seconds (faster timeout)
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
