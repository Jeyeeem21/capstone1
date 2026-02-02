// Admin pages (from admin folder)
export { 
  Dashboard, 
  Procurement, 
  Processing, 
  Products, 
  Categories, 
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

// Re-export organized by role
export * as AdminPages from './admin';
export * as StaffPages from './staff';
export * as SharedPages from './shared';
