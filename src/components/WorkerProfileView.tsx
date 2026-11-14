import React from 'react';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import type { Worker } from '../types';

interface WorkerProfileViewProps {
  worker: Worker;
}

const details = [
  ['الدرجة', 'rank'],
  ['السرية', 'company'],
  ['المكان الفرعي', 'subLocation'],
  ['الرقم القومي', 'nationalId'],
  ['الرقم الثلاثي', 'tripleNumber'],
  ['تاريخ الضم', 'joinDate'],
  ['تاريخ التسريح', 'dischargeDate'],
  ['تاريخ التجنيد', 'enlistmentDate'],
  ['المحافظة', 'governorate'],
  ['المركز', 'district'],
  ['الديانة', 'religion'],
  ['مركز التدريب', 'trainingCenter'],
  ['السلاح', 'weapon'],
] as const;

export const WorkerProfileView: React.FC<WorkerProfileViewProps> = ({ worker }) => (
  <section className="mx-auto w-full max-w-5xl space-y-5 p-5 sm:p-7" dir="rtl">
    <div>
      <h2 className="text-xl font-black text-slate-900">بياناتي وسجلاتي</h2>
      <p className="mt-1 text-sm text-slate-500">عرض بيانات المجند وسجلات الإجازات والتنقلات الخاصة به.</p>
    </div>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 bg-slate-900 p-6 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
          <UserRound className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{worker.fullName}</h3>
          <p className="mt-1 font-mono text-sm text-slate-300" dir="ltr">{worker.militaryNumber}</p>
        </div>
      </div>
      <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {details.map(([label, key]) => (
          <div key={key} className="border-b border-slate-100 px-5 py-4">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{worker[key] || '—'}</dd>
          </div>
        ))}
      </dl>
    </article>
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <CalendarDays className="h-5 w-5 text-emerald-700" />
        سجلات إجازاتي
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <MapPin className="h-5 w-5 text-sky-700" />
        سجل تنقلاتي
      </div>
    </div>
  </section>
);
