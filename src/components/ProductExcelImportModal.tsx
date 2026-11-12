import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, FileSpreadsheet, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

type ImportField = 'name' | 'category' | 'barcode' | 'purchasePrice' | 'sellingPrice' | 'quantity' | 'supplierName' | 'expiryDate' | 'unit';

type ProductImportData = Pick<Product, 'name' | 'barcode' | 'purchasePrice' | 'sellingPrice' | 'quantity'> &
  Partial<Pick<Product, 'category' | 'supplierName' | 'expiryDate' | 'unit'>>;

export interface ProductExcelImportRow {
  rowNumber: number;
  product: ProductImportData;
}

export interface ProductExcelImportResult {
  imported: number;
  failedRows: number[];
}

interface ProductExcelImportModalProps {
  onClose: () => void;
  onImport: (rows: ProductExcelImportRow[]) => ProductExcelImportResult;
}

interface SpreadsheetRow {
  rowNumber: number;
  cells: unknown[];
}

interface PreparedRow extends SpreadsheetRow {
  product: ProductImportData;
  errors: string[];
}

const IMPORT_FIELDS: Array<{
  key: ImportField;
  label: string;
  required: boolean;
  aliases: string[];
}> = [
  { key: 'name', label: 'اسم المنتج', required: true, aliases: ['اسم المنتج', 'اسم الصنف', 'المنتج', 'الصنف', 'product name', 'name', 'item'] },
  { key: 'category', label: 'القسم', required: false, aliases: ['القسم', 'التصنيف', 'الفئة', 'category', 'type'] },
  { key: 'barcode', label: 'الباركود', required: false, aliases: ['الباركود', 'باركود', 'كود الصنف', 'barcode', 'bar code', 'sku'] },
  { key: 'purchasePrice', label: 'سعر الشراء', required: true, aliases: ['سعر الشراء', 'سعر التكلفة', 'التكلفة', 'purchase price', 'cost', 'cost price'] },
  { key: 'sellingPrice', label: 'سعر البيع', required: true, aliases: ['سعر البيع', 'سعر المستهلك', 'selling price', 'sale price', 'price'] },
  { key: 'quantity', label: 'الكمية', required: true, aliases: ['الكمية', 'الرصيد', 'المخزون', 'quantity', 'qty', 'stock'] },
  { key: 'supplierName', label: 'المورد', required: false, aliases: ['المورد', 'اسم المورد', 'الشركة', 'supplier', 'supplier name'] },
  { key: 'expiryDate', label: 'تاريخ انتهاء الصلاحية', required: false, aliases: ['تاريخ انتهاء الصلاحية', 'الصلاحية', 'تاريخ الانتهاء', 'expiry date', 'expiry', 'expiration date'] },
  { key: 'unit', label: 'الوحدة', required: false, aliases: ['الوحدة', 'وحدة القياس', 'unit', 'measurement unit'] },
];

const normalizeHeader = (value: string): string => value
  .trim()
  .toLocaleLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[\s_-]+/g, '');

const detectColumn = (header: string, aliases: string[]): boolean =>
  aliases.some(alias => normalizeHeader(header) === normalizeHeader(alias));

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? '')
    .trim()
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/[٬,،\s]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: unknown): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }

  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

