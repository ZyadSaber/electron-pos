import React, { useState } from 'react';
import { Employee, EmployeeRole, ShopSettings } from '../types';
import { sqliteDB } from '../db/sqliteStorage';
import { 
  UserCheck, 
  UserPlus, 
  ShieldAlert, 
  KeyRound, 
  Phone, 
  Edit, 
  X, 
  Calendar, 
  BadgeCheck,
  Lock,
  LogOut
} from 'lucide-react';

interface EmployeeManagementViewProps {
  settings: ShopSettings;
  onCurrentUserChange?: (employee: Employee) => void;
}

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({ settings, onCurrentUserChange }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => sqliteDB.getEmployees());
  const currentUser = sqliteDB.getCurrentUser();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [formError, setFormError] = useState('');

  const refreshEmployees = () => {
    setEmployees(sqliteDB.getEmployees());
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.name || !editingEmployee?.phone || !editingEmployee?.pin) return;

    try {
      const savedEmployee = sqliteDB.saveEmployee({
        ...editingEmployee,
        name: editingEmployee.name.trim(),
        phone: editingEmployee.phone,
        role: editingEmployee.role || 'Cashier',
        pin: editingEmployee.pin,
      });
      if (currentUser?.id === savedEmployee.id) {
        onCurrentUserChange?.(savedEmployee);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ بيانات الموظف.');
      return;
    }

    setShowAddModal(false);
    setEditingEmployee(null);
    setFormError('');
    refreshEmployees();
  };

  const handleSwitchUser = (emp: Employee) => {
    onCurrentUserChange?.(emp);
    if (!onCurrentUserChange) sqliteDB.setCurrentUser(emp);
    refreshEmployees();
  };

  const roleLabels: Record<string, string> = {
    Owner: 'مالك المتجر (صلاحية كاملة)',
    Manager: 'مدير',
    Cashier: 'كاشير (مبيعات فقط)',
    'Inventory Staff': 'أمين مخزن وبضاعة',
    Accountant: 'محاسب مالي',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            إدارة الموظفين وأذونات الأمان والورديات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            رقم الهاتف هو اسم المستخدم الفريد، ورمز PIN المكوّن من 4 أرقام هو كلمة المرور.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEmployee({ role: 'Cashier', pin: '1234', salary: 4500 });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm self-start md:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Active Logged-in Staff Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg">
            {currentUser?.name.charAt(0) || 'م'}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-md">
              المستخدم الحالي للشاشة
            </span>
            <h3 className="text-base font-bold mt-0.5">{currentUser?.name || 'المدير العام'}</h3>
            <p className="text-xs text-emerald-100 flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5" />
              الدور الوظيفي: {roleLabels[currentUser?.role || ''] || currentUser?.role || 'مالك المتجر'}
            </p>
          </div>
        </div>

        <div className="text-left">
          <p className="text-[11px] text-emerald-100">اسم المستخدم</p>
          <p className="text-xs font-mono font-bold mt-1" dir="ltr">{currentUser?.phone || '—'}</p>
          <p className="text-xs font-mono font-bold bg-black/20 px-3 py-1 rounded-lg mt-1 inline-block">
            PIN: مخفي
          </p>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {employees.map(emp => (
          <div 
            key={emp.id} 
            className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 space-y-3 shadow-xs transition relative text-right ${
              currentUser?.id === emp.id ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-500">{emp.id}</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1">{emp.name}</h3>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                  emp.role === 'Owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                  emp.role === 'Manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                  emp.role === 'Cashier' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {roleLabels[emp.role] || emp.role}
                </span>
              </div>

              <button
                onClick={() => {
                  setEditingEmployee(emp);
                  setShowAddModal(true);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                title="تعديل الموظف"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono" dir="ltr">{emp.phone}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">اسم المستخدم</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ التعيين: {emp.joiningDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-500">رمز PIN: ••••</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                الراتب: {emp.salary.toLocaleString()} {settings.currencySymbol}
              </span>

              {currentUser?.id !== emp.id && (
                <button
                  onClick={() => handleSwitchUser(emp)}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                >
                  تبديل الورديّة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {editingEmployee?.id ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 leading-5 text-emerald-800">
                رقم الهاتف هو اسم تسجيل الدخول ويجب أن يكون فريداً. PIN هو كلمة المرور ولا يظهر بعد الحفظ.
              </p>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={editingEmployee?.name || ''}
                  onChange={e => setEditingEmployee(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: أحمد محمود"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف · اسم المستخدم *</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="username"
                    required
                    value={editingEmployee?.phone || ''}
                    onChange={e => setEditingEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور · PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    value={editingEmployee?.pin || ''}
                    onChange={e => setEditingEmployee(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-mono text-center font-bold"
                  />
                </div>
                {formError && <p role="alert" className="text-xs font-semibold text-rose-600">{formError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">الصلاحية والوظيفة</label>
                  <select
                    value={editingEmployee?.role || 'Cashier'}
                    onChange={e => setEditingEmployee(prev => ({ ...prev, role: e.target.value as EmployeeRole }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Owner">مالك المتجر (صلاحية كاملة)</option>
                    <option value="Manager">مدير</option>
                    <option value="Cashier">كاشير (نقاط البيع والفواتير)</option>
                    <option value="Inventory Staff">مسؤول مخزن وتوريد</option>
                    <option value="Accountant">محاسب مالي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">الراتب الشهري ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={editingEmployee?.salary || 4500}
                    onChange={e => setEditingEmployee(prev => ({ ...prev, salary: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  حفظ بيانات الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
