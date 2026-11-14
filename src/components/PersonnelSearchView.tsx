import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PersonnelDetailModal, type PersonnelDetailRecord } from './PersonnelDetailModal';
import type { NonCommissionedOfficer, Officer, Soldier } from '../types';

type RecordKind = 'soldier' | 'officer' | 'nco';
type SearchKind = 'all' | RecordKind;

interface PersonnelRecord {
  kind: RecordKind;
  militaryNumber: string;
  fullName: string;
  fields: Array<{ label: string; value: string }>;
  searchableText: string;
}

interface PersonnelSearchViewProps {
  token: string;
}

const kindLabels: Record<RecordKind, string> = {
  soldier: 'مجند',
  officer: 'ضابط',
  nco: 'ضابط صف',
};

const valueText = (value: string | number | undefined) => String(value ?? '').trim() || '—';
const toFields = (entries: Array<[string, string | number | undefined]>) =>
  entries.map(([label, value]) => ({ label, value: valueText(value) }));

const soldierRecord = (soldier: Soldier): PersonnelRecord => {
  const fields = toFields([
    ['الرقم العسكري', soldier.militaryNumber],
    ['الدرجة / الرتبة', soldier.rank],
    ['الرقم القومي', soldier.nationalId],
    ['الرقم الثلاثي', soldier.tripleNumber],
    ['السرية', soldier.company],
    ['المكان الفرعي', soldier.subLocation],
    ['المحافظة', soldier.governorate],
    ['المركز', soldier.district],
    ['مركز التدريب', soldier.trainingCenter],
    ['السلاح', soldier.weapon],
    ['الهاتف', soldier.phone],
    ['الحالة الشهرية', soldier.monthlyStatus],
    ['ملاحظات', soldier.notes],
    ['الديانة', soldier.religion],
    ['تاريخ الضم', soldier.joinDate],
    ['تاريخ التجنيد', soldier.enlistmentDate],
    ['تاريخ التسريح', soldier.dischargeDate],
    ['تاريخ إنشاء السجل', soldier.createdAt],
    ['تاريخ آخر تحديث', soldier.updatedAt],
  ]);
  return {
    kind: 'soldier',
    militaryNumber: soldier.militaryNumber,
    fullName: soldier.fullName,
    fields,
    searchableText: [soldier.fullName, ...fields.map(field => field.value)].join(' ').toLocaleLowerCase(),
  };
};

const officerRecord = (officer: Officer): PersonnelRecord => {
  const fields = toFields([
    ['الرقم العسكري', officer.militaryNumber],
    ['رقم الأقدمية', officer.seniorityNumber],
    ['الرتبة', officer.rank],
    ['الرقم القومي', officer.nationalId],
    ['السرية', officer.company],
    ['المكان الفرعي', officer.subLocation],
    ['الحالة الاجتماعية', officer.maritalStatus],
    ['عدد الأبناء الذكور', officer.maleChildren],
    ['عدد الأبناء الإناث', officer.femaleChildren],
    ['تاريخ إنشاء السجل', officer.createdAt],
    ['تاريخ آخر تحديث', officer.updatedAt],
  ]);
  return {
    kind: 'officer',
    militaryNumber: officer.militaryNumber,
    fullName: officer.fullName,
    fields,
    searchableText: [officer.fullName, ...fields.map(field => field.value)].join(' ').toLocaleLowerCase(),
  };
};

const ncoRecord = (nco: NonCommissionedOfficer): PersonnelRecord => {
  const fields = toFields([
    ['الرقم العسكري', nco.militaryNumber],
    ['رقم الأقدمية', nco.seniorityNumber],
    ['الدرجة', nco.degree],
    ['الرقم القومي', nco.nationalId],
    ['السرية', nco.company],
    ['المكان الفرعي', nco.subLocation],
    ['الحالة الاجتماعية', nco.maritalStatus],
    ['عدد الأبناء الذكور', nco.maleChildren],
    ['عدد الأبناء الإناث', nco.femaleChildren],
    ['تاريخ إنشاء السجل', nco.createdAt],
    ['تاريخ آخر تحديث', nco.updatedAt],
  ]);
  return {
    kind: 'nco',
    militaryNumber: nco.militaryNumber,
    fullName: nco.fullName,
    fields,
    searchableText: [nco.fullName, ...fields.map(field => field.value)].join(' ').toLocaleLowerCase(),
  };
};

