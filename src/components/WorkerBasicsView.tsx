import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { WorkerBasicCategory, WorkerBasicDefinition } from '../types';

interface WorkerBasicsViewProps {
  token: string;
}

const simpleCategories: Array<{ category: Exclude<WorkerBasicCategory, 'subLocation'>; label: string }> = [
  { category: 'company', label: 'السرية' },
  { category: 'governorate', label: 'المحافظة' },
  { category: 'trainingCenter', label: 'مركز التدريب' },
  { category: 'rank', label: 'الدرجة / الرتبة' },
  { category: 'weapon', label: 'السلاح' },
  { category: 'leaveType', label: 'نوع الإجازة' },
];

export const WorkerBasicsView: React.FC<WorkerBasicsViewProps> = ({ token }) => {
  const [definitions, setDefinitions] = useState<WorkerBasicDefinition[]>([]);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [newSubLocation, setNewSubLocation] = useState('');
  const [subLocationCompany, setSubLocationCompany] = useState('');
  const [editingDefinition, setEditingDefinition] = useState<WorkerBasicDefinition | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [editedCompany, setEditedCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const companies = useMemo(
    () => definitions.filter(item => item.category === 'company'),
    [definitions],
  );
  const subLocations = useMemo(
    () => definitions.filter(item => item.category === 'subLocation'),
    [definitions],
  );

  const loadDefinitions = async () => {
    const result = await window.workerAPI!.listWorkerBasics(token);
    setDefinitions(result);
  };

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

  const addDefinition = async (category: WorkerBasicCategory, value: string, company?: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await window.workerAPI!.saveWorkerBasic(token, category, normalizedValue, company);
      await loadDefinitions();
      if (category === 'subLocation') {
        setNewSubLocation('');
      } else {
        setNewValues(current => ({ ...current, [category]: '' }));
      }
      setNotice('تمت إضافة التعريف.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const removeDefinition = async (definition: WorkerBasicDefinition) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await window.workerAPI!.deleteWorkerBasic(
        token,
        definition.category,
        definition.value,
        definition.company,
      );
      await loadDefinitions();
      setNotice('تم حذف التعريف.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (definition: WorkerBasicDefinition) => {
    setEditingDefinition(definition);
    setEditedValue(definition.value);
    setEditedCompany(definition.company ?? '');
    setError('');
  };

  const saveEditedDefinition = async () => {
    if (!editingDefinition || !editedValue.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await window.workerAPI!.updateWorkerBasic(
        token,
        editingDefinition.category,
        editingDefinition.value,
        editedValue.trim(),
        editingDefinition.company,
        editingDefinition.category === 'subLocation' ? editedCompany : undefined,
      );
      await loadDefinitions();
      if (editingDefinition.category === 'company' && subLocationCompany === editingDefinition.value) {
        setSubLocationCompany(editedValue.trim());
      }
      setEditingDefinition(null);
      setNotice('تم تعديل التعريف وتحديث بيانات المجندين المرتبطة به.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const renderList = (items: WorkerBasicDefinition[], label: string) => (
    <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
      {items.length === 0 && <li className="py-2 text-xs text-slate-400">لا توجد تعريفات بعد.</li>}
      {items.map(item => (
        <li key={`${item.category}:${item.company ?? ''}:${item.value}`} className="rounded-lg bg-slate-50 px-3 py-2">
          {editingDefinition?.category === item.category
            && editingDefinition.value === item.value
            && editingDefinition.company === item.company ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={editedValue}
                onChange={event => setEditedValue(event.target.value)}
                maxLength={200}
                aria-label={`تعديل ${label}`}
                className="min-w-32 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-600"
              />
              {item.category === 'subLocation' && (
                <select
                  value={editedCompany}
                  onChange={event => setEditedCompany(event.target.value)}
                  aria-label="ربط المكان الفرعي بسرية (اختياري)"
                  className="min-w-32 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>اختر السرية</option>
                  {companies.map(company => (
                    <option key={company.value} value={company.value}>{company.value}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={busy || !editedValue.trim() || (item.category === 'subLocation' && !editedCompany)}
                onClick={() => void saveEditedDefinition()}
                aria-label="حفظ التعديل"
                className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditingDefinition(null)}
                aria-label="إلغاء التعديل"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-slate-700" title={item.value}>{item.value}</span>
              <div className="flex shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEditing(item)}
                  aria-label={`تعديل ${label} ${item.value}`}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeDefinition(item)}
                  aria-label={`حذف ${label} ${item.value}`}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">تعريف الاساسيات</h2>
        <p className="mt-1 text-sm text-slate-500">إدارة القوائم المستخدمة في بيانات المجندين.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simpleCategories.map(({ category, label }) => {
          const items = definitions.filter(item => item.category === category);
          return (
            <article key={category} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-800">{label}</h3>
              <form
                className="mt-3 flex gap-2"
                onSubmit={event => {
                  event.preventDefault();
                  void addDefinition(category, newValues[category] ?? '');
                }}
              >
                <input
                  value={newValues[category] ?? ''}
                  onChange={event => setNewValues(current => ({ ...current, [category]: event.target.value }))}
                  maxLength={200}
                  placeholder={`إضافة ${label}`}
                  aria-label={`إضافة ${label}`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={busy || !newValues[category]?.trim()}
                  className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  إضافة
                </button>
              </form>
              {renderList(items, label)}
            </article>
          );
        })}

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-slate-800">المكان الفرعي</h3>
          <form
            className="mt-3 space-y-2"
            onSubmit={event => {
              event.preventDefault();
              void addDefinition('subLocation', newSubLocation, subLocationCompany);
            }}
          >
            <select
              value={subLocationCompany}
              onChange={event => setSubLocationCompany(event.target.value)}
              aria-label="السرية المرتبطة بالمكان الفرعي"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
            >
              <option value="" disabled>اختر السرية</option>
              {companies.map(company => <option key={company.value} value={company.value}>{company.value}</option>)}
            </select>
            <div className="flex gap-2">
              <input
                value={newSubLocation}
                onChange={event => setNewSubLocation(event.target.value)}
                maxLength={200}
                placeholder="اسم المكان الفرعي"
                aria-label="اسم المكان الفرعي"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={busy || !newSubLocation.trim()}
                className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                إضافة
              </button>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-400">يجب ربط كل مكان فرعي بسرية.</p>
          {companies.filter(company => subLocations.some(item => item.company === company.value)).map(company => {
              const items = subLocations.filter(item => item.company === company.value);
              return (
                <div key={company.value} className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500">{company.value}</h4>
                  {renderList(items, 'المكان الفرعي')}
                </div>
              );
            })}
          <div className="mt-4">
            <h4 className="text-xs font-bold text-slate-500">غير مرتبط بسرية</h4>
            {renderList(subLocations.filter(item => !item.company), 'المكان الفرعي')}
          </div>
        </article>
      </div>
    </section>
  );
};
