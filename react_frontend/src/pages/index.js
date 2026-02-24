// Admin pages (from admin folder)
export { 
  Dashboard, 
  Procurement, 
  DryingProcess,
  Processing, 
  Products, 
  Varieties, 
  Inventory,
  Sales, 
  Partners, 
  Supplier, 
  Customer,
  StaffManagement, 
  AuditTrail, 
  Settings 
} from './admin';

// Shared pages (from shared folder)
export { PointOfSale } from './shared';

// Staff pages (from staff folder)
export { StaffDashboard, StaffProfile } from './staff';

// Client pages (from client folder)
export { ClientDashboard, Shop, Orders, Cart, Profile, ClientSettings } from './client';

// Re-export organized by role
export * as AdminPages from './admin';
export * as StaffPages from './staff';
export * as SharedPages from './shared';
export * as ClientPages from './client';
