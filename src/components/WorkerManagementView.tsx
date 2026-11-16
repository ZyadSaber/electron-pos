import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Plus, Search, UserRound, X } from 'lucide-react';
import { PersonnelDetailModal, type PersonnelDetailRecord } from './PersonnelDetailModal';
import type {
  Worker,
  WorkerBasicCategory,
  WorkerBasicDefinition,
  WorkerDetails,
  WorkerImportResult,
  WorkerListFilters,
  WorkerPage,
} from '../types';

const pageSize = 50;

const blankWorker = (): WorkerDetails => ({
  militaryNumber: '',
  rank: '',
  fullName: '',
  company: '',
  subLocation: '',
  nationalId: '',
  tripleNumber: '',
  joinDate: '',
  dischargeDate: '',
  enlistmentDate: '',
  governorate: '',
  district: '',
  religion: '',
  trainingCenter: '',
  weapon: '',
});

const headerKey = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, '');

const formatExcelDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeExcelDate = (value: unknown) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return formatExcelDate(value.getFullYear(), value.getMonth() + 1, value.getDate()) ?? '';
  }

  const displayValue = String(value ?? '').trim();
  const yearFirst = /^(\d{4})[\/. -](\d{1,2})[\/. -](\d{1,2})$/.exec(displayValue);
  if (yearFirst) {
    return formatExcelDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3])) ?? displayValue;
  }
  const dayFirst = /^(\d{1,2})[\/. -](\d{1,2})[\/. -](\d{2,4})$/.exec(displayValue);
  if (!dayFirst) return displayValue;

  const first = Number(dayFirst[1]);
  const second = Number(dayFirst[2]);
  let year = Number(dayFirst[3]);
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  return formatExcelDate(year, month, day) ?? displayValue;
};

const fieldHeaders: Record<keyof WorkerDetails, string[]> = {
  militaryNumber: ['militarynumber', 'militaryno', 'workerid', 'id', 'الرقمالعسكري', 'رقمالعامل'],
  rank: ['rank', 'degree', 'الدرجة', 'الدرجه'],
  fullName: ['fullname', 'name', 'الاسم', 'الاسمالكامل'],
  company: ['company', 'department', 'السرية', 'السريه'],
  subLocation: ['sublocation', 'location', 'المكانالفرعي', 'المكانالفرعى'],
  nationalId: ['nationalid', 'رقمالهوية', 'الرقمالقومي'],
  tripleNumber: ['triplenumber', 'tripleid', 'الرقمالثلاثي', 'رقمثلاثي'],
  joinDate: ['joindate', 'entrydate', 'تاريخالضم', 'تاريخالالتحاق'],
  dischargeDate: ['dischargedate', 'تاريخالتسريح'],
  enlistmentDate: ['enlistmentdate', 'تاريخالتجنيد'],
  governorate: ['governorate', 'المحافظة', 'المحافظه'],
  district: ['district', 'المركز'],
  religion: ['religion', 'الديانة', 'الديانه'],
  trainingCenter: ['trainingcenter', 'مركزالتدريب'],
  weapon: ['weapon', 'السلاح'],
};

const fieldLabels: Record<keyof WorkerDetails, string> = {
  militaryNumber: 'الرقم العسكري',
  rank: 'الدرجة',
  fullName: 'الاسم',
  company: 'السرية',
  subLocation: 'المكان الفرعي',
  nationalId: 'الرقم القومي',
  tripleNumber: 'الرقم الثلاثي',
  joinDate: 'تاريخ الضم',
  dischargeDate: 'تاريخ التسريح',
  enlistmentDate: 'تاريخ التجنيد',
  governorate: 'المحافظة',
  district: 'المركز',
  religion: 'الديانة',
  trainingCenter: 'مركز التدريب',
  weapon: 'السلاح',
};

const workerFields = Object.keys(fieldHeaders) as Array<keyof WorkerDetails>;

const suggestFieldMapping = (headers: string[]): Partial<Record<keyof WorkerDetails, string>> => {
  const mapping: Partial<Record<keyof WorkerDetails, string>> = {};
  for (const field of workerFields) {
    const header = headers.find(value => fieldHeaders[field].includes(headerKey(value)));
    if (header) mapping[field] = header;
  }
  return mapping;
};

const parseWorkerRows = (
  rows: Array<Record<string, unknown>>,
  mapping: Partial<Record<keyof WorkerDetails, string>>,
) => rows.map(row => {
  const worker = blankWorker();
  for (const field of workerFields) {
    const value = mapping[field] ? row[mapping[field]!] : '';
    const isDateField = field === 'enlistmentDate' || field === 'joinDate' || field === 'dischargeDate';
    worker[field] = isDateField ? normalizeExcelDate(value) : String(value ?? '').trim();
  }
  return worker;
});

