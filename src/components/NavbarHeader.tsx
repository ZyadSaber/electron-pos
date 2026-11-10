import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../types';
import { ShoppingCart, Store, Clock, Lock, LogOut, UserCheck } from 'lucide-react';
import { Employee } from '../types';

interface NavbarHeaderProps {
  settings: ShopSettings;
  onNavigate: (tab: any) => void;
  activeTab: string;
  onOpenSearch?: () => void;
  onLockTerminal?: () => void;
  onLogout: () => void;
  currentUser: Employee | null;
  canOpenPOS: boolean;
}

export const NavbarHeader: React.FC<NavbarHeaderProps> = ({
  settings,
  onNavigate,
  activeTab,
  onOpenSearch,
  onLockTerminal,
  onLogout,
  currentUser,
  canOpenPOS,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="no-print bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-14 px-4 flex items-center justify-between shadow-xs sticky top-0 z-30 select-none">
      {/* Right branding & Electron Window decoration (in RTL, starts on the right) */}
      <div className="flex items-center gap-3">

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight flex items-center gap-2">
              {settings.shopName || 'سوبر ماركت النور'}
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-200 dark:border-slate-600">
                إصدار تجاري 2.0
              </span>
            </h1>
            {/* <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium gap-1">
                <WifiOff className="w-3 h-3" />
                يعمل أوفلاين 100%
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                <HardDrive className="w-3 h-3 text-sky-500" />
                قاعدة بيانات SQLite محلية
              </span>
            </p> */}
          </div>
        </div>
      </div>

      {/* Left Controls & Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Global Search Button */}
        {/* {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition border border-slate-200 dark:border-slate-600/50 cursor-pointer"
            title="بحث شامل في النظام (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>بحث سريع...</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded text-[9px] font-mono border text-slate-400">Ctrl K</kbd>
          </button>
        )} */}

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600/50" dir="ltr">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeStr}</span>
        </div>

        {/* Active Staff Session Indicator & Lock Button */}
        {currentUser && (
          <>
            <button
              onClick={onLockTerminal}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-slate-600/50 cursor-pointer"
              title="قفل شاشة الكاشير"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{currentUser.name}</span>
              <Lock className="w-3 h-3 text-slate-400 mr-1" />
            </button>
            <button
              onClick={onLogout}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-rose-200 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </>
        )}

        {/* Quick New Sale POS Shortcut */}
        {canOpenPOS && <button
          onClick={() => onNavigate('pos')}
          className={`px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer ${activeTab === 'pos'
            ? 'bg-emerald-600 text-white shadow-emerald-200 font-bold'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>فاتورة جديدة (F2)</span>
        </button>}
      </div>
    </header>
  );
};
