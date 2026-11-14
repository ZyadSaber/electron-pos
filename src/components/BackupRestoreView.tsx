import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, DatabaseBackup, Download, ShieldAlert, Upload } from 'lucide-react';

interface BackupRestoreViewProps {
  token: string;
  onRestored: (summary: {
    soldiers: number;
    users: number;
    leaves: number;
    transfers: number;
    officers: number;
    nonCommissionedOfficers: number;
    historyRecords: number;
  }) => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ token, onRestored }) => {
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.workerAPI!.exportDatabase(token);
      setMessage(result.success
        ? { success: true, text: 'تم تصدير النسخة الاحتياطية بنجاح.' }
        : { success: true, text: 'تم إلغاء التصدير.' });
    } catch (error) {
      setMessage({
        success: false,
        text: `تعذر تصدير قاعدة البيانات: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await window.workerAPI!.importDatabase(token);
      setConfirmImport(false);
      if (result.success && result.summary) onRestored(result.summary);
      else setMessage({ success: true, text: 'تم إلغاء الاستيراد.' });
    } catch (error) {
      setMessage({
        success: false,
        text: `تعذر استيراد قاعدة البيانات: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 p-6" dir="rtl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <DatabaseBackup className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">نسخ قاعدة البيانات</h2>
            <p className="mt-1 text-sm text-slate-500">حفظ سجلات المجندين والضباط وضباط الصف والتعريفات الأساسية والإجازات والتنقلات واستعادتها.</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>تتضمن النسخة الاحتياطية بيانات اعتماد مشفّرة وسجلات شخصية حساسة، منها التاريخ الطبي والعقوبات. احفظ الملف في مكان آمن ولا تشاركه.</p>
      </div>

      {message && (
        <div
          role={message.success ? 'status' : 'alert'}
          className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${
            message.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {message.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <Download className="mb-3 h-6 w-6 text-emerald-700" />
            <h3 className="font-bold text-slate-900">تصدير نسخة احتياطية</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              تصدير نسخة JSON كاملة تشمل البيانات الشخصية وسجلات التاريخ الطبي والعقوبات والغياب وغيرها.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            تصدير قاعدة البيانات
          </button>
        </article>

        <article className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <Upload className="mb-3 h-6 w-6 text-sky-700" />
            <h3 className="font-bold text-slate-900">استيراد نسخة احتياطية</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              استعادة كامل البيانات من نسخة JSON. سيُطلب تسجيل الدخول مجدداً بعد الاستعادة.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmImport(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            اختيار نسخة للاستعادة
          </button>
        </article>
      </div>

      {confirmImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900">تأكيد استعادة قاعدة البيانات</h3>
            <p className="text-sm leading-6 text-slate-600">
              ستُستبدل جميع البيانات الحالية بمحتوى النسخة الاحتياطية. هل تريد المتابعة؟
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmImport(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleImport}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {busy ? 'جارٍ الاستعادة...' : 'استعادة البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
