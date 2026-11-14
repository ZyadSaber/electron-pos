import React from 'react';
import { LogOut, UserRound } from 'lucide-react';
import type { Worker } from '../types';

export type AppTab = 'dashboard' | 'search' | 'workers' | 'basics' | 'officers' | 'ncos' | 'users' | 'leaves' | 'transfers' | 'backup' | 'profile';

interface NavbarHeaderProps {
  worker: Worker;
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  onLogout: () => void;
}

const adminTabs: Array<{ id: AppTab; label: string }> = [
  { id: 'dashboard', label: 'لوحة المعلومات' },
  { id: 'search', label: 'بحث شامل' },
  { id: 'workers', label: 'المجندون' },
  { id: 'basics', label: 'تعريف الاساسيات' },
  { id: 'officers', label: 'الضباط' },
  { id: 'ncos', label: 'ضباط الصف' },
  { id: 'users', label: 'المستخدمون' },
  { id: 'leaves', label: 'الإجازات' },
  { id: 'transfers', label: 'التنقلات' },
  { id: 'backup', label: 'النسخ الاحتياطي' },
];

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  worker,
  activeTab,
  onNavigate,
  onLogout,
}) => (
  <header className="shrink-0 border-b border-slate-200 bg-white shadow-sm" dir="rtl">
    <div className="flex min-h-16 items-center justify-between gap-4 px-5">
      <div>
        <h1 className="text-base font-black text-slate-900">إدارة المجندين</h1>
        <p className="mt-0.5 text-xs text-slate-500">بيانات المجندين والإجازات والتنقلات</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <UserRound className="h-4 w-4 text-slate-400" />
          {worker.fullName}
          {worker.isAdmin && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">مسؤول</span>
          )}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          خروج
        </button>
      </div>
    </div>
    <nav className="flex gap-1 overflow-x-auto px-5" aria-label="التنقل الرئيسي">
      {(worker.isAdmin ? adminTabs : [{ id: 'profile' as const, label: 'بياناتي وسجلاتي' }]).map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onNavigate(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === tab.id
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  </header>
);
