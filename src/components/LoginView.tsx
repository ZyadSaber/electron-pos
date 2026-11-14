import React, { useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';

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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-white shadow-2xl"
      >
        <div>
          <h1 className="text-2xl font-black">دخول المسؤولين</h1>
          <p className="mt-2 text-sm text-slate-400">سجّل الدخول باستخدام الرقم العسكري المرتبط بحساب المسؤول وكلمة المرور.</p>
        </div>

        {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

        <div>
          <label htmlFor="worker-login-id" className="mb-2 block text-sm font-medium">الرقم العسكري المرتبط بالحساب</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">
            <UserRound className="h-4 w-4 text-slate-500" />
            <input
              id="worker-login-id"
              required
              autoFocus
              autoComplete="username"
              value={militaryNumber}
              onChange={event => setMilitaryNumber(event.target.value)}
              className="w-full bg-transparent py-3.5 text-left text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="worker-login-password" className="mb-2 block text-sm font-medium">كلمة المرور</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <input
              id="worker-login-password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full bg-transparent py-3.5 text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>
    </main>
  );
};
