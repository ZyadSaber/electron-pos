import React from 'react';
import { EmployeeRole, TabType } from '../types';
import { canAccessTab } from '../utils/permissions';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Receipt,
  BarChart3,
  Barcode,
  DatabaseBackup,
  Settings,
  AlertTriangle,
  Users,
  Truck,
  FileCheck,
  TrendingDown,
  UserCheck,
  Clock,
  RotateCcw,
  Zap,
  ShieldCheck,
  DollarSign,
  Trash2,
  Activity,
  History
} from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  lowStockCount: number;
  role: EmployeeRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  lowStockCount,
  role,
}) => {
  const navGroups: {
    title: string;
    items: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[];
  }[] = [
      {
        title: 'المبيعات ونقطة البيع (الكاشير)',
        items: [
          { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
          { id: 'pos', label: 'نقطة البيع (الكاشير)', icon: ShoppingCart },
          { id: 'cash_register', label: 'شفتات ودرج النقدية', icon: DollarSign },
          { id: 'sales_history', label: 'سجل الفواتير والمبيعات', icon: Receipt },
          { id: 'returns', label: 'المرتجعات والاستبدال', icon: RotateCcw },
        ]
      },
      {
        title: 'المخزن وإدارة الأصناف',
        items: [
          { id: 'products', label: 'المنتجات والمخزون', icon: Package },
          { id: 'categories', label: 'تصنيفات المنتجات', icon: Tags },
          { id: 'smart_reorder', label: 'إعادة الطلب الذكي', icon: Zap },
          { id: 'purchase_orders', label: 'أوامر الشراء', icon: FileCheck },
          { id: 'inventory_intel', label: 'تحليلات وحركة المخزون', icon: BarChart3 },
        ]
      },
      {
        title: 'العملاء والحسابات المالية',
        items: [
          { id: 'customers', label: 'العملاء وحساب الآجل', icon: Users },
          { id: 'suppliers', label: 'دليل وحسابات الموردين', icon: Truck },
          { id: 'expenses', label: 'مصروفات المحل والنثريات', icon: TrendingDown },
          { id: 'price_history', label: 'سجل تغيير الأسعار', icon: History },
          { id: 'reports', label: 'التقارير والأرباح والخسائر', icon: BarChart3 },
        ]
      },
      {
        title: 'إدارة النظام والتشغيل',
        items: [
          { id: 'employees', label: 'الموظفون وصلاحيات الدخول', icon: UserCheck },
          // { id: 'attendance', label: 'الحضور والانصراف اليومي', icon: Clock },
          { id: 'barcodes', label: 'طباعة وتصميم الباركود', icon: Barcode },
          // { id: 'recycle_bin', label: 'سلة المحذوفات', icon: Trash2 },
          // { id: 'health_monitor', label: 'حالة وأداء النظام', icon: Activity },
          // { id: 'audit_logs', label: 'سجل العمليات والأمان', icon: ShieldCheck },
          { id: 'backup', label: 'النسخ الاحتياطي والاستعادة', icon: DatabaseBackup },
          { id: 'settings', label: 'إعدادات المحل والفاتورة', icon: Settings },
        ]
      }
    ];

  return (
    <aside className="no-print w-64 h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="p-3 space-y-4">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter(item => canAccessTab(role, item.id));
          if (visibleItems.length === 0) return null;
          return (
            <div key={groupIdx} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {group.title}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition duration-150 cursor-pointer ${isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.id === 'products' && lowStockCount > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${isActive ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}>
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        {lowStockCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 m-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          نظام كاشير محلي (أوفلاين)
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          قاعدة بيانات SQLite محلية نشطة وسريعة
        </p>
      </div>
    </aside>
  );
};
