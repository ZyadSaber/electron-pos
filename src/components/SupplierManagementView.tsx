import React, { useState } from 'react';
import { Product, Supplier, ShopSettings, SupplierLedgerEntry } from '../types';
import { sqliteDB } from '../db/sqliteStorage';
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Building2, 
  Edit, 
  Trash2, 
  X,
  CreditCard,
  RotateCcw,
  Wallet,
} from 'lucide-react';

interface SupplierManagementViewProps {
  settings: ShopSettings;
}

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({ settings }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => sqliteDB.getSuppliers());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [accountSupplier, setAccountSupplier] = useState<Supplier | null>(null);
  const [transactionSupplier, setTransactionSupplier] = useState<Supplier | null>(null);
  const [transactionType, setTransactionType] = useState<'Payment' | 'Return'>('Payment');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [transactionPaymentMode, setTransactionPaymentMode] = useState<'Cash' | 'UPI' | 'Bank' | 'Card'>('Cash');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState('1');

  const refreshSuppliers = () => {
    setSuppliers(sqliteDB.getSuppliers());
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name || !editingSupplier?.companyName || !editingSupplier?.phone) return;

    sqliteDB.saveSupplier({
      ...editingSupplier,
      name: editingSupplier.name,
      companyName: editingSupplier.companyName,
      phone: editingSupplier.phone,
    });

    setShowAddModal(false);
    setEditingSupplier(null);
    refreshSuppliers();
  };

  const handleDeleteSupplier = (id: string) => {
    sqliteDB.deleteSupplier(id);
    refreshSuppliers();
  };

  const openTransaction = (supplier: Supplier, type: 'Payment' | 'Return') => {
    setTransactionSupplier(supplier);
    setTransactionType(type);
    setTransactionAmount('');
    setTransactionReference('');
    setReturnProductId(sqliteDB.getProducts()[0]?.id || '');
    setReturnQuantity('1');
  };

  const handleSaveTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!transactionSupplier) return;
    try {
      if (transactionType === 'Payment') {
        sqliteDB.paySupplier(
          transactionSupplier.id,
          Number(transactionAmount),
          transactionPaymentMode,
          transactionReference.trim() || `PAY-${Date.now()}`,
        );
      } else {
        sqliteDB.recordSupplierReturn(
          transactionSupplier.id,
          returnProductId,
          Number(returnQuantity),
          Number(transactionAmount),
          transactionReference.trim(),
        );
      }
      setTransactionSupplier(null);
      refreshSuppliers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر حفظ الحركة المالية.');
    }
  };

  const getGroupedLedger = (supplierId: string): [string, SupplierLedgerEntry[]][] => {
    const groups = new Map<string, SupplierLedgerEntry[]>();
    sqliteDB.getSupplierLedger(supplierId).forEach(entry => {
      const date = entry.date.slice(0, 10);
      groups.set(date, [...(groups.get(date) || []), entry]);
    });
    return [...groups.entries()];
  };

  const products: Product[] = sqliteDB.getProducts();
  const currentAccountSupplier = accountSupplier
    ? sqliteDB.getSuppliers().find(supplier => supplier.id === accountSupplier.id) || accountSupplier
    : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            دليل الموردين وحسابات الشركات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة شركات التوزيع، شروط الدفع والآجل، أرقام التواصل، والمستحقات المالية للموردين.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSupplier({ paymentTerms: 'آجل 15 يوماً' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">إجمالي الموردين والشركات</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{suppliers.length}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">إجمالي المستحقات للموردين</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {suppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0).toLocaleString()} {settings.currencySymbol || 'ج.م'}
            </p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">موردون بحساب آجل معلق</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {suppliers.filter(s => s.outstandingBalance > 0).length}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المندوب أو الشركة..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(sup => (
          <div key={sup.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 shadow-xs hover:shadow-md transition text-right">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400">{sup.id}</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1">{sup.name}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {sup.companyName}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingSupplier(sup);
                    setShowAddModal(true);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                  title="تعديل المورد"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف المورد "${sup.name}"؟`)) {
                      handleDeleteSupplier(sup.id);
                    }
                  }}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                  title="حذف المورد"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{sup.phone}</span>
              </div>

              {sup.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.email}</span>
                </div>
              )}

              {sup.gstin && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>الرقم الضريبي: {sup.gstin}</span>
                </div>
              )}

              {sup.address && (
                <div className="flex items-center gap-2 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.address}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-slate-500">شروط السداد: {sup.paymentTerms}</span>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">{sup.outstandingBalance < 0 ? 'رصيد لنا' : 'المستحق للمورد'}</span>
                <span className={`font-bold ${sup.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {sup.outstandingBalance.toLocaleString()} {settings.currencySymbol || 'ج.م'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => setAccountSupplier(sup)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                كشف الحساب
              </button>
              <button onClick={() => openTransaction(sup, 'Payment')} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                <Wallet className="w-3 h-3" /> تسجيل سداد
              </button>
              <button onClick={() => openTransaction(sup, 'Return')} className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> مرتجع للمورد
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {editingSupplier?.id ? 'تعديل بيانات المورد' : 'إضافة مورد / شركة جديدة'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المندوب أو جهة الاتصال *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier?.name || ''}
                  onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: حسام الدين"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الشركة أو المصنع أو التوكيل *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier?.companyName || ''}
                  onChange={e => setEditingSupplier(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="مثال: شركة جهينة للصناعات الغذائية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الموبايل / الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier?.phone || ''}
                    onChange={e => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">الرقم الضريبي (اختياري)</label>
                  <input
                    type="text"
                    value={editingSupplier?.gstin || ''}
                    onChange={e => setEditingSupplier(prev => ({ ...prev, gstin: e.target.value }))}
                    placeholder="123-456-789"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">شروط السداد المتفق عليها</label>
                <input
                  type="text"
                  value={editingSupplier?.paymentTerms || 'آجل 15 يوماً'}
                  onChange={e => setEditingSupplier(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  placeholder="مثال: نقدي عند الاستلام / آجل أسبوعين"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان المخزن أو المصنع</label>
                <input
                  type="text"
                  value={editingSupplier?.address || ''}
                  onChange={e => setEditingSupplier(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="المدينة / المنطقة الصناعية"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  حفظ بيانات المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentAccountSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">كشف حساب {currentAccountSupplier.companyName}</h3>
                <p className="text-xs text-slate-500">{currentAccountSupplier.name} · الرصيد الحالي: {currentAccountSupplier.outstandingBalance.toLocaleString()} {settings.currencySymbol || 'ج.م'}</p>
              </div>
              <button onClick={() => setAccountSupplier(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            {!sqliteDB.getSupplierLedger(currentAccountSupplier.id).length ? (
              <p className="text-center text-xs text-slate-400 py-8">لا توجد حركات مسجلة لهذا المورد.</p>
            ) : (
              <div className="space-y-4">
                {getGroupedLedger(currentAccountSupplier.id).map(([date, entries]) => (
                  <section key={date} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500">{new Date(`${date}T00:00:00`).toLocaleDateString('ar-EG')}</h4>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr><th className="p-2">الحركة / الفاتورة</th><th className="p-2">طريقة الدفع</th><th className="p-2">مدين</th><th className="p-2">دائن</th><th className="p-2">الرصيد التالي</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          {entries.map(entry => (
                            <tr key={entry.id}>
                              <td className="p-2">{entry.type === 'Invoice' ? 'فاتورة مورد' : entry.type === 'Payment' ? 'سداد للمورد' : entry.type === 'Return' ? 'مرتجع للمورد' : 'تسوية'}<div className="text-[10px] text-slate-400">{entry.referenceNo}{entry.notes ? ` · ${entry.notes}` : ''}</div></td>
                              <td className="p-2">{entry.paymentMode || '—'}</td>
                              <td className="p-2 text-rose-600">{entry.debit ? `${entry.debit.toLocaleString()} ${settings.currencySymbol || 'ج.م'}` : '—'}</td>
                              <td className="p-2 text-emerald-600">{entry.credit ? `${entry.credit.toLocaleString()} ${settings.currencySymbol || 'ج.م'}` : '—'}</td>
                              <td className="p-2 font-bold">{entry.balance.toLocaleString()} {settings.currencySymbol || 'ج.م'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {transactionSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold">{transactionType === 'Payment' ? 'تسجيل سداد للمورد' : 'تسجيل مرتجع للمورد'}</h3>
              <button onClick={() => setTransactionSupplier(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">{transactionSupplier.companyName} · الرصيد {transactionSupplier.outstandingBalance.toLocaleString()} {settings.currencySymbol || 'ج.م'}</p>
            <form onSubmit={handleSaveTransaction} className="space-y-3 text-xs">
              {transactionType === 'Return' && (
                <>
                  <label className="block">
                    <span className="block mb-1 font-semibold">الصنف المرتجع</span>
                    <select required value={returnProductId} onChange={event => setReturnProductId(event.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900">
                      {products.map(product => <option key={product.id} value={product.id}>{product.name} (المخزون {product.quantity})</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-semibold">الكمية</span>
                    <input type="number" min={1} step={1} required value={returnQuantity} onChange={event => setReturnQuantity(event.target.value)} className="w-full p-2 border rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-semibold">رقم الفاتورة أو مرجع المرتجع</span>
                    <input value={transactionReference} onChange={event => setTransactionReference(event.target.value)} className="w-full p-2 border rounded-lg" />
                  </label>
                </>
              )}
              {transactionType === 'Payment' && (
                <>
                  <label className="block">
                    <span className="block mb-1 font-semibold">رقم إيصال السداد (اختياري)</span>
                    <input value={transactionReference} onChange={event => setTransactionReference(event.target.value)} className="w-full p-2 border rounded-lg" />
                  </label>
                  <label className="block">
                    <span className="block mb-1 font-semibold">طريقة السداد</span>
                    <select value={transactionPaymentMode} onChange={event => setTransactionPaymentMode(event.target.value as 'Cash' | 'UPI' | 'Bank' | 'Card')} className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900">
                      <option value="Cash">نقداً</option><option value="UPI">محفظة / تحويل فوري</option><option value="Bank">تحويل بنكي</option><option value="Card">بطاقة</option>
                    </select>
                  </label>
                </>
              )}
              <label className="block">
                <span className="block mb-1 font-semibold">{transactionType === 'Payment' ? 'المبلغ المدفوع' : 'قيمة المرتجع'}</span>
                <input type="number" min="0.01" step="0.01" required value={transactionAmount} onChange={event => setTransactionAmount(event.target.value)} className="w-full p-2 border rounded-lg" />
              </label>
              <button type="submit" className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">حفظ الحركة</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
