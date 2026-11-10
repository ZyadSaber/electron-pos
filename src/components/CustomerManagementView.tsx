import React, { useState } from 'react';
import { Customer, ShopSettings, Sale } from '../types';
import { sqliteDB } from '../db/sqliteStorage';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  CreditCard, 
  DollarSign, 
  Clock, 
  Edit, 
  Trash2, 
  X, 
  Plus, 
  CheckCircle,
  FileText
} from 'lucide-react';

interface CustomerManagementViewProps {
  settings: ShopSettings;
  onSelectCustomerForPOS?: (customer: Customer) => void;
}

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  settings,
  onSelectCustomerForPOS
}) => {
  const [customers, setCustomers] = useState<Customer[]>(() => sqliteDB.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  
  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [showDuesModal, setShowDuesModal] = useState<Customer | null>(null);
  const [payDuesAmount, setPayDuesAmount] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState<Customer | null>(null);

  const refreshCustomers = () => {
    setCustomers(sqliteDB.getCustomers());
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = selectedTag === 'ALL' || c.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name || !editingCustomer?.phone) return;

    sqliteDB.saveCustomer({
      ...editingCustomer,
      name: editingCustomer.name,
      phone: editingCustomer.phone,
    });

    setShowAddEditModal(false);
    setEditingCustomer(null);
    refreshCustomers();
  };

  const handleDeleteCustomer = (id: string) => {
    sqliteDB.deleteCustomer(id);
    refreshCustomers();
  };

  const handlePayDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDuesModal || payDuesAmount <= 0) return;

    sqliteDB.payCustomerDues(showDuesModal.id, payDuesAmount);
    setShowDuesModal(null);
    setPayDuesAmount(0);
    refreshCustomers();
  };

  const getCustomerSales = (phone: string): Sale[] => {
    return sqliteDB.getSales().filter(s => s.customerPhone === phone);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            إدارة العملاء ودفتر حساب الآجل (الشكك)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة سجل مشتريات الزبائن، نقاط الولاء، الرصيد المتاح، وتحصيل المديونيات الآجلة.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer({ tag: 'زبون عادي' });
            setShowAddEditModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm self-start md:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">إجمالي عدد العملاء</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{customers.length}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">إجمالي ديون الآجل المطلوبة</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {customers.reduce((acc, c) => acc + (c.outstandingDues || 0), 0).toLocaleString()} {settings.currencySymbol || 'ج.م'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">العملاء المميزون (VIP)</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {customers.filter(c => c.tag?.includes('VIP')).length}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">نقاط الولاء الممنوحة</p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
              {customers.reduce((acc, c) => acc + (c.loyaltyPoints || 0), 0)} نقطة
            </p>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/50 rounded-xl text-sky-600 dark:text-sky-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم العميل أو رقم الموبايل..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'VIP', label: 'عملاء مميزين (VIP)' },
            { id: 'Regular', label: 'زبائن عاديين' },
            { id: 'Wholesale', label: 'جملة ونصف جملة' }
          ].map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedTag === tag.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                <th className="py-3 px-4">بيانات العميل</th>
                <th className="py-3 px-4">رقم الاتصال</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4 text-left">إجمالي المشتريات</th>
                <th className="py-3 px-4 text-left">نقاط الولاء</th>
                <th className="py-3 px-4 text-left">الآجل المستحق</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    لم يتم العثور على أي عميل يطابق البحث.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                    <td className="py-3 px-4 font-medium">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{customer.name}</div>
                      <div className="text-[10px] text-slate-400">{customer.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        customer.tag?.includes('VIP') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300' :
                        customer.tag?.includes('جملة') || customer.tag === 'Wholesale' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {customer.tag}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left font-semibold text-slate-800 dark:text-slate-100">
                      {customer.totalSpent.toLocaleString()} {settings.currencySymbol || 'ج.م'}
                    </td>
                    <td className="py-3 px-4 text-left font-semibold text-sky-600 dark:text-sky-400">
                      {customer.loyaltyPoints} نقطة
                    </td>
                    <td className="py-3 px-4 text-left">
                      {customer.outstandingDues > 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded-lg">
                          {customer.outstandingDues.toLocaleString()} {settings.currencySymbol || 'ج.م'}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">خالص الحساب</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onSelectCustomerForPOS && (
                          <button
                            onClick={() => onSelectCustomerForPOS(customer)}
                            className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 font-bold text-[11px] px-2 cursor-pointer"
                            title="اختيار للكاشير"
                          >
                            فاتورة بيع
                          </button>
                        )}

                        <button
                          onClick={() => setShowHistoryModal(customer)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="عرض سجل المشتريات"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {customer.outstandingDues > 0 && (
                          <button
                            onClick={() => {
                              setShowDuesModal(customer);
                              setPayDuesAmount(customer.outstandingDues);
                            }}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            title="سداد الآجل"
                          >
                            سداد دين
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingCustomer(customer);
                            setShowAddEditModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="تعديل بيانات العميل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف العميل "${customer.name}"؟`)) {
                              handleDeleteCustomer(customer.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded-lg cursor-pointer"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {editingCustomer?.id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer?.name || ''}
                  onChange={e => setEditingCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: أحمد محمود"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الموبايل *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer?.phone || ''}
                  onChange={e => setEditingCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">فئة العميل</label>
                  <select
                    value={editingCustomer?.tag || 'زبون عادي'}
                    onChange={e => setEditingCustomer(prev => ({ ...prev, tag: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="زبون عادي">زبون عادي</option>
                    <option value="عميل مميز (VIP)">عميل مميز (VIP)</option>
                    <option value="جملة ونصف جملة">جملة ونصف جملة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">الرصيد الآجل الافتتاحي ({settings.currencySymbol || 'ج.م'})</label>
                  <input
                    type="number"
                    value={editingCustomer?.outstandingDues || 0}
                    onChange={e => setEditingCustomer(prev => ({ ...prev, outstandingDues: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان</label>
                <input
                  type="text"
                  value={editingCustomer?.address || ''}
                  onChange={e => setEditingCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="الشارع / العمارة / الشقة"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-sm cursor-pointer"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Outstanding Dues Modal */}
      {showDuesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">سداد حساب الآجل (الشكك)</h3>
              <button onClick={() => setShowDuesModal(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              العميل: <span className="font-bold">{showDuesModal.name}</span> ({showDuesModal.phone})<br />
              إجمالي الدين الحالي: <span className="font-bold text-rose-600">{showDuesModal.outstandingDues} {settings.currencySymbol || 'ج.م'}</span>
            </p>

            <form onSubmit={handlePayDues} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ المسدد نقداً ({settings.currencySymbol || 'ج.م'})</label>
                <input
                  type="number"
                  min={1}
                  max={showDuesModal.outstandingDues}
                  value={payDuesAmount}
                  onChange={e => setPayDuesAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-bold text-sm text-center"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuesModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-sm cursor-pointer"
                >
                  تسجيل السداد في الخزينة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">سجل مشتريات العميل: {showHistoryModal.name}</h3>
                <p className="text-xs text-slate-500">رقم الهاتف: {showHistoryModal.phone}</p>
              </div>
              <button onClick={() => setShowHistoryModal(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {getCustomerSales(showHistoryModal.phone).length === 0 ? (
                <p className="text-center py-6 text-slate-400">لا توجد فواتير سابقة مسجلة لرقم الموبايل هذا.</p>
              ) : (
                getCustomerSales(showHistoryModal.phone).map(sale => (
                  <div key={sale.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-600">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{sale.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">{new Date(sale.dateTime).toLocaleString('ar-EG')} • {sale.paymentMode === 'Cash' ? 'كاش' : sale.paymentMode === 'UPI' ? 'إنستاباي' : sale.paymentMode === 'Card' ? 'بطاقة' : 'آجل'}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">{sale.totalAmount} {settings.currencySymbol || 'ج.م'}</div>
                      <div className="text-[10px] text-slate-500">{sale.items.length} صنف</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
