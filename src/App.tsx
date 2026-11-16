import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { BackupRestoreView } from './components/BackupRestoreView';
import { ChangePasswordView } from './components/ChangePasswordView';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { LoginView } from './components/LoginView';
import { NavbarHeader, type AppTab } from './components/NavbarHeader';
import { WorkerHistoryView } from './components/WorkerHistoryView';
import { WorkerManagementView } from './components/WorkerManagementView';
import { WorkerProfileView } from './components/WorkerProfileView';
import { UserManagementView } from './components/UserManagementView';
import { WorkerBasicsView } from './components/WorkerBasicsView';
import { PersonnelManagementView } from './components/PersonnelManagementView';
import { AdminDashboardView } from './components/AdminDashboardView';
import type { WorkerSession } from './types';

type AppState = 'loading' | 'setup' | 'login' | 'authenticated' | 'unavailable';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!window.workerAPI) {
      setAppState('unavailable');
      return;
    }

    window.workerAPI.getSetupState()
      .then(result => setAppState(result.setupRequired ? 'setup' : 'login'))
      .catch(reason => {
        setError(reason instanceof Error ? reason.message : String(reason));
        setAppState('unavailable');
      });
  }, []);

  const initializeAdmin = async (militaryNumber: string, fullName: string, password: string) => {
    setError('');
    setNotice('');
    try {
      const newSession = await window.workerAPI!.initializeAdmin({ militaryNumber, fullName, password });
      setSession(newSession);
      setActiveTab('dashboard');
      setAppState('authenticated');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const login = async (militaryNumber: string, password: string) => {
    setError('');
    setNotice('');
    try {
      const newSession = await window.workerAPI!.login({ militaryNumber, password });
      setSession(newSession);
      setActiveTab(newSession.worker.isAdmin ? 'dashboard' : 'profile');
      setAppState('authenticated');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) return;
    setError('');
    try {
      const worker = await window.workerAPI!.changePassword(
        session.token,
        currentPassword,
        newPassword,
      );
      setSession({ ...session, worker, mustChangePassword: false });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const logout = async () => {
    if (session) {
      try {
        await window.workerAPI?.logout(session.token);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    }
    setSession(null);
    setAppState('login');
  };

  const handleDatabaseRestored = (summary: {
    soldiers: number;
    users: number;
    leaves: number;
    transfers: number;
    officers: number;
    nonCommissionedOfficers: number;
    historyRecords: number;
  }) => {
    setSession(null);
    setError('');
    setNotice(
      `تمت استعادة ${summary.soldiers} مجند و${summary.officers} ضابط و${summary.nonCommissionedOfficers} ضابط صف و${summary.users} حساب مسؤول و${summary.leaves} سجل إجازة و${summary.transfers} سجل نقل و${summary.historyRecords} سجل تاريخ إضافي. سجّل الدخول مجدداً.`,
    );
    setAppState('login');
  };

  if (appState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white" dir="rtl">
        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-400" />
      </main>
    );
  }

  if (appState === 'unavailable') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white" dir="rtl">
        <div className="max-w-lg rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-300" />
          <h1 className="font-bold">تعذر الاتصال بقاعدة البيانات</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {window.workerAPI?.isElectron
              ? 'إذا استمرت المشكلة، أغلق التطبيق وتحقق من سلامة ملف قاعدة البيانات.'
              : 'شغّل تطبيق Electron أو خادم المتصفح المحلي، ثم أعد تحميل الصفحة. يجب تشغيل الواجهة على الجهاز نفسه.'}
          </p>
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>
      </main>
    );
  }

  if (appState === 'setup') {
    return <FirstTimeSetupModal onComplete={initializeAdmin} error={error} />;
  }

  if (appState === 'login' || !session) {
    return <LoginView onLogin={login} error={error} notice={notice} />;
  }

  if (session.mustChangePassword) {
    return <ChangePasswordView onChange={changePassword} error={error} />;
  }

  const worker = session.worker;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 text-slate-800 antialiased" dir="rtl">
      <NavbarHeader
        worker={worker}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onLogout={() => void logout()}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {worker.isAdmin ? (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboardView token={session.token} />
            )}
            {activeTab === 'workers' && (
              <WorkerManagementView token={session.token} />
            )}
            {activeTab === 'basics' && (
              <WorkerBasicsView token={session.token} />
            )}
            {activeTab === 'officers' && (
              <PersonnelManagementView token={session.token} kind="officers" />
            )}
            {activeTab === 'ncos' && (
              <PersonnelManagementView token={session.token} kind="ncos" />
            )}
            {activeTab === 'users' && (
              <UserManagementView token={session.token} currentMilitaryNumber={worker.militaryNumber} />
            )}
            {activeTab === 'leaves' && (
              <WorkerHistoryView mode="leaves" token={session.token} worker={worker} />
            )}
            {activeTab === 'transfers' && (
              <WorkerHistoryView mode="transfers" token={session.token} worker={worker} />
            )}
            {activeTab === 'backup' && (
              <BackupRestoreView token={session.token} onRestored={handleDatabaseRestored} />
            )}
          </>
        ) : (
          <>
            <WorkerProfileView worker={worker} />
            <WorkerHistoryView mode="leaves" token={session.token} worker={worker} />
            <WorkerHistoryView mode="transfers" token={session.token} worker={worker} />
          </>
        )}
      </main>
    </div>
  );
}