export const PersonnelSearchView: React.FC<PersonnelSearchViewProps> = ({ token }) => {
  const [officers, setOfficers] = useState<PersonnelRecord[]>([]);
  const [ncos, setNcos] = useState<PersonnelRecord[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<SearchKind>('all');
  const [soldiers, setSoldiers] = useState<PersonnelRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PersonnelDetailRecord | null>(null);

  useEffect(() => {
    let active = true;
    setDirectoryLoading(true);
    Promise.all([
      window.workerAPI!.listOfficers(token),
      window.workerAPI!.listNonCommissionedOfficers(token),
    ])
      .then(([officerRows, ncoRows]) => {
        if (!active) return;
        setOfficers(officerRows.map(officerRecord));
        setNcos(ncoRows.map(ncoRecord));
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setDirectoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    const query = search.trim();
    setError('');
    setSoldiers([]);
    if (!query || (kind !== 'all' && kind !== 'soldier')) {
      setSearchLoading(false);
      return () => {
        active = false;
      };
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const firstPage = await window.workerAPI!.listWorkers(token, {
            search: query,
            page: 1,
            pageSize: 100,
          });
          const matches = [...firstPage.workers];
          const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
          for (let page = 2; page <= pageCount; page += 1) {
            const result = await window.workerAPI!.listWorkers(token, {
              search: query,
              page,
              pageSize: firstPage.pageSize,
            });
            matches.push(...result.workers);
            if (result.workers.length === 0) break;
          }
          if (active) setSoldiers(matches.map(soldierRecord));
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
          if (active) setSearchLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, search, kind]);

  const results = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const ranks = [...officers, ...ncos].filter(record => record.searchableText.includes(query));
    return [
      ...(kind === 'all' || kind === 'soldier' ? soldiers : []),
      ...(kind === 'all' || kind === 'officer' ? ranks.filter(record => record.kind === 'officer') : []),
      ...(kind === 'all' || kind === 'nco' ? ranks.filter(record => record.kind === 'nco') : []),
    ];
  }, [kind, ncos, officers, search, soldiers]);

  const loading = directoryLoading || searchLoading;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">بحث شامل</h2>
        <p className="mt-1 text-sm text-slate-500">ابحث في سجلات المجندين والضباط وضباط الصف، واعرض تفاصيل كل سجل.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="الاسم، الرقم العسكري، الرقم القومي، الرتبة، السرية..."
            aria-label="البحث في جميع السجلات"
            className="w-full rounded-lg border border-slate-300 py-2.5 pe-10 ps-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <select
          value={kind}
          onChange={event => setKind(event.target.value as SearchKind)}
          aria-label="نوع السجل"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">كل الفئات</option>
          <option value="soldier">المجندون</option>
          <option value="officer">الضباط</option>
          <option value="nco">ضباط الصف</option>
        </select>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {!search.trim() ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          اكتب كلمة أو رقمًا لبدء البحث في السجلات.
        </p>
      ) : loading ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">جارٍ البحث في السجلات...</p>
      ) : results.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">لا توجد سجلات مطابقة.</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-500">عدد النتائج: {results.length.toLocaleString('ar-EG')}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {results.map(record => (
              <article
                key={`${record.kind}:${record.militaryNumber}`}
                role="button"
                tabIndex={0}
                aria-label={`عرض التفاصيل الكاملة لـ ${record.fullName}`}
                onClick={() => setSelectedRecord(record)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRecord(record);
                  }
                }}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{valueText(record.fullName)}</h3>
                    <p className="mt-1 text-xs text-slate-500">الرقم العسكري: {valueText(record.militaryNumber)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {kindLabels[record.kind]}
                  </span>
                </div>
                <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  {record.fields.map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-slate-400">{label}</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="mt-3 inline-block text-sm font-bold text-emerald-700">اضغط لعرض التفاصيل والسجل التاريخي</span>
              </article>
            ))}
          </div>
        </>
      )}
      {selectedRecord && (
        <PersonnelDetailModal
          token={token}
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </section>
  );
};
