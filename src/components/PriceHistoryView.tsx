import React, { useState } from 'react';
import { sqliteDB } from '../db/sqliteStorage';
import { PriceHistoryRecord } from '../types';
import { TrendingUp, History, User, Calendar, Search } from 'lucide-react';

export const PriceHistoryView: React.FC = () => {
  const [records, setRecords] = useState<PriceHistoryRecord[]>(sqliteDB.getPriceHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const currency = sqliteDB.getSettings().currencySymbol || 'ج.م';

  const filtered = records.filter(r => 
    r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.changedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            سجل تدقيق وتتبع تغير أسعار الأصناف
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سجل تاريخي يوضح تقلبات أسعار شراء الجملة وتعديلات سعر بيع المستهلك لحماية هوامش الربح.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالصنف أو اسم المستخدم..."
            className="w-full pr-9 pl-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-700/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3 rounded-r-xl text-right">التاريخ والوقت</th>
                <th className="p-3 text-right">اسم الصنف</th>
                <th className="p-3 text-left">شراء سابق</th>
                <th className="p-3 text-left">شراء جديد</th>
                <th className="p-3 text-left">بيع سابق</th>
                <th className="p-3 text-left">بيع جديد</th>
                <th className="p-3 rounded-l-xl text-right">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد تعديلات أسعار مسجلة في سجل النظام حتى الآن.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(r.dateChanged).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{r.productName}</td>
                    <td className="p-3 text-left font-mono">{r.oldPurchasePrice} {currency}</td>
                    <td className="p-3 text-left font-bold text-slate-800 dark:text-slate-100 font-mono">{r.newPurchasePrice} {currency}</td>
                    <td className="p-3 text-left font-mono">{r.oldSellingPrice} {currency}</td>
                    <td className="p-3 text-left font-bold text-emerald-600 font-mono">{r.newSellingPrice} {currency}</td>
                    <td className="p-3 text-slate-500">{r.changedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