const templateHeaders = [
  'الرقم العسكري', 'الدرجة', 'الاسم', 'السرية', 'المكان الفرعي', 'الرقم القومي',
  'الرقم الثلاثي', 'تاريخ الضم', 'تاريخ التسريح', 'تاريخ التجنيد', 'المحافظة',
  'المركز', 'الديانة', 'مركز التدريب', 'السلاح',
];

const createSoldierDetailRecord = (worker: Worker): PersonnelDetailRecord => {
  const fields: Array<[string, string | undefined]> = [
    ['الرقم العسكري', worker.militaryNumber],
    ['الدرجة / الرتبة', worker.rank],
    ['الرقم القومي', worker.nationalId],
    ['الرقم الثلاثي', worker.tripleNumber],
    ['السرية', worker.company],
    ['المكان الفرعي', worker.subLocation],
    ['المحافظة', worker.governorate],
    ['المركز', worker.district],
    ['مركز التدريب', worker.trainingCenter],
    ['السلاح', worker.weapon],
    ['الهاتف', worker.phone],
    ['الحالة الشهرية', worker.monthlyStatus],
    ['ملاحظات', worker.notes],
    ['الديانة', worker.religion],
    ['تاريخ الضم', worker.joinDate],
    ['تاريخ التجنيد', worker.enlistmentDate],
    ['تاريخ التسريح', worker.dischargeDate],
    ['تاريخ إنشاء السجل', worker.createdAt],
    ['تاريخ آخر تحديث', worker.updatedAt],
  ];
  return {
    kind: 'soldier',
    militaryNumber: worker.militaryNumber,
    fullName: worker.fullName,
    fields: fields.map(([label, value]) => ({ label, value: String(value ?? '') })),
  };
};

interface WorkerManagementViewProps {
  token: string;
}

