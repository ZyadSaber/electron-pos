import React, { useEffect, useState } from 'react';
import { KeyRound, Search, ShieldCheck, Trash2, UserPlus, UserRound, X } from 'lucide-react';
import type { UserAccount, Worker, WorkerPage } from '../types';

const pageSize = 10;

interface UserManagementViewProps {
  token: string;
  currentMilitaryNumber: string;
}

type UserAction = { type: 'reset' | 'delete'; user: UserAccount };

export const UserManagementView: React.FC<UserManagementViewProps> = ({ token, currentMilitaryNumber }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerResults, setWorkerResults] = useState<Worker[]>([]);
  const [searchingWorkers, setSearchingWorkers] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [action, setAction] = useState<UserAction | null>(null);
  const [actionPassword, setActionPassword] = useState('');
  const [actionPasswordConfirmation, setActionPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    window.workerAPI!.listUsers(token)
      .then(result => {
        if (active) setUsers(result);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  useEffect(() => {
    let active = true;
    const query = workerSearch.trim();
    if (query.length < 2) {
      setWorkerResults([]);
      setSearchingWorkers(false);
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      window.workerAPI!.listWorkers(token, { search: query, page: 1, pageSize, accountAvailable: true })
        .then((result: WorkerPage) => {
          if (active) {
            setWorkerResults(result.workers);
            setSearchingWorkers(false);
          }
        })
        .catch(reason => {
          if (active) {
            setSearchingWorkers(false);
            setError(reason instanceof Error ? reason.message : String(reason));
          }
        });
      setSearchingWorkers(true);
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, workerSearch]);

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWorker) {
      setError('اختر سجل المجند المرتبط بحساب المستخدم.');
      return;
    }
    if (temporaryPassword.length < 8 || temporaryPassword.length > 256) {
      setError('يجب أن تتكون كلمة المرور المؤقتة من 8 إلى 256 حرفاً.');
      return;
    }
    if (temporaryPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');
    try {
      await window.workerAPI!.createUser(token, selectedWorker.militaryNumber, temporaryPassword);
      setSelectedWorker(null);
      setWorkerSearch('');
      setWorkerResults([]);
      setSearchingWorkers(false);
      setTemporaryPassword('');
      setConfirmPassword('');
      setStatus('تم إنشاء حساب المسؤول وربطه بسجل العامل. يجب تغيير كلمة المرور عند أول دخول.');
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const runUserAction = async () => {
    if (!action) return;
    if (action.type === 'reset' && (
      actionPassword.length < 8
      || actionPassword.length > 256
      || actionPassword !== actionPasswordConfirmation
    )) {
      setError(actionPassword !== actionPasswordConfirmation
        ? 'كلمتا المرور غير متطابقتين.'
        : 'يجب أن تتكون كلمة المرور المؤقتة من 8 إلى 256 حرفاً.');
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (action.type === 'reset') {
        await window.workerAPI!.resetUserPassword(token, action.user.militaryNumber, actionPassword);
        setStatus(`تمت إعادة تعيين كلمة مرور ${action.user.fullName}. يجب تغييرها عند تسجيل الدخول التالي.`);
      } else {
        await window.workerAPI!.deleteUser(token, action.user.militaryNumber);
        setStatus(`تم إلغاء حساب الدخول لـ ${action.user.fullName}. بقي سجل العامل محفوظاً.`);
      }
      setAction(null);
      setActionPassword('');
      setActionPasswordConfirmation('');
      setRefreshKey(value => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const closeAction = () => {
    if (busy) return;
    setAction(null);
    setActionPassword('');
    setActionPasswordConfirmation('');
    setError('');
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 p-5 sm:p-7" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">إدارة المستخدمين</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          أنشئ حسابات للمسؤولين واربط كل حساب بسجل مجند. جميع الحسابات الحالية لها صلاحية مسؤول، ولا يحصل المجندون على دخول تلقائي.
        </p>
      </div>

      {status && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{status}</p>}
      {error && !action && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <form onSubmit={createUser} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-emerald-700" />
          <h3 className="font-bold text-slate-900">إنشاء حساب مسؤول وربطه بمجند</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label htmlFor="user-worker-search" className="block text-xs font-semibold text-slate-600">
              ابحث عن المجند بالرقم العسكري أو الاسم
            </label>
            <div className="relative mt-1.5">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="user-worker-search"
                value={selectedWorker ? `${selectedWorker.fullName} — ${selectedWorker.militaryNumber}` : workerSearch}
                onChange={event => {
                  setSelectedWorker(null);
                  setWorkerSearch(event.target.value);
                  setWorkerResults([]);
                  setSearchingWorkers(event.target.value.trim().length >= 2);
                  setError('');
                }}
                placeholder="اكتب حرفين على الأقل..."
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            {!selectedWorker && workerResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {workerResults.map(worker => (
                  <button
                    key={worker.militaryNumber}
                    type="button"
                    onClick={() => {
                      setSelectedWorker(worker);
                      setWorkerResults([]);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right hover:bg-emerald-50"
                  >
                    <span className="text-sm font-semibold text-slate-800">{worker.fullName}</span>
                    <span className="font-mono text-xs text-slate-500" dir="ltr">{worker.militaryNumber}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedWorker && (
              <button
                type="button"
                onClick={() => {
                  setSelectedWorker(null);
                  setWorkerSearch('');
                }}
                className="mt-1 text-xs font-semibold text-sky-700 hover:underline"
              >
                تغيير المجند
              </button>
            )}
            {!selectedWorker && searchingWorkers && workerResults.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">جارٍ البحث عن المجندين...</p>
            )}
            {!selectedWorker && !searchingWorkers && workerSearch.trim().length >= 2 && workerResults.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">لا توجد نتائج متاحة؛ تأكد أن المجند ليس مرتبطاً بحساب بالفعل.</p>
            )}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4" />
              الدور: مسؤول
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">وفق الإعداد الحالي، حسابات الدخول للمسؤولين فقط.</p>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            كلمة المرور المؤقتة
            <input
              type="password"
              minLength={8}
              maxLength={256}
              required
              autoComplete="new-password"
              value={temporaryPassword}
              onChange={event => setTemporaryPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
              dir="ltr"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            تأكيد كلمة المرور
            <input
              type="password"
              minLength={8}
              maxLength={256}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
              dir="ltr"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !selectedWorker}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {busy ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب مسؤول'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 p-4 text-sm font-semibold text-slate-700">
          <UserRound className="h-4 w-4 text-slate-400" />
          حسابات المستخدمين: {users.length.toLocaleString('ar-EG')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">الرقم العسكري</th>
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">الدور</th>
                <th className="px-4 py-3 font-semibold">حالة كلمة المرور</th>
                <th className="px-4 py-3 font-semibold">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.userId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{user.militaryNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {user.fullName}
                    {user.militaryNumber === currentMilitaryNumber && <span className="mr-2 text-xs font-normal text-slate-500">(حسابك)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      مسؤول
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {user.mustChangePassword ? 'يلزم التغيير عند الدخول التالي' : 'كلمة المرور مفعّلة'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || user.militaryNumber === currentMilitaryNumber}
                        onClick={() => {
                          setError('');
                          setAction({ type: 'reset', user });
                          setActionPassword('');
                          setActionPasswordConfirmation('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        تعيين كلمة مرور
                      </button>
                      <button
                        type="button"
                        disabled={busy || user.militaryNumber === currentMilitaryNumber}
                        onClick={() => {
                          setError('');
                          setAction({ type: 'delete', user });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        إلغاء الدخول
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">لا توجد حسابات مستخدمين.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={event => {
            event.preventDefault();
            void runUserAction();
          }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl" dir="rtl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  {action.type === 'reset' ? 'إعادة تعيين كلمة المرور' : 'إلغاء حساب المستخدم'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{action.user.fullName} — {action.user.militaryNumber}</p>
              </div>
              <button type="button" onClick={closeAction} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {action.type === 'reset' ? (
              <>
                <label className="block text-xs font-semibold text-slate-600">
                  كلمة المرور المؤقتة الجديدة
                  <input
                    type="password"
                    minLength={8}
                    maxLength={256}
                    required
                    autoComplete="new-password"
                    value={actionPassword}
                    onChange={event => setActionPassword(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    dir="ltr"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  تأكيد كلمة المرور
                  <input
                    type="password"
                    minLength={8}
                    maxLength={256}
                    required
                    autoComplete="new-password"
                    value={actionPasswordConfirmation}
                    onChange={event => setActionPasswordConfirmation(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-600"
                    dir="ltr"
                  />
                </label>
                <p className="text-xs text-slate-500">سيُطلب من المستخدم تغيير كلمة المرور عند الدخول التالي.</p>
              </>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                سيُلغى دخول هذا المستخدم فقط، وسيبقى سجل العامل محفوظاً. لا يمكن إلغاء حسابك الحالي.
              </p>
            )}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={closeAction} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                تراجع
              </button>
              <button
                type={action.type === 'reset' ? 'submit' : 'button'}
                disabled={busy}
                onClick={action.type === 'delete' ? () => void runUserAction() : undefined}
                className={`rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                  action.type === 'delete' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {busy ? 'جارٍ التنفيذ...' : action.type === 'reset' ? 'حفظ كلمة المرور' : 'تأكيد إلغاء الدخول'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
