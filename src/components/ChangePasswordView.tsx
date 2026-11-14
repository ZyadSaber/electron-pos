import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

interface ChangePasswordViewProps {
  onChange: (currentPassword: string, newPassword: string) => Promise<void>;
  error?: string | null;
}

export const ChangePasswordView: React.FC<ChangePasswordViewProps> = ({ onChange, error }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (newPassword.length < 8) {
      setFormError('يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('كلمتا المرور الجديدتان غير متطابقتين.');
      return;
    }

    setBusy(true);
    try {
      await onChange(currentPassword, newPassword);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-white shadow-2xl"
      >
        <div>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">تغيير كلمة المرور</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            لأمان الحساب، يجب تغيير كلمة المرور المؤقتة قبل متابعة استخدام التطبيق.
          </p>
        </div>

        <label className="block text-sm font-medium">
          كلمة المرور الحالية
          <input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left outline-none focus:border-emerald-400"
            dir="ltr"
          />
        </label>

        <label className="block text-sm font-medium">
          كلمة المرور الجديدة
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left outline-none focus:border-emerald-400"
            dir="ltr"
          />
        </label>

        <label className="block text-sm font-medium">
          تأكيد كلمة المرور الجديدة
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left outline-none focus:border-emerald-400"
            dir="ltr"
          />
        </label>

        {(formError || error) && <p role="alert" className="text-sm text-rose-300">{formError || error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {busy ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
        </button>
      </form>
    </main>
  );
};
