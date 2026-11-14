import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type {
  PersonHistory,
  PersonHistoryType,
  PersonType,
  WorkerLeave,
  WorkerTransfer,
} from '../types';

export interface PersonnelDetailRecord {
  kind: PersonType;
  militaryNumber: string;
  fullName: string;
  fields: Array<{ label: string; value: string }>;
}

interface PersonnelDetailModalProps {
  token: string;
  record: PersonnelDetailRecord;
  onClose: () => void;
}

type HistorySource = 'person' | 'leave' | 'transfer';

interface HistoryItem {
  id: number;
  source: HistorySource;
  historyType: PersonHistoryType;
  eventDate: string;
  endDate: string;
  title: string;
  duration: string;
  reason: string;
  fromLocation: string;
  toLocation: string;
  location: string;
  notes: string;
}

const historyTypeLabels: Record<PersonHistoryType, string> = {
  punishment: 'عقوبة',
  detention: 'حبس',
  absence: 'غياب',
  leave: 'إجازة',
  transfer: 'نقل بين السرايا / المواقع',
  struckOff: 'شطب',
  dismissed: 'رفت',
  medical: 'تاريخ طبي',
};

const historyTypes = Object.keys(historyTypeLabels) as PersonHistoryType[];
const personHistoryItem = (row: PersonHistory): HistoryItem => ({
  id: row.id,
  source: 'person',
  historyType: row.historyType,
  eventDate: row.eventDate,
  endDate: row.endDate,
  title: row.title,
  duration: row.duration,
  reason: row.reason,
  fromLocation: row.fromLocation,
  toLocation: row.toLocation,
  location: row.location,
  notes: row.notes,
});

const dateText = (start: string, end: string) => end ? `${start} — ${end}` : start;

export const PersonnelDetailModal: React.FC<PersonnelDetailModalProps> = ({ token, record, onClose }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState<PersonHistoryType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [personHistory, leaves, transfers] = await Promise.all([
        window.workerAPI!.listPersonHistory(token, record.kind, record.militaryNumber),
        record.kind === 'soldier'
          ? window.workerAPI!.listLeaves(token, record.militaryNumber)
          : Promise.resolve([] as WorkerLeave[]),
        record.kind === 'soldier'
          ? window.workerAPI!.listTransfers(token, record.militaryNumber)
          : Promise.resolve([] as WorkerTransfer[]),
      ]);
      const items: HistoryItem[] = personHistory.map(personHistoryItem);
      items.push(...leaves.map(row => ({
        id: row.id,
        source: 'leave' as const,
        historyType: 'leave' as const,
        eventDate: row.startDate,
        endDate: row.endDate,
        title: row.leaveType,
        duration: row.duration,
        reason: '',
        fromLocation: '',
        toLocation: '',
        location: '',
        notes: row.notes,
      })));
      items.push(...transfers.map(row => ({
        id: row.id,
        source: 'transfer' as const,
        historyType: 'transfer' as const,
        eventDate: row.effectiveDate,
        endDate: '',
        title: row.reason || 'نقل',
        duration: '',
        reason: row.reason,
        fromLocation: row.fromLocation,
        toLocation: row.toLocation,
        location: '',
        notes: row.notes,
      })));
      setHistory(items.sort((left, right) => right.eventDate.localeCompare(left.eventDate) || right.id - left.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [token, record.kind, record.militaryNumber]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const visibleHistory = useMemo(
    () => filterType === 'all' ? history : history.filter(item => item.historyType === filterType),
    [filterType, history],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-detail-title"
        dir="rtl"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 id="person-detail-title" className="truncate text-lg font-black text-slate-900">{record.fullName}</h2>
            <p className="mt-1 text-sm text-slate-500">الرقم العسكري: {record.militaryNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق تفاصيل الفرد"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-900">البيانات الشخصية</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {record.fields.map(({ label, value }) => (
                <div key={label} className="min-w-0 border-b border-slate-100 pb-3">
                  <dt className="text-xs text-slate-400">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-700">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h3 className="font-bold text-slate-900">السجل التاريخي</h3>
              <p className="mt-1 text-xs text-slate-500">العقوبات والحبس والغياب والإجازات والنقل والشطب والرفت والتاريخ الطبي.</p>
            </div>

            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600">السجلات ({visibleHistory.length.toLocaleString('ar-EG')})</p>
              <select
                value={filterType}
                onChange={event => setFilterType(event.target.value as PersonHistoryType | 'all')}
                aria-label="تصفية السجل التاريخي"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">كل أنواع السجلات</option>
                {historyTypes.map(type => <option key={type} value={type}>{historyTypeLabels[type]}</option>)}
              </select>
            </div>

            {loading ? (
              <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">جارٍ تحميل السجل...</p>
            ) : visibleHistory.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">لا توجد سجلات لهذا النوع حتى الآن.</p>
            ) : (
              <div className="space-y-3">
                {visibleHistory.map(item => (
                  <article key={`${item.source}:${item.id}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{historyTypeLabels[item.historyType]}</span>
                        <h4 className="mt-2 font-bold text-slate-800">{item.title || '—'}</h4>
                        <p className="mt-1 text-xs text-slate-500">{dateText(item.eventDate, item.endDate)}</p>
                      </div>
                    </div>
                    {(item.duration || item.reason || item.fromLocation || item.toLocation || item.location || item.notes) && (
                      <dl className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                        {item.duration && <div><dt className="text-xs text-slate-400">المدة</dt><dd className="mt-1 text-sm text-slate-700">{item.duration}</dd></div>}
                        {item.reason && <div><dt className="text-xs text-slate-400">السبب / التفاصيل</dt><dd className="mt-1 text-sm text-slate-700">{item.reason}</dd></div>}
                        {item.fromLocation && <div><dt className="text-xs text-slate-400">من</dt><dd className="mt-1 text-sm text-slate-700">{item.fromLocation}</dd></div>}
                        {item.toLocation && <div><dt className="text-xs text-slate-400">إلى</dt><dd className="mt-1 text-sm text-slate-700">{item.toLocation}</dd></div>}
                        {item.location && <div><dt className="text-xs text-slate-400">المكان</dt><dd className="mt-1 text-sm text-slate-700">{item.location}</dd></div>}
                        {item.notes && <div className="sm:col-span-2"><dt className="text-xs text-slate-400">ملاحظات</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.notes}</dd></div>}
                      </dl>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};
