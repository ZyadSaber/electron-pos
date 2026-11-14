import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield, UserRound, Users } from 'lucide-react';

interface AdminDashboardViewProps {
  token: string;
}

interface DashboardCounts {
  soldiers: number;
  officers: number;
  ncos: number;
  users: number;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ token }) => {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [soldiers, officers, ncos, users] = await Promise.all([
        window.workerAPI!.listWorkers(token, { page: 1, pageSize: 1 }),
        window.workerAPI!.listOfficers(token),
        window.workerAPI!.listNonCommissionedOfficers(token),
        window.workerAPI!.listUsers(token),
      ]);
      setCounts({
        soldiers: soldiers.total,
        officers: officers.length,
        ncos: ncos.length,
        users: users.length,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const stats = [
    { label: 'المجندون', value: counts?.soldiers, icon: Users, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'الضباط', value: counts?.officers, icon: Shield, tone: 'bg-sky-50 text-sky-700' },
    { label: 'ضباط الصف', value: counts?.ncos, icon: UserRound, tone: 'bg-amber-50 text-amber-700' },
    { label: 'حسابات المستخدمين', value: counts?.users, icon: UserRound, tone: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-7" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">لوحة المعلومات</h2>
          <p className="mt-1 text-sm text-slate-500">نظرة عامة على أعداد السجلات في النظام.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadCounts()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-500">{label}</span>
              <span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-5 text-3xl font-black tabular-nums text-slate-900">
              {loading && value === undefined ? '—' : (value ?? 0).toLocaleString('ar-EG')}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
        <h3 className="font-bold text-slate-800">المؤشرات والإحصائيات</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          هذه نظرة أولية على أعداد السجلات. يمكن إضافة الإحصائيات والمؤشرات المطلوبة لاحقًا.
        </p>
      </div>
    </section>
  );
};
