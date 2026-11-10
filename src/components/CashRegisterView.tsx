import React, { useEffect, useState } from 'react';
import { sqliteDB } from '../db/sqliteStorage';
import { CashRegisterShift, CashTransaction, Employee } from '../types';
import { canManageCashShifts } from '../utils/permissions';
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  Receipt,
  FileText,
  Clock,
  PlusCircle,
  Calculator,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

interface CashRegisterViewProps {
  currentUser: Employee;
}

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ currentUser }) => {
  const [shiftsHistory, setShiftsHistory] = useState<CashRegisterShift[]>(sqliteDB.getCashShifts());
  const [transactions, setTransactions] = useState<CashTransaction[]>(sqliteDB.getCashTransactions());
  const [selectedShiftId, setSelectedShiftId] = useState(
    () => sqliteDB.getCurrentCashShift(currentUser.id)?.id || ''
  );
  const [targetEmployeeId, setTargetEmployeeId] = useState(currentUser.id);
  const [employees] = useState(() => sqliteDB.getEmployees().filter(employee => employee.status === 'Active'));
  const [actionError, setActionError] = useState('');
  const canManageShifts = canManageCashShifts(currentUser.role);
  const openShifts = shiftsHistory.filter(shift => shift.status === 'Open');
  const ownShift = openShifts.find(shift =>
    shift.cashierId === currentUser.id || (!shift.cashierId && shift.cashierName === currentUser.name)
  );
  const currentShift = canManageShifts
    ? openShifts.find(shift => shift.id === selectedShiftId) || ownShift
    : ownShift;
  const visibleShifts = canManageShifts
    ? shiftsHistory
    : shiftsHistory.filter(shift =>
      shift.cashierId === currentUser.id || (!shift.cashierId && shift.cashierName === currentUser.name)
    );
  const visibleTransactions = canManageShifts
    ? transactions
    : transactions.filter(transaction => visibleShifts.some(shift => shift.id === transaction.shiftId));

  // Modal forms
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);

  // Form inputs
  const [openingFloat, setOpeningFloat] = useState(2000);
  const [closingCashCount, setClosingCashCount] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState('');

  const [txnType, setTxnType] = useState<'CashIn' | 'CashOut' | 'SafeDeposit'>('CashIn');
  const [txnAmount, setTxnAmount] = useState<number | ''>('');
  const [txnReason, setTxnReason] = useState('');

  useEffect(() => {
    setShiftsHistory(sqliteDB.getCashShifts());
    setTransactions(sqliteDB.getCashTransactions());
    setSelectedShiftId(sqliteDB.getCurrentCashShift(currentUser.id)?.id || '');
    setTargetEmployeeId(currentUser.id);
  }, [currentUser.id]);

  const refreshData = () => {
    const updatedShifts = sqliteDB.getCashShifts();
    setShiftsHistory(updatedShifts);
    setTransactions(sqliteDB.getCashTransactions());
    setSelectedShiftId(previous =>
      updatedShifts.some(shift => shift.id === previous && shift.status === 'Open')
        ? previous
        : sqliteDB.getCurrentCashShift(currentUser.id)?.id || ''
    );
  };

  const shiftCalc = currentShift ? sqliteDB.getShiftExpectedCash(currentShift) : null;
  const shiftPaymentBreakdown = currentShift ? sqliteDB.getShiftPaymentBreakdown(currentShift) : null;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const shift = sqliteDB.openCashShift(Number(openingFloat), shiftNotes, targetEmployeeId);
      setShowOpenModal(false);
      setShiftNotes('');
      setActionError('');
      setSelectedShiftId(shift.id);
      refreshData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر فتح الشفت.');
    }
  };

  const requestOpenShift = () => {
    const firstAvailable = employees.find(employee =>
      employee.role === 'Cashier' && !sqliteDB.getCurrentCashShift(employee.id)
    ) || employees.find(employee => !sqliteDB.getCurrentCashShift(employee.id));
    setTargetEmployeeId(
      !sqliteDB.getCurrentCashShift(currentUser.id)
        ? currentUser.id
        : firstAvailable?.id || currentUser.id
    );
    setActionError('');
    setShowOpenModal(true);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    try {
      sqliteDB.closeCashShift(Number(closingCashCount), shiftNotes, currentShift.id);
      setShowCloseModal(false);
      setShiftNotes('');
      setActionError('');
      setSelectedShiftId('');
      refreshData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر إغلاق الشفت.');
    }
  };

  const handleAddTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnAmount || Number(txnAmount) <= 0 || !txnReason.trim()) {
      setActionError('أدخل مبلغاً صحيحاً وسبب الحركة.');
      return;
    }
    if (!currentShift) return;
    try {
      sqliteDB.addCashTransaction(txnType, Number(txnAmount), txnReason, currentShift.id);
      setShowTxnModal(false);
      setTxnAmount('');
      setTxnReason('');
      setActionError('');
      refreshData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'تعذر تسجيل الحركة النقدية.');
    }
  };

  const currency = sqliteDB.getSettings().currencySymbol || 'ج.م';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            إدارة درج النقدية وشفتات الكاشير
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة العُهدة الافتتاحية (الفكة)، المبيعات النقدية، الإيداعات والسحوبات، وإقفال ومطابقة عجز وزيادة الدرج.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageShifts && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              الشفت المعروض
              <select
                value={currentShift?.id || ''}
                onChange={event => setSelectedShiftId(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">لا يوجد شفت نشط</option>
                {openShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>
                    {shift.cashierName}{shift.cashierId === currentUser.id ? ' (شفتك)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentShift ? (
            <>
              {(currentShift.cashierId === currentUser.id || canManageShifts) && <button
                onClick={() => setShowTxnModal(true)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                حركة إيداع / سحب نقدية
              </button>}
              {(currentShift.cashierId === currentUser.id || canManageShifts) && <button
                onClick={() => {
                  if (currentShift) {
                    const calc = sqliteDB.getShiftExpectedCash(currentShift);
                    setClosingCashCount(calc.expectedCash);
                  }
                  setShowCloseModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                إغلاق وتسليم الشفت
              </button>}
            </>
          ) : null}
          {(canManageShifts || !ownShift) && (
            <button
              onClick={requestOpenShift}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              {canManageShifts ? 'فتح شفت لموظف' : 'فتح شفت لنفسي'}
            </button>
          )}
        </div>
      </div>
      {actionError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {actionError}
        </p>
      )}

      {/* Current Shift Summary Cards */}
      {currentShift && shiftCalc ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Opening Cash Float */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">العُهدة الافتتاحية (الفكة)</div>
            <div className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
              {shiftCalc.openingCash.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1" dir="ltr">
              <Clock className="w-3 h-3" />
              {new Date(currentShift.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Shift Cash Sales */}
          <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 p-4 rounded-2xl">
            <div className="text-xs text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              المبيعات النقدية (كاش)
            </div>
            <div className="text-xl font-bold text-teal-900 dark:text-teal-200 mt-1">
              +{shiftCalc.totalCashSales.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">
              مبيعات كاش الشفت الحالي
            </div>
          </div>

          {/* Cash Added */}
          <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 p-4 rounded-2xl">
            <div className="text-xs text-sky-700 dark:text-sky-400 font-medium">نقدية مضافة (إيداع)</div>
            <div className="text-xl font-bold text-sky-900 dark:text-sky-200 mt-1">
              +{shiftCalc.cashInTotal.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              تغذية الدرج بفكة
            </div>
          </div>

          {/* Payouts */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl">
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">مصروفات مسحوبة (سحب)</div>
            <div className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">
              -{shiftCalc.cashOutTotal.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" />
              نثريات ومصاريف طارئة
            </div>
          </div>

          {/* Safe Drops */}
          <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 p-4 rounded-2xl">
            <div className="text-xs text-purple-700 dark:text-purple-400 font-medium">توريد للخزينة الرئيسية</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-200 mt-1">
              -{shiftCalc.safeDepositTotal.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              تفريغ سيولة للخزنة
            </div>
          </div>

          {/* Expected Drawer Total */}
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-4 rounded-2xl shadow-xs">
            <div className="text-xs text-emerald-100 font-medium flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" />
              الكاش المتوقع بالدرج
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {shiftCalc.expectedCash.toLocaleString()} {currency}
            </div>
            <div className="text-[10px] text-emerald-200 mt-1">
              رصيد الدرج الدفتري الحالي
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="font-bold text-amber-900 dark:text-amber-200 text-base">لا يوجد شفت كاشير مفتوح حالياً</h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
            فتح الشفت يوفر سجلاً تدقيقياً دقيقاً لمبالغ الكاش في الدرج ويحسب العجز والزيادة تلقائياً عند الإغلاق.
          </p>
          <button
            onClick={requestOpenShift}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            فتح شفت كاشير جديد
          </button>
        </div>
      )}

      {/* Recent Cash Drawer Transactions */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            سجل حركات ونقدية درج الكاشير
          </h3>
          <span className="text-xs text-slate-500">{visibleTransactions.length} حركة مسجلة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-700/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">الوقت</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3 text-left">المبلغ</th>
                <th className="p-3">السبب / البيان</th>
                <th className="p-3">اسم الكاشير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">لا توجد حركات سحب أو إيداع مسجلة في الدرج اليوم</td>
                </tr>
              ) : (
                visibleTransactions.slice(0, 15).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 text-slate-500" dir="ltr">{new Date(t.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.type === 'CashIn' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        t.type === 'CashOut' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}>
                        {t.type === 'CashIn' ? 'إيداع نقدية' : t.type === 'CashOut' ? 'سحب مصروف' : 'توريد للخزنة'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100 text-left">
                      {t.amount.toLocaleString()} {currency}
                    </td>
                    <td className="p-3">{t.reason}</td>
                    <td className="p-3 text-slate-500">{t.cashierName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shifts History */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          سجل وإحصائيات الورديات والشفتات السابقة
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-700/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-3">رقم الشفت</th>
                <th className="p-3">الموظف</th>
                {canManageShifts && <th className="p-3">فتح بواسطة</th>}
                <th className="p-3">وقت البدء</th>
                <th className="p-3">وقت الإغلاق</th>
                <th className="p-3 text-left">العُهدة الافتتاحية</th>
                <th className="p-3 text-left">المتوقع دفترياً</th>
                <th className="p-3 text-left">الجرد الفعلي</th>
                <th className="p-3 text-left">الفارق (عجز/زيادة)</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleShifts.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono text-[11px] font-semibold">{s.id}</td>
                  <td className="p-3">{s.cashierName}</td>
                  {canManageShifts && <td className="p-3">{s.openedByName || s.cashierName}</td>}
                  <td className="p-3">{new Date(s.startTime).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-3">{s.endTime ? new Date(s.endTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="p-3 font-semibold text-left">{s.openingCash.toLocaleString()} {currency}</td>
                  <td className="p-3 text-left">{s.expectedCash !== undefined ? `${s.expectedCash.toLocaleString()} ${currency}` : '-'}</td>
                  <td className="p-3 font-bold text-left">{s.closingCash !== undefined ? `${s.closingCash.toLocaleString()} ${currency}` : '-'}</td>
                  <td className="p-3 text-left">
                    {s.cashDifference !== undefined ? (
                      <span className={`font-bold ${s.cashDifference === 0 ? 'text-emerald-600' : s.cashDifference > 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                        {s.cashDifference === 0 ? 'متطابق تماماً' : s.cashDifference > 0 ? `+${s.cashDifference.toLocaleString()} ${currency} (زيادة)` : `${s.cashDifference.toLocaleString()} ${currency} (عجز)`}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'Open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {s.status === 'Open' ? 'مفتوح حالياً' : 'مغلق ومطابق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Open Shift */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleOpenShift} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              فتح شفت كاشير جديد
            </h3>

            {canManageShifts && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الموظف المسؤول عن الشفت</label>
                <select
                  value={targetEmployeeId}
                  onChange={event => setTargetEmployeeId(event.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
                  required
                >
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id} disabled={Boolean(sqliteDB.getCurrentCashShift(employee.id))}>
                      {employee.name}{sqliteDB.getCurrentCashShift(employee.id) ? ' (لديه شفت مفتوح)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                مبلغ العُهدة الافتتاحية / الفكة ({currency})
              </label>
              <input
                type="number"
                value={openingFloat}
                onChange={e => setOpeningFloat(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                ملاحظات أو تعليق عند الاستلام
              </label>
              <textarea
                value={shiftNotes}
                onChange={e => setShiftNotes(e.target.value)}
                placeholder="ملاحظات حول جاهزية الدرج أو الفكة المتوفرة..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                بدء الشفت الآن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Close Shift with Full Calculation Breakdown */}
      {showCloseModal && currentShift && shiftCalc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCloseShift} className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" />
              إغلاق شفت الكاشير ومطابقة الخزينة
            </h3>

            {/* Shift Cash Calculation Breakdown Box */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  بيان وتفصيل نقدية الدرج الدفترية
                </span>
                <span className="text-[10px] text-slate-500 font-medium">الشفت النشط</span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>(+) العُهدة الافتتاحية (الفكة)</span>
                <span className="font-mono font-semibold">{shiftCalc.openingCash.toLocaleString()} {currency}</span>
              </div>

              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                <span>(+) إجمالي مبيعات الكاش</span>
                <span className="font-mono font-semibold">+{shiftCalc.totalCashSales.toLocaleString()} {currency}</span>
              </div>

              <div className="flex justify-between text-sky-700 dark:text-sky-400">
                <span>(+) نقدية مضافة للدرج (إيداع)</span>
                <span className="font-mono font-semibold">+{shiftCalc.cashInTotal.toLocaleString()} {currency}</span>
              </div>

              <div className="flex justify-between text-amber-700 dark:text-amber-400">
                <span>(-) مصروفات مسحوبة (سحب)</span>
                <span className="font-mono font-semibold">-{shiftCalc.cashOutTotal.toLocaleString()} {currency}</span>
              </div>

              <div className="flex justify-between text-purple-700 dark:text-purple-400">
                <span>(-) توريدات للخزنة الرئيسية</span>
                <span className="font-mono font-semibold">-{shiftCalc.safeDepositTotal.toLocaleString()} {currency}</span>
              </div>

              <div className="pt-2 border-t border-slate-300 dark:border-slate-600 flex justify-between items-center font-bold text-slate-900 dark:text-slate-100 text-sm">
                <span>= الكاش المتوقع وجوده في الدرج</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{shiftCalc.expectedCash.toLocaleString()} {currency}</span>
              </div>
            </div>

            {/* Non-Cash Sales Notice */}
            {shiftPaymentBreakdown && (shiftPaymentBreakdown.totalSales - shiftPaymentBreakdown.cashSales > 0) && (
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    المدفوعات غير النقدية (لا تدخل في درج الكاش):
                  </span>
                  <span className="font-mono font-bold">{(shiftPaymentBreakdown.totalSales - shiftPaymentBreakdown.cashSales).toLocaleString()} {currency}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 text-[11px] text-blue-700 dark:text-blue-400">
                  {shiftPaymentBreakdown.upiSales > 0 && <span>إنستاباي ومحافظ: {shiftPaymentBreakdown.upiSales.toLocaleString()} {currency}</span>}
                  {shiftPaymentBreakdown.cardSales > 0 && <span>فيزا وبطاقات: {shiftPaymentBreakdown.cardSales.toLocaleString()} {currency}</span>}
                  {shiftPaymentBreakdown.creditSales > 0 && <span>آجل وشكك: {shiftPaymentBreakdown.creditSales.toLocaleString()} {currency}</span>}
                  {shiftPaymentBreakdown.otherSales > 0 && <span>أخرى: {shiftPaymentBreakdown.otherSales.toLocaleString()} {currency}</span>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                الجرد الفعلي للنقدية الموجودة في الدرج ({currency})
              </label>
              <input
                type="number"
                value={closingCashCount}
                onChange={e => setClosingCashCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
                required
              />
            </div>

            {/* Live Variance / Discrepancy indicator */}
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              closingCashCount - shiftCalc.expectedCash === 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : closingCashCount - shiftCalc.expectedCash > 0
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              <span>حالة المطابقة:</span>
              <span className="font-bold text-xs">
                {closingCashCount - shiftCalc.expectedCash === 0
                  ? '✓ متطابق تماماً (لا يوجد عجز أو زيادة)'
                  : closingCashCount - shiftCalc.expectedCash > 0
                  ? `+${(closingCashCount - shiftCalc.expectedCash).toLocaleString()} ${currency} (زيادة في الدرج)`
                  : `-${Math.abs(closingCashCount - shiftCalc.expectedCash).toLocaleString()} ${currency} (عجز في الدرج)`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                ملاحظات الإقفال أو سبب العجز/الزيادة
              </label>
              <textarea
                value={shiftNotes}
                onChange={e => setShiftNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك حول الشفت أو سبب الفارق إن وُجد..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                تأكيد وإغلاق الشفت
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Cash In/Out */}
      {showTxnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddTxn} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 dark:border-slate-700 text-right">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              تسجيل حركة نقدية في درج الكاشير
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">نوع الحركة</label>
              <select
                value={txnType}
                onChange={e => setTxnType(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-semibold"
              >
                <option value="CashIn">إيداع نقدية في الدرج (تغذية فكة)</option>
                <option value="CashOut">سحب نقدية من الدرج (مصروف / نثريات)</option>
                <option value="SafeDeposit">توريد نقدية للخزينة الرئيسية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">المبلغ ({currency})</label>
              <input
                type="number"
                value={txnAmount}
                onChange={e => setTxnAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 text-center"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">السبب أو رقم الإيصال</label>
              <input
                type="text"
                value={txnReason}
                onChange={e => setTxnReason(e.target.value)}
                placeholder="مثال: شراء أكياس تعبئة، سداد فاتورة كهرباء، تغذية فكة خمسات وعشرات"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTxnModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                حفظ الحركة في الدرج
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