export const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({ onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductExcelImportResult | null>(null);

  const preparedRows = useMemo<PreparedRow[]>(() => rows.map(row => {
    const getValue = (field: ImportField) => {
      const columnIndex = mapping[field];
      return columnIndex === undefined ? '' : row.cells[columnIndex] ?? '';
    };
    const name = String(getValue('name')).trim();
    const barcode = String(getValue('barcode')).trim();
    const category = String(getValue('category')).trim() || 'أخرى';
    const supplierName = String(getValue('supplierName')).trim();
    const unit = String(getValue('unit')).trim() || 'قطعة';
    const purchasePrice = parseNumber(getValue('purchasePrice'));
    const sellingPrice = parseNumber(getValue('sellingPrice'));
    const quantity = parseNumber(getValue('quantity'));
    const expiryValue = getValue('expiryDate');
    const expiryDate = expiryValue === '' ? '' : parseDate(expiryValue);
    const errors: string[] = [];

    if (!name) errors.push('اسم المنتج مطلوب');
    if (purchasePrice === null || purchasePrice < 0) errors.push('سعر الشراء غير صالح');
    if (sellingPrice === null || sellingPrice < 0) errors.push('سعر البيع غير صالح');
    if (quantity === null || quantity < 0) errors.push('الكمية غير صالحة');
    if (expiryDate === null) errors.push('تاريخ الصلاحية غير صالح');

    return {
      ...row,
      product: {
        name,
        category,
        barcode,
        purchasePrice: purchasePrice ?? 0,
        sellingPrice: sellingPrice ?? 0,
        quantity: quantity ?? 0,
        supplierName,
        expiryDate: expiryDate || undefined,
        unit,
      },
      errors,
    };
  }), [mapping, rows]);

  const validRows = preparedRows.filter(row => row.errors.length === 0);
  const requiredFieldsMapped = IMPORT_FIELDS
    .filter(field => field.required)
    .every(field => mapping[field.key] !== undefined);
  const previewRows = preparedRows.slice(0, 6);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setResult(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('لا يحتوي الملف على أوراق عمل.');

      const worksheet = workbook.Sheets[firstSheetName];
      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: '',
      });
      if (sheetRows.length < 2) throw new Error('يجب أن يحتوي الملف على صف للعناوين وصف واحد على الأقل للمنتجات.');

      const nextHeaders = sheetRows[0].map((header, index) => String(header ?? '').trim() || `عمود ${index + 1}`);
      const nextRows = sheetRows.slice(1)
        .map((cells, index) => ({ rowNumber: index + 2, cells }))
        .filter(row => row.cells.some(cell => String(cell ?? '').trim() !== ''));
      if (nextRows.length === 0) throw new Error('لم يتم العثور على صفوف منتجات في ورقة العمل الأولى.');

      const nextMapping: Partial<Record<ImportField, number>> = {};
      IMPORT_FIELDS.forEach(field => {
        const index = nextHeaders.findIndex(header => detectColumn(header, field.aliases));
        if (index >= 0) nextMapping[field.key] = index;
      });
      setFileName(file.name);
      setHeaders(nextHeaders);
      setRows(nextRows);
      setMapping(nextMapping);
    } catch (loadError) {
      setFileName('');
      setHeaders([]);
      setRows([]);
      setMapping({});
      setError(loadError instanceof Error ? loadError.message : 'تعذرت قراءة ملف Excel.');
    }
  };

  const handleImport = () => {
    const importRows = validRows.map(({ rowNumber, product }) => ({ rowNumber, product }));
    if (importRows.length === 0) return;
    setResult(onImport(importRows));
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl overflow-hidden my-auto">
        <header className="flex items-center justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              استيراد المنتجات من Excel
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              اختر ملفاً، ثم طابق أعمدة الملف مع بيانات المنتجات قبل الاستيراد.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {!result && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fileName || 'لم يتم اختيار ملف'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">يدعم ملفات Excel بصيغ XLS وXLSX وCSV، وستتم قراءة الورقة الأولى.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                اختيار ملف
              </button>
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm">{error}</div>}

          {headers.length > 0 && !result && (
            <>
              <div>
                <div className="mb-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">مطابقة أعمدة الملف</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">اختر العمود المقابل لكل حقل. الحقول المطلوبة محددة بعلامة (*).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {IMPORT_FIELDS.map(field => (
                    <label key={field.key} className="block p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="block mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {field.label}{field.required ? ' *' : ''}
                      </span>
                      <select
                        value={mapping[field.key] ?? ''}
                        onChange={event => {
                          const value = event.target.value;
                          setMapping(previous => {
                            const next = { ...previous };
                            if (value === '') delete next[field.key];
                            else next[field.key] = Number(value);
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                      >
                        <option value="">-- غير محدد --</option>
                        {headers.map((header, index) => (
                          <option key={`${index}-${header}`} value={index}>{header}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/70">
                    <tr>
                      <th className="p-3">رقم الصف</th>
                      <th className="p-3">اسم المنتج</th>
                      <th className="p-3">الباركود</th>
                      <th className="p-3">سعر الشراء</th>
                      <th className="p-3">سعر البيع</th>
                      <th className="p-3">الكمية</th>
                      <th className="p-3">التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {previewRows.map(row => (
                      <tr key={row.rowNumber}>
                        <td className="p-3 font-mono">{row.rowNumber}</td>
                        <td className="p-3">{row.product.name || '—'}</td>
                        <td className="p-3 font-mono">{row.product.barcode || 'تلقائي'}</td>
                        <td className="p-3">{row.product.purchasePrice}</td>
                        <td className="p-3">{row.product.sellingPrice}</td>
                        <td className="p-3">{row.product.quantity}</td>
                        <td className={`p-3 ${row.errors.length ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {row.errors.length ? row.errors.join('، ') : 'صالح'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/70">
                  معاينة أول {previewRows.length} من {preparedRows.length} صفاً · صالح للاستيراد: {validRows.length} · غير صالح: {preparedRows.length - validRows.length}
                </p>
              </div>
            </>
          )}

          {result && (
            <div role="status" className={`p-4 rounded-xl border ${result.failedRows.length ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <div className="flex items-center gap-2 font-bold">
                {result.failedRows.length ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                اكتمل استيراد {result.imported} منتجاً.
              </div>
              {result.failedRows.length > 0 && (
                <p className="mt-2 text-sm">تعذر استيراد الصفوف: {result.failedRows.join('، ')}</p>
              )}
              {preparedRows.length > validRows.length && (
                <p className="mt-2 text-sm">تم تجاوز {preparedRows.length - validRows.length} صفاً لوجود بيانات غير صالحة.</p>
              )}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold">
            {result ? 'إغلاق' : 'إلغاء'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!headers.length || !requiredFieldsMapped || validRows.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-xs font-bold"
            >
              استيراد {validRows.length} منتج
            </button>
          )}
        </footer>
      </section>
    </div>
  );
};