export const WorkerManagementView: React.FC<WorkerManagementViewProps> = ({ token }) => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [pageData, setPageData] = useState<WorkerPage>({ workers: [], total: 0, page: 1, pageSize });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<WorkerListFilters>({});
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editWorker, setEditWorker] = useState<Worker | null | 'new'>(null);
  const [selectedRecord, setSelectedRecord] = useState<PersonnelDetailRecord | null>(null);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingRows, setPendingRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Partial<Record<keyof WorkerDetails, string>>>({});
  const [pendingFilename, setPendingFilename] = useState('');
  const [basicDefinitions, setBasicDefinitions] = useState<WorkerBasicDefinition[]>([]);
  const [editingCompany, setEditingCompany] = useState('');
  const [editingSubLocation, setEditingSubLocation] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      window.workerAPI!.listWorkers(token, { search, ...filters, page, pageSize })
        .then(result => {
          if (active) setPageData(result);
        })
        .catch(reason => {
          if (active) setError(reason instanceof Error ? reason.message : String(reason));
        });
    }, search || Object.values(filters).some(Boolean) ? 200 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, search, filters, page, refreshKey]);

  useEffect(() => {
    let active = true;
    window.workerAPI!.listWorkerBasics(token)
      .then(result => {
        if (active) setBasicDefinitions(result);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [token]);

  const openWorkerEditor = (worker: Worker | null | 'new') => {
    setEditWorker(worker ?? 'new');
    const company = worker && worker !== 'new' ? worker.company : '';
    setEditingCompany(company);
    setEditingSubLocation(worker && worker !== 'new' ? worker.subLocation : '');
  };

  const saveWorker = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editWorker) return;
    setError('');
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const worker: WorkerDetails = {
      militaryNumber: String(formData.get('militaryNumber') || '').trim(),
      rank: String(formData.get('rank') || '').trim(),
      fullName: String(formData.get('fullName') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      subLocation: String(formData.get('subLocation') || '').trim(),
      nationalId: String(formData.get('nationalId') || '').trim(),
      tripleNumber: String(formData.get('tripleNumber') || '').trim(),
      joinDate: String(formData.get('joinDate') || ''),
      dischargeDate: String(formData.get('dischargeDate') || ''),
      enlistmentDate: String(formData.get('enlistmentDate') || ''),
      governorate: String(formData.get('governorate') || '').trim(),
      district: String(formData.get('district') || '').trim(),
      religion: String(formData.get('religion') || '').trim(),
      trainingCenter: String(formData.get('trainingCenter') || '').trim(),
      weapon: String(formData.get('weapon') || '').trim(),
    };
    try {
      await window.workerAPI!.saveWorker(
        token,
        worker,
        editWorker === 'new' ? undefined : editWorker.militaryNumber,
      );
      setEditWorker(null);
      setStatus({ success: true, message: 'تم حفظ بيانات المجند.' });
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    setStatus(null);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('ملف Excel لا يحتوي على ورقة عمل.');
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: '',
        raw: false,
      });
      if (sourceRows.length === 0) throw new Error('ورقة العمل لا تحتوي على بيانات.');

      const headers = Object.keys(sourceRows[0]);
      setSourceHeaders(headers);
      setFieldMapping(suggestFieldMapping(headers));
      setPendingRows(sourceRows);
      setPendingFilename(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingRows) return;
    if (!fieldMapping.militaryNumber || !fieldMapping.fullName) {
      setError('يرجى ربط عمودي الرقم العسكري والاسم قبل الاستيراد.');
      return;
    }
    setBusy(true);
    setError('');
    setStatus(null);
    try {
      const result: WorkerImportResult = await window.workerAPI!.importWorkers(
        token,
        parseWorkerRows(pendingRows, fieldMapping),
      );
      const details = result.errors.slice(0, 3)
        .map(row => `الصف ${row.row}: ${row.message}`)
        .join(' — ');
      setStatus({
        success: result.failed === 0,
        message: `اكتمل الاستيراد: ${result.inserted} جديد، ${result.updated} محدّث، ${result.failed} غير صالح.${details ? ` ${details}` : ''}`,
      });
      setRefreshKey(value => value + 1);
      setPendingRows(null);
      setSourceHeaders([]);
      setFieldMapping({});
      setPendingFilename('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.aoa_to_sheet([templateHeaders]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'المجندون');
      XLSX.writeFile(workbook, 'نموذج_بيانات_المجندين.xlsx');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const formWorker = editWorker && editWorker !== 'new' ? editWorker : null;
  const previewRows = pendingRows ? parseWorkerRows(pendingRows.slice(0, 5), fieldMapping) : [];
  const getBasicValues = (category: WorkerBasicCategory) => basicDefinitions
    .filter(definition => definition.category === category)
    .map(definition => definition.value);
  const filterSubLocations = [...new Set(
    basicDefinitions
      .filter(definition => definition.category === 'subLocation' && definition.company === filters.company)
      .map(definition => definition.value),
  )];
  const updateFilter = (key: keyof WorkerListFilters, value: string) => {
    setFilters(current => ({ ...current, [key]: value || undefined }));
    setPage(1);
  };
  const companyOptions = [...new Set([
    ...getBasicValues('company'),
    ...(formWorker?.company ? [formWorker.company] : []),
  ])];
  const subLocationOptions = [...new Set([
    ...basicDefinitions
      .filter(definition => definition.category === 'subLocation' && definition.company === editingCompany)
      .map(definition => definition.value),
    ...(formWorker?.company === editingCompany && formWorker.subLocation ? [formWorker.subLocation] : []),
  ])];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-black text-slate-900">إدارة المجندين</h2>
          <p className="mt-1 text-sm text-slate-500">إدارة بيانات المجندين. تُدار حسابات الدخول من قسم المستخدمين.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadTemplate()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            تنزيل نموذج Excel
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={importFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {busy ? 'جارٍ المعالجة...' : 'استيراد Excel'}
          </button>
          <button
            type="button"
            onClick={() => openWorkerEditor('new')}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            إضافة مجند
          </button>
        </div>
      </div>



      {status && (
        <p role={status.success ? 'status' : 'alert'} className={`rounded-xl border p-3 text-sm ${status.success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}>
          {status.message}
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserRound className="h-4 w-4 text-slate-400" />
              إجمالي السجلات المطابقة: {pageData.total.toLocaleString('ar-EG')}
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="بحث عام في بيانات المجند..."
                aria-label="بحث عام في بيانات المجند"
                className="w-full rounded-lg border border-slate-300 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-emerald-600"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-semibold text-slate-600">
              الرقم العسكري
              <input
                value={filters.militaryNumber ?? ''}
                onChange={event => updateFilter('militaryNumber', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              الاسم
              <input
                value={filters.fullName ?? ''}
                onChange={event => updateFilter('fullName', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              السرية
              <select
                value={filters.company ?? ''}
                onChange={event => {
                  setFilters(current => ({ ...current, company: event.target.value || undefined, subLocation: undefined }));
                  setPage(1);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600"
              >
                <option value="">كل السرايا</option>
                {getBasicValues('company').map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              المكان الفرعي
              <select
                value={filters.subLocation ?? ''}
                onChange={event => updateFilter('subLocation', event.target.value)}
                disabled={!filters.company}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600 disabled:bg-slate-100"
              >
                <option value="">كل الأماكن الفرعية</option>
                {filterSubLocations.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            {([
              ['joinDate', 'تاريخ الضم'],
              ['dischargeDate', 'تاريخ التسريح'],
              ['enlistmentDate', 'تاريخ التجنيد'],
            ] as const).map(([field, label]) => (
              <fieldset key={field} className="grid grid-cols-2 gap-2">
                <legend className="col-span-2 text-xs font-semibold text-slate-600">{label}</legend>
                <label className="text-[11px] text-slate-500">
                  من
                  <input
                    type="date"
                    value={filters[`${field}From`] ?? ''}
                    onChange={event => updateFilter(`${field}From`, event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-normal outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="text-[11px] text-slate-500">
                  إلى
                  <input
                    type="date"
                    value={filters[`${field}To`] ?? ''}
                    onChange={event => updateFilter(`${field}To`, event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-normal outline-none focus:border-emerald-600"
                  />
                </label>
              </fieldset>
            ))}
            <label className="block text-xs font-semibold text-slate-600">
              المحافظة
              <select
                value={filters.governorate ?? ''}
                onChange={event => updateFilter('governorate', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600"
              >
                <option value="">كل المحافظات</option>
                {getBasicValues('governorate').map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              الديانة
              <select
                value={filters.religion ?? ''}
                onChange={event => updateFilter('religion', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600"
              >
                <option value="">كل الديانات</option>
                <option value="مسلم">مسلم</option>
                <option value="مسيحي">مسيحي</option>
              </select>
            </label>
          </div>
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilters({});
                setPage(1);
              }}
              disabled={!search && !Object.values(filters).some(Boolean)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              مسح عوامل التصفية
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[2200px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">الرقم العسكري</th>
                <th className="px-4 py-3 font-semibold">الدرجة</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">السرية</th>
                <th className="px-4 py-3 font-semibold">المكان الفرعي</th>
                <th className="px-4 py-3 font-semibold">الرقم القومي</th>
                <th className="px-4 py-3 font-semibold">الرقم الثلاثي</th>
                <th className="px-4 py-3 font-semibold">تاريخ الضم</th>
                <th className="px-4 py-3 font-semibold">تاريخ التسريح</th>
                <th className="px-4 py-3 font-semibold">تاريخ التجنيد</th>
                <th className="px-4 py-3 font-semibold">المحافظة</th>
                <th className="px-4 py-3 font-semibold">المركز</th>
                <th className="px-4 py-3 font-semibold">الديانة</th>
                <th className="px-4 py-3 font-semibold">مركز التدريب</th>
                <th className="px-4 py-3 font-semibold">السلاح</th>
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.workers.map(worker => (
                <tr
                  key={worker.militaryNumber}
                  onDoubleClick={() => setSelectedRecord(createSoldierDetailRecord(worker))}
                  title="انقر مرتين لعرض التفاصيل"
                  className="cursor-pointer hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{worker.militaryNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.rank || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{worker.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.company || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.subLocation || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.nationalId || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.tripleNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.joinDate || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.dischargeDate || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.enlistmentDate || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.governorate || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.district || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.religion || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.trainingCenter || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{worker.weapon || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onDoubleClick={event => event.stopPropagation()}
                      onClick={() => openWorkerEditor(worker)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
              {pageData.workers.length === 0 && (
                <tr><td colSpan={16} className="px-4 py-12 text-center text-sm text-slate-500">لا توجد سجلات مطابقة.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-500">
            صفحة {page.toLocaleString('ar-EG')} من {Math.max(1, Math.ceil(pageData.total / pageSize)).toLocaleString('ar-EG')}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(value => value - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(pageData.total / pageSize)}
              onClick={() => setPage(value => value + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {editWorker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="font-bold text-slate-900">{editWorker === 'new' ? 'إضافة مجند' : 'تعديل بيانات المجند'}</h3>
              <button type="button" onClick={() => setEditWorker(null)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveWorker} className="grid gap-4 p-5 sm:grid-cols-2">
              {([
                ['militaryNumber', 'الرقم العسكري', 'text'],
                ['rank', 'الدرجة', 'text'],
                ['fullName', 'الاسم', 'text'],
                ['company', 'السرية', 'text'],
                ['subLocation', 'المكان الفرعي', 'text'],
                ['nationalId', 'الرقم القومي', 'text'],
                ['tripleNumber', 'الرقم الثلاثي', 'text'],
                ['joinDate', 'تاريخ الضم', 'date'],
                ['dischargeDate', 'تاريخ التسريح', 'date'],
                ['enlistmentDate', 'تاريخ التجنيد', 'date'],
                ['governorate', 'المحافظة', 'text'],
                ['district', 'المركز', 'text'],
                ['religion', 'الديانة', 'text'],
                ['trainingCenter', 'مركز التدريب', 'text'],
                ['weapon', 'السلاح', 'text'],
              ] as const).map(([name, label, type]) => (
                <label key={name} className="block text-xs font-semibold text-slate-600">
                  {label}
                  {name === 'company' ? (
                    <select
                      name={name}
                      value={editingCompany}
                      onChange={event => {
                        setEditingCompany(event.target.value);
                        setEditingSubLocation('');
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    >
                      <option value="">— اختر السرية —</option>
                      {companyOptions.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  ) : name === 'subLocation' ? (
                    <select
                      name={name}
                      value={editingSubLocation}
                      onChange={event => setEditingSubLocation(event.target.value)}
                      disabled={!editingCompany}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 disabled:bg-slate-100"
                    >
                      <option value="">— اختر المكان الفرعي —</option>
                      {subLocationOptions.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  ) : name === 'religion' ? (
                    <select
                      name={name}
                      defaultValue={formWorker?.religion === 'مسلم' || formWorker?.religion === 'مسيحي'
                        ? formWorker.religion
                        : ''}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    >
                      <option value="">— اختر الديانة —</option>
                      <option value="مسلم">مسلم</option>
                      <option value="مسيحي">مسيحي</option>
                    </select>
                  ) : name === 'rank' || name === 'governorate' || name === 'trainingCenter' || name === 'weapon' ? (
                    <select
                      name={name}
                      defaultValue={formWorker?.[name] || ''}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    >
                      <option value="">— اختر —</option>
                      {getBasicValues(name === 'rank' ? 'rank' : name).map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={name}
                      type={type}
                      required={name === 'militaryNumber' || name === 'fullName'}
                      defaultValue={formWorker?.[name] || ''}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    />
                  )}
                </label>
              ))}
              {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setEditWorker(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">إلغاء</button>
                <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? 'جارٍ الحفظ...' : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecord && (
        <PersonnelDetailModal
          token={token}
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {pendingRows && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="mx-auto my-6 w-full max-w-7xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" dir="rtl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">معاينة وربط أعمدة ملف المجندين</h3>
                <p className="mt-1 text-sm text-slate-600">
                  الملف: <span className="font-semibold">{pendingFilename}</span>
                  {' — '}
                  عدد الصفوف: <span className="font-semibold">{pendingRows.length.toLocaleString('ar-EG')}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingRows(null);
                  setSourceHeaders([]);
                  setFieldMapping({});
                  setPendingFilename('');
                  setError('');
                }}
                aria-label="إغلاق"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workerFields.map(field => (
                <label key={field} className="block text-xs font-semibold text-slate-600">
                  {fieldLabels[field]}
                  {(field === 'militaryNumber' || field === 'fullName') && <span className="text-rose-600"> *</span>}
                  <select
                    value={fieldMapping[field] ?? ''}
                    onChange={event => setFieldMapping(current => ({
                      ...current,
                      [field]: event.target.value || undefined,
                    }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                  >
                    <option value="">— تجاهل هذا الحقل —</option>
                    {sourceHeaders.map((header, index) => (
                      <option key={`${header}-${index}`} value={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-800">معاينة البيانات بعد الربط (أول 5 صفوف)</h4>
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-max text-right text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>{workerFields.map(field => (
                      <th key={field} className="whitespace-nowrap px-3 py-2 font-semibold">{fieldLabels[field]}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((worker, index) => (
                      <tr key={index}>
                        {workerFields.map(field => (
                          <td key={field} className="max-w-48 truncate px-3 py-2 text-slate-700" title={worker[field]}>
                            {worker[field] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              ستُضاف بيانات المجندين الجديدة أو تُحدّث البيانات الموجودة. لا تُنشأ حسابات دخول عند الاستيراد؛
              يمكن منح حساب مسؤول بشكل منفصل للمجندين المحددين.
            </p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingRows(null);
                  setSourceHeaders([]);
                  setFieldMapping({});
                  setPendingFilename('');
                  setError('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy || !fieldMapping.militaryNumber || !fieldMapping.fullName}
                onClick={() => void confirmImport()}
                className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? 'جارٍ استيراد البيانات...' : 'تأكيد الاستيراد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
