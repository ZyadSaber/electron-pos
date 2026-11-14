import React, { useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';

interface FirstTimeSetupModalProps {
  onComplete: (militaryNumber: string, fullName: string, password: string) => Promise<void>;
  error?: string | null;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = ({ onComplete, error }) => {
  const [militaryNumber, setMilitaryNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setFormError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(militaryNumber.trim(), fullName.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-white shadow-2xl"
      >
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-300">الإعداد الأول</p>
          <h1 className="text-2xl font-black">إنشاء حساب المسؤول الأول</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            اربط حساب المسؤول بسجل مجند موجود أو أنشئ سجلاً جديداً. إذا كان المجند موجوداً، تبقى بياناته دون تغيير.
            ستُطلب منك كلمة مرور جديدة عند أول تسجيل دخول.
          </p>
        </div>

        <div>
          <label htmlFor="initial-worker-id" className="mb-2 block text-sm font-medium">الرقم العسكري المرتبط بالحساب</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">
            <UserRound className="h-4 w-4 text-slate-500" />
            <input
              id="initial-worker-id"
              required
              autoFocus
              autoComplete="username"
              value={militaryNumber}
              onChange={event => setMilitaryNumber(event.target.value)}
              className="w-full bg-transparent py-3 text-left text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="initial-worker-name" className="mb-2 block text-sm font-medium">
            اسم المجند (يُستخدم إذا لم يكن مسجلاً)
          </label>
          <input
            id="initial-worker-name"
            required
            autoComplete="name"
            value={fullName}
            onChange={event => setFullName(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label htmlFor="initial-worker-password" className="mb-2 block text-sm font-medium">كلمة مرور أولية</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <input
              id="initial-worker-password"
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full bg-transparent py-3 text-sm outline-none"
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="initial-worker-password-confirm" className="mb-2 block text-sm font-medium">تأكيد كلمة المرور</label>
          <input
            id="initial-worker-password-confirm"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-emerald-400"
            dir="ltr"
          />
        </div>

        {(formError || error) && (
          <p role="alert" className="text-sm text-rose-300">{formError || error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {isSubmitting ? 'جارٍ إنشاء حساب المسؤول...' : 'إنشاء حساب المسؤول'}
        </button>
      </form>
    </main>
  );
};
