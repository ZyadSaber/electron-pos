import { EmployeeRole, TabType } from '../types';

const roleTabs: Record<EmployeeRole, readonly TabType[]> = {
  Owner: [
    'dashboard', 'pos', 'products', 'categories', 'customers', 'suppliers',
    'purchase_orders', 'expenses', 'employees', 'attendance', 'cash_register',
    'smart_reorder', 'price_history', 'sales_history', 'returns',
    'inventory_intel', 'reports', 'barcodes', 'backup', 'audit_logs',
    'recycle_bin', 'health_monitor', 'settings',
  ],
  Manager: [
    'dashboard', 'pos', 'products', 'categories', 'customers', 'suppliers',
    'purchase_orders', 'expenses', 'employees', 'attendance', 'cash_register',
    'smart_reorder', 'price_history', 'sales_history', 'returns',
    'inventory_intel', 'reports', 'barcodes',
  ],
  Cashier: ['pos', 'customers', 'cash_register'],
  'Inventory Staff': [
    'products', 'categories', 'suppliers', 'purchase_orders',
    'smart_reorder', 'inventory_intel', 'barcodes',
  ],
  Accountant: [
    'dashboard', 'customers', 'suppliers', 'expenses', 'price_history',
    'sales_history', 'reports',
  ],
};

export const canAccessTab = (role: EmployeeRole, tab: TabType): boolean =>
  roleTabs[role].includes(tab);

export const canManageCashShifts = (role: EmployeeRole): boolean =>
  role === 'Owner' || role === 'Manager';

export const getDefaultTab = (role: EmployeeRole): TabType => {
  if (role === 'Cashier') return 'cash_register';
  if (role === 'Inventory Staff') return 'products';
  if (role === 'Accountant') return 'reports';
  return 'dashboard';
};
