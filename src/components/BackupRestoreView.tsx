import React, { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload, RotateCcw, ShieldCheck, HardDrive, CheckCircle2, AlertTriangle, Trash2, Sparkles } from 'lucide-react';

interface BackupRestoreViewProps {
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => boolean;
  onResetToSampleData: (masterKey: string) => Promise<{ configured: boolean; authorized: boolean }>;
  onClearAllData: (masterKey: string) => Promise<{ configured: boolean; authorized: boolean }>;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  onExportBackup,
  onImportBackup,
  onResetToSampleData,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<'clear' | 'sample' | 'import' | null>(null);
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState('');
  const [masterKeyError, setMasterKeyError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string' || !content) {
        setStatusMsg({ type: 'error', text: 'الملف المحدد فارغ أو تعذرت قراءته.' });
        return;
      }
      setPendingImportContent(content);
      setConfirmModal('import');
    };
    reader.onerror = () => {
      setStatusMsg({ type: 'error', text: 'تعذرت قراءة الملف المحدد.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const closeConfirmation = () => {
    setConfirmModal(null);
    setPendingImportContent(null);
    setMasterKey('');
    setMasterKeyError(null);
  };

  const processConfirmation = async () => {
    if (confirmModal === 'import') {
      if (pendingImportContent === null) return;
      const success = onImportBackup(pendingImportContent);
      setStatusMsg(success
        ? { type: 'success', text: 'تمت استعادة قاعدة البيانات بنجاح من ملف النسخة الاحتياطية!' }
        : { type: 'error', text: 'تنسيق ملف النسخة الاحتياطية غير صالح. تعذرت الاستعادة.' });
      closeConfirmation();
      return;
    }

    if (confirmModal !== 'clear' && confirmModal !== 'sample') return;

    if (!masterKey) {
      setMasterKeyError('يرجى إدخال المفتاح الرئيسي.');
      return;
    }

    setIsProcessing(true);
    setMasterKeyError(null);
    try {
      const result = confirmModal === 'clear'
        ? await onClearAllData(masterKey)
        : await onResetToSampleData(masterKey);
      if (!result.configured) {
        setMasterKeyError('لم يتم إعداد مفتاح صالح. تحقق من ملف .env وتشغيل خادم Vite أو تطبيق Electron.');
        return;
      }
      if (!result.authorized) {
        setMasterKeyError('المفتاح الرئيسي غير صحيح.');
        return;
      }

      setStatusMsg(confirmModal === 'clear'
        ? { type: 'success', text: 'تم تفريغ النظام بنجاح! يمكنك الآن بدء إدخال بضاعة محلك الحقيقية.' }
        : { type: 'success', text: 'تمت استعادة الأصناف والبيانات التجريبية بنجاح!' });
      closeConfirmation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMasterKeyError(`تعذر إكمال العملية: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          إدارة النسخ الاحتياطي واستعادة قاعدة البيانات المحلية
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          نظراً لأن البرنامج يعمل محلياً بنسبة 100% دون الحاجة إلى إنترنت أو خوادم سحابية، ننصح بإنشاء نسخ احتياطية دورية لحفظ بضاعتك ومبيعاتك.
        </p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${statusMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200'
          }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Export Backup Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 text-right">
          <div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              تصدير ملف النسخة الاحتياطية
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تحميل وتنزيل نسخة كاملة من قاعدة بيانات السوبر ماركت (<code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">grocery_pos_backup.json</code>) تحتوي على كافة المنتجات، حركات المخزن، فواتير المبيعات، والعملاء.
            </p>
          </div>

          <button
            onClick={onExportBackup}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير وحفظ النسخة الاحتياطية الآن</span>
          </button>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-4 text-right">
          <div>
            <div className="p-3 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl w-fit mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              استعادة قاعدة البيانات من ملف سابق
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              حدد ملف نسخة احتياطية سبق حفظه لاستعادة كامل بيانات المحل وسجل المبيعات والإعدادات على هذا الجهاز أو نقله لجهاز آخر.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.db,.sqlite"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>اختيار ملف واستعادة البيانات</span>
          </button>
        </div>

      </div>

      {/* Fresh Start / Clean Slate Option for Real Store Owners */}
      <div className="p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs text-right">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>بدء متجر فارغ جديد (مسح البيانات التجريبية)</span>
              <span className="text-[10px] uppercase bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-extrabold px-2 py-0.5 rounded-full">
                تجهيز المحل
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              مسح وحذف كافة المنتجات الافتراضية التجريبية وفواتير الاختبار والعملاء للبدء بإدخال بضاعة محلك الفعلية من الصفر.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMasterKey('');
            setMasterKeyError(null);
            setConfirmModal('clear');
          }}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shrink-0 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>مسح البيانات والبدء بنظام فارغ</span>
        </button>
      </div>

      {/* Demo Sample Data Reset Option */}
      <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-right">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              إعادة تحميل الأصناف والبيانات التجريبية
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تحميل بيانات عرض مترابطة ومتعددة للسوبر ماركت المصري تشمل المنتجات والمبيعات والموردين والمشتريات والمصروفات والمخزون والمرتجعات والورديات والحضور والتقارير.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMasterKey('');
            setMasterKeyError(null);
            setConfirmModal('sample');
          }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 transition cursor-pointer"
        >
          استعادة البيانات التجريبية
        </button>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fadeIn text-right">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {confirmModal === 'import' ? (
                <>
                  <Upload className="w-5 h-5 text-sky-600" />
                  <span>تأكيد استعادة قاعدة البيانات؟</span>
                </>
              ) : confirmModal === 'clear' ? (
                <>
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  <span>مسح كافة البيانات والبدء بمتجر فارغ؟</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  <span>إعادة تحميل الأصناف والبيانات التجريبية؟</span>
                </>
              )}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmModal === 'import'
                ? 'سيؤدي استيراد هذه النسخة الاحتياطية إلى استبدال بيانات المتجر الحالية. هل تريد المتابعة؟'
                : confirmModal === 'clear'
                ? 'هل أنت متأكد من رغبتك في مسح كافة الأصناف والمبيعات والمصروفات التجريبية؟ هذا الإجراء سيمسح البيانات لتبدأ بإدخال بضاعة متجرك الحقيقية.'
                : 'هل أنت متأكد من رغبتك في إعادة تحميل السلع والبيانات التجريبية الافتراضية (شاي العروسة، زيت عافية، أرز المطبخ، إلخ)؟'}
            </p>

            {confirmModal !== 'import' && (
              <div className="space-y-2">
                <label htmlFor="backup-action-master-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  المفتاح الرئيسي
                </label>
                <input
                  id="backup-action-master-key"
                  type="password"
                  value={masterKey}
                  onChange={event => {
                    setMasterKey(event.target.value);
                    setMasterKeyError(null);
                  }}
                  maxLength={256}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
                  aria-invalid={Boolean(masterKeyError)}
                  aria-describedby={masterKeyError ? 'backup-action-master-key-error' : undefined}
                />
                {masterKeyError && (
                  <p id="backup-action-master-key-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                    {masterKeyError}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={processConfirmation}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer ${confirmModal === 'clear' ? 'bg-rose-600 hover:bg-rose-700' : confirmModal === 'sample' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
              >
                {isProcessing
                  ? 'جارٍ التحقق...'
                  : confirmModal === 'clear'
                    ? 'نعم، مسح والبدء من جديد'
                    : confirmModal === 'sample'
                      ? 'نعم، استعادة البيانات التجريبية'
                      : 'نعم، استعادة النسخة الاحتياطية'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
