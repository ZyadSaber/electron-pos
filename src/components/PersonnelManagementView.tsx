import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type {
  NonCommissionedOfficer,
  NonCommissionedOfficerDraft,
  Officer,
  OfficerDraft,
  PersonnelImportResult,
  WorkerBasicDefinition,
} from '../types';

type PersonnelKind = 'officers' | 'ncos';

interface PersonnelRow {
  militaryNumber: string;
  seniorityNumber: string;
  grade: string;
  fullName: string;
  maritalStatus: string;
  maleChildren: number;
  femaleChildren: number;
  nationalId: string;
  company: string;
  subLocation: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonnelManagementViewProps {
  token: string;
  kind: PersonnelKind;
}

interface PersonnelForm {
  militaryNumber: string;
  seniorityNumber: string;
  grade: string;
  fullName: string;
  maritalStatus: string;
  maleChildren: string;
  femaleChildren: string;
  nationalId: string;
  company: string;
  subLocation: string;
}

type ImportMapping = Partial<Record<keyof PersonnelForm, string>>;

const importFieldKeys = [
  'militaryNumber',
  'seniorityNumber',
  'grade',
  'fullName',
  'maritalStatus',
  'maleChildren',
  'femaleChildren',
  'nationalId',
  'company',
  'subLocation',
] as const satisfies readonly (keyof PersonnelForm)[];

const importFieldHeaders: Record<keyof PersonnelForm, string[]> = {
  militaryNumber: ['militarynumber', 'militaryno', 'رقمالعسكري'],
  seniorityNumber: ['senioritynumber', 'seniorityno', 'رقمالأقدمية', 'رقمالاقدمية'],
  grade: ['rank', 'degree', 'الرتبة', 'الدرجه', 'الدرجة', 'درجة', 'الدرجة/الرتبة', 'الدرجة\\الرتبة'],
  fullName: ['fullname', 'name', 'الاسم', 'الاسمالكامل'],
  maritalStatus: ['maritalstatus', 'الحالةالاجتماعية'],
  maleChildren: ['malechildren', 'numberofmales', 'عددالذكور'],
  femaleChildren: ['femalechildren', 'numberoffemales', 'عددالإناث', 'عددالاناث'],
  nationalId: ['nationalid', 'رقمالقومي', 'رقمالهوية'],
  company: ['company', 'department', 'السرية', 'السريه'],
  subLocation: ['sublocation', 'location', 'المكانالفرعي', 'المكانالفرعى'],
};

const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, '');

const parseChildCount = (value: string) => {
  const westernDigits = value
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[،,]/g, '');
  return Number(westernDigits || 0);
};

const suggestImportMapping = (headers: string[]): ImportMapping => {
  const mapping: ImportMapping = {};
  for (const field of importFieldKeys) {
    const header = headers.find(value => importFieldHeaders[field].includes(normalizeHeader(value)));
    if (header) mapping[field] = header;
  }
  return mapping;
};

const mapImportRows = (
  rows: Array<Record<string, unknown>>,
  mapping: ImportMapping,
): PersonnelForm[] => rows.map(row => {
  const values: PersonnelForm = { ...emptyForm(), maleChildren: '', femaleChildren: '' };
  for (const field of importFieldKeys) {
    values[field] = mapping[field] ? String(row[mapping[field]!] ?? '').trim() : '';
  }
  return values;
});

const emptyForm = (): PersonnelForm => ({
  militaryNumber: '',
  seniorityNumber: '',
  grade: '',
  fullName: '',
  maritalStatus: '',
  maleChildren: '0',
  femaleChildren: '0',
  nationalId: '',
  company: '',
  subLocation: '',
});

