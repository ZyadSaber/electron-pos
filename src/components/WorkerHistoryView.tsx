import React, { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import type {
  NonCommissionedOfficer,
  Officer,
  PersonnelLeaveRecord,
  PersonType,
  Soldier,
  WorkerBasicDefinition,
  Worker,
  WorkerTransfer,
} from '../types';

type HistoryMode = 'leaves' | 'transfers';

interface WorkerHistoryViewProps {
  mode: HistoryMode;
  token: string;
  worker: Worker;
}

interface PersonChoice {
  militaryNumber: string;
  fullName: string;
  company: string;
}

const personTypeLabels: Record<PersonType, string> = {
  soldier: 'مجند',
  officer: 'ضابط',
  nco: 'ضابط صف',
};

export const WorkerHistoryView: React.FC<WorkerHistoryViewProps> = ({ mode, token, worker }) => {
  const isAdmin = worker.isAdmin;
  const [records, setRecords] = useState<Array<PersonnelLeaveRecord | WorkerTransfer>>([]);
  const [filterWorkerId, setFilterWorkerId] = useState(isAdmin ? '' : worker.militaryNumber);
  const [filterPersonType, setFilterPersonType] = useState<PersonType | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterFullName, setFilterFullName] = useState('');
  const [personType, setPersonType] = useState<PersonType | ''>('');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personChoices, setPersonChoices] = useState<PersonChoice[]>([]);
  const [personSearchLoading, setPersonSearchLoading] = useState(false);
  const [basicDefinitions, setBasicDefinitions] = useState<WorkerBasicDefinition[]>([]);
  const [basicsLoading, setBasicsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isLeaves = mode === 'leaves';
  const companies = basicDefinitions.filter(definition => definition.category === 'company');
  const leaveTypes = basicDefinitions.filter(definition => definition.category === 'leaveType');

  useEffect(() => {
    if (!isLeaves || !isAdmin) return undefined;
    let active = true;
    setBasicsLoading(true);
    window.workerAPI!.listWorkerBasics(token)
      .then(definitions => {
        if (active) setBasicDefinitions(definitions);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setBasicsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, isLeaves, isAdmin]);

  useEffect(() => {
    let active = true;
    const request = isLeaves
      ? window.workerAPI!.listPersonnelLeaves(token, isAdmin ? {
        personType: filterPersonType === 'all' ? undefined : filterPersonType,
        company: filterCompany,
        fullName: filterFullName,
        militaryNumber: filterWorkerId,
      } : undefined)
      : window.workerAPI!.listTransfers(token, filterWorkerId);
    request.then(result => {
      if (active) setRecords(result);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => {
      active = false;
    };
  }, [token, mode, filterWorkerId, filterPersonType, filterCompany, filterFullName, refreshKey, isLeaves, isAdmin]);

  useEffect(() => {
    let active = true;
    const query = personSearch.trim();
    setSelectedPersonId('');
    setPersonChoices([]);
    if (!isLeaves || !isAdmin || !personType || !query) {
      setPersonSearchLoading(false);
      return () => {
        active = false;
      };
    }

    setPersonSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          let choices: PersonChoice[];
          if (personType === 'soldier') {
            const firstPage = await window.workerAPI!.listWorkers(token, { search: query, page: 1, pageSize: 100 });
            const matches: Soldier[] = [...firstPage.workers];
            const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
            for (let page = 2; page <= pageCount; page += 1) {
              const nextPage = await window.workerAPI!.listWorkers(token, {
                search: query,
                page,
                pageSize: firstPage.pageSize,
              });
              matches.push(...nextPage.workers);
              if (!nextPage.workers.length) break;
            }
            choices = matches.map(row => ({
              militaryNumber: row.militaryNumber,
              fullName: row.fullName,
              company: row.company,
            }));
          } else {
            const rows: Array<Officer | NonCommissionedOfficer> = personType === 'officer'
              ? await window.workerAPI!.listOfficers(token)
              : await window.workerAPI!.listNonCommissionedOfficers(token);
            const normalizedQuery = query.toLocaleLowerCase();
            choices = rows.filter(row => [row.militaryNumber, row.fullName, row.company].some(value =>
              value.toLocaleLowerCase().includes(normalizedQuery)))
              .map(row => ({
                militaryNumber: row.militaryNumber,
                fullName: row.fullName,
                company: row.company,
              }));
          }
          if (active) setPersonChoices(choices);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
          if (active) setPersonSearchLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isLeaves, isAdmin, personType, personSearch, token]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const workerId = isAdmin ? String(form.get('workerId') || '').trim() : worker.militaryNumber;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (isLeaves) {
        if (!personType || !selectedPersonId) {
          throw new Error('اختر فئة الفرد ثم اختر الشخص المطلوب.');
        }
        await window.workerAPI!.savePersonnelLeave(token, {
          personType,
          militaryNumber: selectedPersonId,
          leaveType: String(form.get('leaveType') || '').trim(),
          startDate: String(form.get('startDate') || ''),
          endDate: String(form.get('endDate') || ''),
          duration: String(form.get('duration') || '').trim(),
          notes: String(form.get('notes') || '').trim(),
        });
      } else {
        await window.workerAPI!.saveTransfer(token, {
          workerId,
          effectiveDate: String(form.get('effectiveDate') || ''),
          fromLocation: String(form.get('fromLocation') || '').trim(),
          toLocation: String(form.get('toLocation') || '').trim(),
          reason: String(form.get('reason') || '').trim(),
          notes: String(form.get('notes') || '').trim(),
        });
      }
      formElement.reset();
      if (isLeaves) {
        setPersonType('');
        setPersonSearch('');
        setSelectedPersonId('');
        setPersonChoices([]);
      }
      if (!isAdmin) {
        const workerInput = formElement.elements.namedItem('workerId');
        if (workerInput instanceof HTMLInputElement) workerInput.value = worker.militaryNumber;
      }
      setSuccess(isLeaves ? 'تم حفظ سجل الإجازة.' : 'تم تسجيل النقل وتحديث المكان الفرعي.');
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (record: PersonnelLeaveRecord | WorkerTransfer) => {
    if (!window.confirm(isLeaves ? 'هل تريد حذف سجل الإجازة؟' : 'هل تريد حذف سجل النقل؟')) return;
    setError('');
    try {
      if (isLeaves) {
        const leave = record as PersonnelLeaveRecord;
        await window.workerAPI!.deletePersonnelLeave(token, leave.source, leave.id);
      } else {
        await window.workerAPI!.deleteTransfer(token, record.id);
      }
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">{isLeaves ? 'الإجازات والعطلات' : 'التنقلات بين المواقع'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isLeaves
            ? 'تسجيل ومراجعة فترات الإجازات للمجندين والضباط وضباط الصف.'
            : 'توثيق انتقال المجند بين المواقع مع تحديث مكانه الفرعي.'}
        </p>
      </div>

      {isAdmin && (isLeaves ? (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            الفئة
            <select
              value={filterPersonType}
              onChange={event => setFilterPersonType(event.target.value as PersonType | 'all')}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"
            >
              <option value="all">كل الفئات</option>
              {(Object.keys(personTypeLabels) as PersonType[]).map(type => (
                <option key={type} value={type}>{personTypeLabels[type]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            السرية
            <select
              value={filterCompany}
              onChange={event => setFilterCompany(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
            >
              <option value="">كل السرايا</option>
              {companies.map(company => <option key={company.value} value={company.value}>{company.value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            الاسم
            <input
              value={filterFullName}
              onChange={event => setFilterFullName(event.target.value)}
              placeholder="تصفية بالاسم..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            الرقم العسكري
            <input
              value={filterWorkerId}
              onChange={event => setFilterWorkerId(event.target.value)}
              placeholder="تصفية بالرقم العسكري..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
              dir="ltr"
            />
          </label>
        </div>
      ) : (
        <label className="relative block max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filterWorkerId}
            onChange={event => setFilterWorkerId(event.target.value)}
            placeholder="تصفية بالرقم العسكري..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-9 pl-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
      ))}

      {isAdmin && (
        <form onSubmit={handleSave} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 sm:col-span-2 lg:col-span-4">
            {isLeaves ? <CalendarDays className="h-5 w-5 text-emerald-700" /> : <MapPin className="h-5 w-5 text-emerald-700" />}
            {isLeaves ? 'إضافة إجازة' : 'تسجيل نقل جديد'}
          </h3>
          {isLeaves ? (
            <>
              <label className="text-xs font-semibold text-slate-600">
                فئة الفرد
                <select
                  name="personType"
                  value={personType}
                  onChange={event => setPersonType(event.target.value as PersonType | '')}
                  required
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"
                >
                  <option value="">اختر الفئة</option>
                  {(Object.keys(personTypeLabels) as PersonType[]).map(type => (
                    <option key={type} value={type}>{personTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                البحث عن الفرد
                <input
                  type="search"
                  value={personSearch}
                  onChange={event => setPersonSearch(event.target.value)}
                  disabled={!personType}
                  placeholder="ابحث بالسرية أو الاسم أو الرقم العسكري..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 disabled:bg-slate-100"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                الفرد
                <select
                  name="militaryNumber"
                  value={selectedPersonId}
                  onChange={event => setSelectedPersonId(event.target.value)}
                  required
                  disabled={!personType || !personSearch.trim() || personSearchLoading}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100"
                >
                  <option value="">
                    {personSearchLoading
                      ? 'جارٍ البحث...'
                      : personChoices.length
                        ? 'اختر الفرد'
                        : personSearch.trim()
                          ? 'لا توجد نتائج مطابقة'
                          : 'أدخل بيانات البحث أولاً'}
                  </option>
                  {personChoices.map(person => (
                    <option key={person.militaryNumber} value={person.militaryNumber}>
                      {person.fullName} · {person.militaryNumber} · {person.company || 'بدون سرية'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                نوع الإجازة
                <select
                  name="leaveType"
                  required
                  disabled={basicsLoading || leaveTypes.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal disabled:bg-slate-100"
                >
                  <option value="">
                    {basicsLoading ? 'جار تحميل أنواع الإجازات...' : 'اختر نوع الإجازة'}
                  </option>
                  {leaveTypes.map(definition => (
                    <option key={definition.value} value={definition.value}>{definition.value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                من تاريخ
                <input name="startDate" type="date" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                إلى تاريخ
                <input name="endDate" type="date" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                المدة
                <input name="duration" maxLength={100} placeholder="مثال: 3 أيام" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              {leaveTypes.length === 0 && !basicsLoading && (
                <p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-4">
                  أضف أنواع الإجازات من صفحة تعريف الاساسيات أولاً.
                </p>
              )}
            </>
          ) : (
            <>
              <label className="text-xs font-semibold text-slate-600">
                الرقم العسكري
                <input name="workerId" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" dir="ltr" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                تاريخ سريان النقل
                <input name="effectiveDate" type="date" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                الموقع السابق
                <input name="fromLocation" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                الموقع الجديد
                <input name="toLocation" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
            </>
          )}
          {isLeaves ? (
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              ملاحظات
              <input name="notes" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
            </label>
          ) : (
            <>
              <label className="text-xs font-semibold text-slate-600">
                سبب النقل
                <input name="reason" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                ملاحظات
                <input name="notes" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal" />
              </label>
            </>
          )}
          {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-4">{error}</p>}
          {success && <p role="status" className="text-sm text-emerald-700 sm:col-span-2 lg:col-span-4">{success}</p>}
          <div className="flex justify-end sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              <Plus className="h-4 w-4" />
              {busy ? 'جارٍ الحفظ...' : 'حفظ السجل'}
            </button>
          </div>
        </form>
      )}

      {!isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-800">{worker.fullName} · {worker.militaryNumber}</h3>
          <p className="text-sm text-slate-500">هذه سجلاتك للعرض فقط. تواصل مع المسؤول لطلب إضافة سجل أو تصحيحه.</p>
        </div>
      )}

      {error && !isAdmin && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-800">السجلات ({records.length.toLocaleString('ar-EG')})</h3>
          <p className="mt-1 text-xs text-slate-500">
            {isLeaves
              ? 'استخدم الفئة والسرية والاسم والرقم العسكري لتصفية سجلات الإجازات.'
              : 'يُعرض أحدث 1,000 سجل. استخدم الرقم العسكري للتصفية.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              {isLeaves ? (
                <tr>
                  <th className="px-4 py-3">الرقم العسكري</th><th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">الفئة</th><th className="px-4 py-3">السرية</th>
                  <th className="px-4 py-3">نوع الإجازة</th><th className="px-4 py-3">من</th>
                  <th className="px-4 py-3">إلى</th><th className="px-4 py-3">المدة</th><th className="px-4 py-3">ملاحظات</th>
                  {isAdmin && <th className="px-4 py-3">إجراء</th>}
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">الرقم العسكري</th><th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">تاريخ النقل</th><th className="px-4 py-3">من موقع</th>
                  <th className="px-4 py-3">إلى موقع</th><th className="px-4 py-3">السبب / ملاحظات</th>
                  {isAdmin && <th className="px-4 py-3">إجراء</th>}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(record => isLeaves ? (
                <tr key={`${(record as PersonnelLeaveRecord).source}:${record.id}`} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{record.workerId}</td>
                  <td className="px-4 py-3">{record.fullName}</td>
                  <td className="px-4 py-3">{personTypeLabels[(record as PersonnelLeaveRecord).personType]}</td>
                  <td className="px-4 py-3">{(record as PersonnelLeaveRecord).company || '—'}</td>
                  <td className="px-4 py-3">{(record as PersonnelLeaveRecord).leaveType}</td>
                  <td className="px-4 py-3" dir="ltr">{(record as PersonnelLeaveRecord).startDate}</td>
                  <td className="px-4 py-3" dir="ltr">{(record as PersonnelLeaveRecord).endDate}</td>
                  <td className="px-4 py-3">{(record as PersonnelLeaveRecord).duration || '—'}</td>
                  <td className="px-4 py-3">{record.notes || '—'}</td>
                  {isAdmin && <td className="px-4 py-3"><button type="button" onClick={() => handleDelete(record)} aria-label="حذف سجل الإجازة" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>}
                </tr>
              ) : (
                <tr key={record.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{record.workerId}</td>
                  <td className="px-4 py-3">{record.fullName}</td>
                  <td className="px-4 py-3" dir="ltr">{(record as WorkerTransfer).effectiveDate}</td>
                  <td className="px-4 py-3">{(record as WorkerTransfer).fromLocation}</td>
                  <td className="px-4 py-3 font-semibold">{(record as WorkerTransfer).toLocation}</td>
                  <td className="px-4 py-3">{[(record as WorkerTransfer).reason, record.notes].filter(Boolean).join(' · ') || '—'}</td>
                  {isAdmin && <td className="px-4 py-3"><button type="button" onClick={() => handleDelete(record)} aria-label="حذف سجل النقل" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={isAdmin ? (isLeaves ? 10 : 7) : (isLeaves ? 9 : 6)} className="px-4 py-12 text-center text-slate-500">لا توجد سجلات لعرضها.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
