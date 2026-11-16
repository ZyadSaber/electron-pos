import React, { useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react';

interface LoginViewProps {
  onLogin: (militaryNumber: string, password: string) => Promise<void>;
  error?: string | null;
  notice?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, error, notice }) => {
  const [militaryNumber, setMilitaryNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogin(militaryNumber.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8 sm:px-6 lg:py-12"
      dir="rtl"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-teal-100/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.3)]">
        <div className="grid lg:grid-cols-2">
          <section className="p-7 sm:p-10 lg:p-12">
            <div className="mb-9 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              بوابة دخول آمنة
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">مرحباً بعودتك</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                سجّل الدخول إلى حساب المسؤول لمتابعة بيانات الأفراد وسجلاتهم.
              </p>
            </div>

            {notice && (
              <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                {notice}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="worker-login-id" className="mb-2 block text-sm font-bold text-slate-700">
                  الرقم العسكري المرتبط بالحساب
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10">
                  <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="worker-login-id"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="أدخل الرقم العسكري"
                    value={militaryNumber}
                    onChange={event => setMilitaryNumber(event.target.value)}
                    className="min-w-0 w-full bg-transparent py-3.5 text-left text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="worker-login-password" className="mb-2 block text-sm font-bold text-slate-700">
                  كلمة المرور
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10">
                  <KeyRound className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    id="worker-login-password"
                    required
                    type="password"
                    autoComplete="current-password"
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="min-w-0 w-full bg-transparent py-3.5 text-left text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    dir="ltr"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </form>

            <p className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              الدخول مخصص للمستخدمين المصرح لهم
            </p>
          </section>

          <aside className="relative isolate flex min-h-[420px] flex-col overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-7 text-white sm:p-10 lg:p-12">
            <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
              <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-2xl" />
            </div>

            <header className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-emerald-200 shadow-inner">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-emerald-200">نظام إدارة شؤون الأفراد</p>
                <h2 className="mt-1 text-xl font-black leading-8 sm:text-2xl">منظومة افراد الفوج</h2>
              </div>
            </header>

            <div className="flex flex-1 items-center justify-center py-9">
              <div className="h-56 w-56 overflow-hidden rounded-full bg-white p-2 shadow-2xl shadow-emerald-950/30 sm:h-72 sm:w-72">
                <img
                  src="/logo.png"
                  alt="شعار منظومة افراد الفوج"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
            </div>

            <p className="border-t border-white/10 pt-5 text-xs leading-5 text-emerald-100/70">
              منصة موحدة لإدارة بيانات الأفراد ومتابعة سجلاتهم.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};