export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({ token, kind }) => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const isOfficer = kind === 'officers';
  const title = isOfficer ? 'الضباط' : 'ضباط الصف';
  const gradeLabel = isOfficer ? 'الدرجة / الرتبة' : 'الدرجة';
  const [records, setRecords] = useState<PersonnelRow[]>([]);
  const [definitions, setDefinitions] = useState<WorkerBasicDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [originalMilitaryNumber, setOriginalMilitaryNumber] = useState('');
  const [form, setForm] = useState<PersonnelForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingRows, setPendingRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<ImportMapping>({});
  const [pendingFilename, setPendingFilename] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows: PersonnelRow[] = isOfficer
          ? (await window.workerAPI!.listOfficers(token)).map((row: Officer) => ({ ...row, grade: row.rank }))
          : (await window.workerAPI!.listNonCommissionedOfficers(token))
            .map((row: NonCommissionedOfficer) => ({ ...row, grade: row.degree }));
        if (active) setRecords(rows);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [token, isOfficer, refreshKey]);

  useEffect(() => {
    let active = true;
    window.workerAPI!.listWorkerBasics(token)
      .then(result => {
        if (active) setDefinitions(result);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [token]);

  const companies = useMemo(() => [...new Set([
    ...definitions.filter(item => item.category === 'company').map(item => item.value),
    ...records.map(item => item.company).filter(Boolean),
  ])], [definitions, records]);
  const subLocations = useMemo(() => [...new Set([
    ...definitions
      .filter(item => item.category === 'subLocation' && item.company === form.company)
      .map(item => item.value),
    ...records
      .filter(item => item.company === form.company)
      .map(item => item.subLocation)
      .filter(Boolean),
    ...(form.subLocation ? [form.subLocation] : []),
  ])], [definitions, records, form.company, form.subLocation]);
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return records;
    return records.filter(record => [
      record.militaryNumber,
      record.seniorityNumber,
      record.grade,
      record.fullName,
      record.maritalStatus,
      record.nationalId,
      record.company,
      record.subLocation,
    ].some(value => value.toLocaleLowerCase().includes(query)));
  }, [records, search]);

  const openNew = () => {
    setOriginalMilitaryNumber('');
    setForm(emptyForm());
    setError('');
    setNotice('');
    setEditing(true);
  };

  const openEdit = (record: PersonnelRow) => {
    setOriginalMilitaryNumber(record.militaryNumber);
    setForm({
      militaryNumber: record.militaryNumber,
      seniorityNumber: record.seniorityNumber,
      grade: record.grade,
      fullName: record.fullName,
      maritalStatus: record.maritalStatus,
      maleChildren: String(record.maleChildren),
      femaleChildren: String(record.femaleChildren),
      nationalId: record.nationalId,
      company: record.company,
      subLocation: record.subLocation,
    });
    setError('');
    setNotice('');
    setEditing(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const common = {
      militaryNumber: form.militaryNumber.trim(),
      seniorityNumber: form.seniorityNumber.trim(),
      fullName: form.fullName.trim(),
      maritalStatus: form.maritalStatus.trim(),
      maleChildren: Number(form.maleChildren || 0),
      femaleChildren: Number(form.femaleChildren || 0),
      nationalId: form.nationalId.trim(),
      company: form.company,
      subLocation: form.subLocation,
    };
    try {
      if (isOfficer) {
        await window.workerAPI!.saveOfficer(
          token,
          { ...common, rank: form.grade.trim() },
          originalMilitaryNumber || undefined,
        );
      } else {
        await window.workerAPI!.saveNonCommissionedOfficer(
          token,
          { ...common, degree: form.grade.trim() },
          originalMilitaryNumber || undefined,
        );
      }
      setEditing(false);
      setNotice('تم حفظ البيانات بنجاح.');
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const deleteRecord = async (record: PersonnelRow) => {
    if (!window.confirm(`هل تريد حذف سجل ${record.fullName}؟`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (isOfficer) await window.workerAPI!.deleteOfficer(token, record.militaryNumber);
      else await window.workerAPI!.deleteNonCommissionedOfficer(token, record.militaryNumber);
      setNotice('تم حذف السجل.');
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
    setNotice('');
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('ملف Excel لا يحتوي على ورقة عمل.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: '',
        raw: false,
      });
      if (rows.length === 0) throw new Error('ورقة العمل لا تحتوي على بيانات.');
      const headers = Object.keys(rows[0]);
      setSourceHeaders(headers);
      setFieldMapping(suggestImportMapping(headers));
      setPendingRows(rows);
      setPendingFilename(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const closeImportPreview = () => {
    setPendingRows(null);
    setSourceHeaders([]);
    setFieldMapping({});
    setPendingFilename('');
    setError('');
  };

  const confirmImport = async () => {
    if (!pendingRows) return;
    if (!fieldMapping.militaryNumber || !fieldMapping.fullName) {
      setError('يرجى ربط عمودي الرقم العسكري والاسم قبل الاستيراد.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const mapped = mapImportRows(pendingRows, fieldMapping);
      let result: PersonnelImportResult;
      if (isOfficer) {
        const importRecords: OfficerDraft[] = mapped.map(row => ({
          militaryNumber: row.militaryNumber,
          seniorityNumber: row.seniorityNumber,
          rank: row.grade,
          fullName: row.fullName,
          maritalStatus: row.maritalStatus,
          maleChildren: parseChildCount(row.maleChildren),
          femaleChildren: parseChildCount(row.femaleChildren),
          nationalId: row.nationalId,
          company: row.company,
          subLocation: row.subLocation,
        }));
        result = await window.workerAPI!.importOfficers(token, importRecords);
      } else {
        const importRecords: NonCommissionedOfficerDraft[] = mapped.map(row => ({
          militaryNumber: row.militaryNumber,
          seniorityNumber: row.seniorityNumber,
          degree: row.grade,
          fullName: row.fullName,
          maritalStatus: row.maritalStatus,
          maleChildren: parseChildCount(row.maleChildren),
          femaleChildren: parseChildCount(row.femaleChildren),
          nationalId: row.nationalId,
          company: row.company,
          subLocation: row.subLocation,
        }));
        result = await window.workerAPI!.importNonCommissionedOfficers(token, importRecords);
      }
      const details = result.errors.slice(0, 3)
        .map(row => `الصف ${row.row}: ${row.message}`)
        .join(' — ');
      setNotice(
        `اكتمل الاستيراد: ${result.inserted} جديد، ${result.updated} محدّث، ${result.failed} غير صالح.${details ? ` ${details}` : ''}`,
      );
      setRefreshKey(value => value + 1);
      closeImportPreview();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const fields: Array<{ key: keyof PersonnelForm; label: string; type?: string; required?: boolean }> = [
    { key: 'militaryNumber', label: 'الرقم العسكري', required: true },
    { key: 'seniorityNumber', label: 'رقم الأقدمية' },
    { key: 'grade', label: gradeLabel },
    { key: 'fullName', label: 'الاسم', required: true },
    { key: 'maritalStatus', label: 'الحالة الاجتماعية' },
    { key: 'maleChildren', label: 'عدد الذكور', type: 'number' },
    { key: 'femaleChildren', label: 'عدد الإناث', type: 'number' },
    { key: 'nationalId', label: 'الرقم القومي' },
  ];
  const tableFields: Array<{ key: keyof PersonnelRow; label: string }> = [
    { key: 'militaryNumber', label: 'الرقم العسكري' },
    { key: 'seniorityNumber', label: 'رقم الأقدمية' },
    { key: 'grade', label: gradeLabel },
    { key: 'fullName', label: 'الاسم' },
    { key: 'maritalStatus', label: 'الحالة الاجتماعية' },
    { key: 'maleChildren', label: 'عدد الذكور' },
    { key: 'femaleChildren', label: 'عدد الإناث' },
    { key: 'nationalId', label: 'الرقم القومي' },
    { key: 'company', label: 'السرية' },
    { key: 'subLocation', label: 'المكان الفرعي' },
  ];
  const importFields: Array<{ key: keyof PersonnelForm; label: string }> = [
    { key: 'militaryNumber', label: 'الرقم العسكري' },
    { key: 'seniorityNumber', label: 'رقم الأقدمية' },
    { key: 'grade', label: gradeLabel },
    { key: 'fullName', label: 'الاسم' },
    { key: 'maritalStatus', label: 'الحالة الاجتماعية' },
    { key: 'maleChildren', label: 'عدد الذكور' },
    { key: 'femaleChildren', label: 'عدد الإناث' },
    { key: 'nationalId', label: 'الرقم القومي' },
    { key: 'company', label: 'السرية' },
    { key: 'subLocation', label: 'المكان الفرعي' },
  ];
  const previewRows = pendingRows ? mapImportRows(pendingRows.slice(0, 5), fieldMapping) : [];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">سجلات مستقلة عن بيانات المجندين.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            استيراد Excel
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            إضافة {isOfficer ? 'ضابط' : 'ضابط صف'}
          </button>
        </div>
      </div>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && !editing && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-slate-700">
            إجمالي السجلات: {records.length.toLocaleString('ar-EG')}
          </span>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو الرقم العسكري..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-emerald-600"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {tableFields.map(field => <th key={field.key} className="whitespace-nowrap px-4 py-3 font-semibold">{field.label}</th>)}
                <th className="px-4 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRecords.map(record => (
                <tr key={record.militaryNumber} className="hover:bg-slate-50/70">
                  {tableFields.map(field => (
                    <td key={field.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {record[field.key] === '' ? '—' : record[field.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" disabled={busy} onClick={() => openEdit(record)} aria-label="تعديل" className="rounded-md p-2 text-slate-500 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={busy} onClick={() => void deleteRecord(record)} aria-label="حذف" className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRecords.length === 0 && (
                <tr><td colSpan={tableFields.length + 1} className="px-4 py-12 text-center text-sm text-slate-500">لا توجد سجلات مطابقة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="mx-auto my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="font-bold text-slate-900">{originalMilitaryNumber ? `تعديل بيانات ${title}` : `إضافة ${isOfficer ? 'ضابط' : 'ضابط صف'}`}</h3>
              <button type="button" onClick={() => setEditing(false)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={event => void save(event)}
              className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {fields.map(field => (
                <label key={field.key} className="block text-xs font-semibold text-slate-600">
                  {field.label}{field.required && <span className="text-rose-600"> *</span>}
                  <input
                    type={field.type ?? 'text'}
                    min={field.type === 'number' ? 0 : undefined}
                    max={field.type === 'number' ? 10000 : undefined}
                    step={field.type === 'number' ? 1 : undefined}
                    required={field.required}
                    value={form[field.key]}
                    onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                  />
                </label>
              ))}
              <label className="block text-xs font-semibold text-slate-600">
                السرية
                <select
                  value={form.company}
                  onChange={event => setForm(current => ({ ...current, company: event.target.value, subLocation: '' }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                >
                  <option value="">— اختر السرية —</option>
                  {companies.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                المكان الفرعي
                <select
                  value={form.subLocation}
                  onChange={event => setForm(current => ({ ...current, subLocation: event.target.value }))}
                  disabled={!form.company}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600 disabled:bg-slate-100"
                >
                  <option value="">— اختر المكان الفرعي —</option>
                  {subLocations.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-3">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
                <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">إلغاء</button>
                <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {busy ? 'جارٍ الحفظ...' : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingRows && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4">
          <div className="mx-auto my-6 w-full max-w-7xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6" dir="rtl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">معاينة وربط أعمدة ملف {title}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  الملف: <span className="font-semibold">{pendingFilename}</span>
                  {' — '}
                  عدد الصفوف: <span className="font-semibold">{pendingRows.length.toLocaleString('ar-EG')}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={closeImportPreview}
                aria-label="إغلاق"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {importFields.map(field => (
                <label key={field.key} className="block text-xs font-semibold text-slate-600">
                  {field.label}
                  {(field.key === 'militaryNumber' || field.key === 'fullName') && <span className="text-rose-600"> *</span>}
                  <select
                    value={fieldMapping[field.key] ?? ''}
                    onChange={event => setFieldMapping(current => ({
                      ...current,
                      [field.key]: event.target.value || undefined,
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
                    <tr>{importFields.map(field => (
                      <th key={field.key} className="whitespace-nowrap px-3 py-2 font-semibold">{field.label}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, index) => (
                      <tr key={index}>
                        {importFields.map(field => (
                          <td key={field.key} className="max-w-48 truncate px-3 py-2 text-slate-700" title={row[field.key]}>
                            {row[field.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              سيتم تحديث السجلات المطابقة للرقم العسكري أو إضافة سجلات جديدة. الصفوف التي تحتوي على بيانات غير صالحة ستُعرض في نتيجة الاستيراد.
            </p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={closeImportPreview}
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
