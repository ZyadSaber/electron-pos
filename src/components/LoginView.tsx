import React, { useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck, Store, UserRound } from 'lucide-react';
import { Employee, ShopSettings } from '../types';
import { sqliteDB } from '../db/sqliteStorage';

interface LoginViewProps {
  settings: ShopSettings;
  onLogin: (employee: Employee) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ settings, onLogin }) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phone.replace(/\D/g, '').length < 7) {
      setError('أدخل رقم هاتف صحيحاً.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('أدخل رمز PIN المكوّن من 4 أرقام.');
      return;
    }

    const employee = sqliteDB.verifyEmployeeCredentials(phone, pin);
    if (!employee) {
      setError('رقم الهاتف أو رمز PIN غير صحيح.');
      setPin('');
      return;
    }

    onLogin(employee);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/50 via-slate-950 to-slate-950" />
      <div className="absolute -left-28 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-950 p-10 md:flex">
            <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute -bottom-12 -left-8 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold">{settings.shopName || 'سوبر ماركت النور'}</p>
                <p className="mt-0.5 text-xs text-emerald-100/75">نظام إدارة المتجر ونقطة البيع</p>
              </div>
            </div>

            <div className="relative max-w-md">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-emerald-50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                مساحة عملك، جاهزة للبدء
              </span>
              <h1 className="text-4xl font-black leading-[1.35] tracking-tight">
                كل تفاصيل متجرك
                <br />
                <span className="text-emerald-200">في مكان واحد.</span>
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-emerald-50/75">
                سجّل الدخول لمتابعة المبيعات والمخزون وإدارة عمليات متجرك بسهولة وأمان.
              </p>
            </div>

            <div className="relative flex items-center gap-2 text-xs text-emerald-50/70">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              بياناتك محفوظة محلياً على هذا الجهاز
            </div>
          </section>

          <section className="flex min-h-[590px] items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-sm">
              <div className="mb-8 flex items-center gap-3 md:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{settings.shopName || 'سوبر ماركت النور'}</p>
                  <p className="mt-0.5 text-xs text-slate-400">نظام إدارة المتجر ونقطة البيع</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                  <KeyRound className="h-6 w-6" />
                </div>
                <p className="mb-2 text-sm font-semibold text-emerald-300">مرحباً بعودتك</p>
                <h2 className="text-2xl font-bold tracking-tight">تسجيل الدخول</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  استخدم رقم هاتفك ورمز PIN للوصول إلى لوحة التحكم.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-phone" className="mb-2 block text-sm font-medium text-slate-200">
                    رقم الهاتف · اسم المستخدم
                  </label>
                  <div className={`flex items-center gap-3 rounded-xl border bg-slate-900/70 px-4 transition focus-within:ring-2 ${
                    error
                      ? 'border-rose-400/60 focus-within:ring-rose-500/20'
                      : 'border-slate-700 focus-within:border-emerald-400/60 focus-within:ring-emerald-500/20'
                  }`}>
                    <UserRound className={`h-4 w-4 shrink-0 ${error ? 'text-rose-300' : 'text-slate-500'}`} />
                    <input
                      id="login-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="username"
                      required
                      autoFocus
                      value={phone}
                      onChange={event => {
                        setPhone(event.target.value);
                        setError('');
                      }}
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      className="w-full bg-transparent py-3.5 text-left text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-pin" className="mb-2 block text-sm font-medium text-slate-200">
                    كلمة المرور · رمز PIN
                  </label>
                  <div className={`flex items-center gap-3 rounded-xl border bg-slate-900/70 px-4 transition focus-within:ring-2 ${
                    error
                      ? 'border-rose-400/60 focus-within:ring-rose-500/20'
                      : 'border-slate-700 focus-within:border-emerald-400/60 focus-within:ring-emerald-500/20'
                  }`}>
                    <LockKeyhole className={`h-4 w-4 shrink-0 ${error ? 'text-rose-300' : 'text-slate-500'}`} />
                    <input
                      id="login-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      required
                      value={pin}
                      onChange={event => {
                        setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
                        setError('');
                      }}
                      placeholder="••••"
                      dir="ltr"
                      aria-describedby={error ? 'login-error' : 'login-hint'}
                      className="w-full bg-transparent py-3.5 text-center font-mono text-lg tracking-[0.65em] text-white outline-none placeholder:text-slate-600"
                    />
                  </div>
                  {error ? (
                    <p id="login-error" role="alert" className="mt-2 text-xs text-rose-300">{error}</p>
                  ) : (
                    <p id="login-hint" className="mt-2 text-xs text-slate-500">يتكوّن الرمز من 4 أرقام</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  <span>دخول إلى النظام</span>
                  <span aria-hidden="true">←</span>
                </button>
              </form>

              <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                تسجيل دخول آمن · يعمل دون اتصال بالإنترنت
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
