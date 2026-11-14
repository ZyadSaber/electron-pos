import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { WorkerDatabase } from './workerDatabase.js';
import { createWorkerWebServer } from './webServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessions = new Map();

let mainWindow = null;
let workerDatabase = null;
let browserServer = null;
let browserServerClosing = false;
const browserServerMode = process.argv.includes('--browser-server');
const browserServerEnabled = browserServerMode || process.argv.includes('--serve-web');

const assertRenderer = event => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error('هذا الإجراء غير مسموح.');
  }
};

const createSession = ({ userId, worker, mustChangePassword }) => {
  const token = randomUUID();
  sessions.set(token, userId);
  return { token, worker, mustChangePassword };
};

const getSessionWorker = (event, token, { allowPasswordChange = false } = {}) => {
  assertRenderer(event);
  const userId = sessions.get(token);
  if (!userId) throw new Error('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');
  const worker = workerDatabase.getSessionWorker(userId);
  if (!worker) {
    sessions.delete(token);
    throw new Error('لم يعد حساب المستخدم متاحاً.');
  }
  if (worker.mustChangePassword && !allowPasswordChange) {
    throw new Error('يجب تغيير كلمة المرور المؤقتة قبل متابعة استخدام التطبيق.');
  }
  return worker;
};

const requireAdmin = (event, token) => {
  const worker = getSessionWorker(event, token);
  if (!worker.isAdmin) throw new Error('ليس لديك صلاحية تنفيذ هذا الإجراء.');
  return worker;
};

const createWindow = () => {
  const iconPath = path.join(__dirname, '../assets/icon.ico');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 680,
    title: 'نظام إدارة المجندين',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (!app.isPackaged && process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

ipcMain.handle('worker-setup-status', event => {
  assertRenderer(event);
  return workerDatabase.getSetupState();
});

ipcMain.handle('worker-initialize-admin', (event, initialAdmin) => {
  assertRenderer(event);
  return createSession(workerDatabase.createInitialAdmin(initialAdmin));
});

ipcMain.handle('worker-login', (event, credentials) => {
  assertRenderer(event);
  const result = workerDatabase.authenticate(credentials?.militaryNumber, credentials?.password);
  if (!result) throw new Error('الرقم العسكري أو كلمة المرور غير صحيحة.');
  return createSession(result);
});

ipcMain.handle('worker-logout', (event, token) => {
  assertRenderer(event);
  sessions.delete(token);
});

ipcMain.handle('worker-change-password', (event, token, currentPassword, newPassword) => {
  const worker = getSessionWorker(event, token, { allowPasswordChange: true });
  workerDatabase.changePassword(sessions.get(token), currentPassword, newPassword);
  return workerDatabase.getWorker(worker.militaryNumber);
});

ipcMain.handle('worker-list', (event, token, options) => {
  requireAdmin(event, token);
  return workerDatabase.listWorkers(options);
});

ipcMain.handle('worker-get', (event, token, workerId) => {
  requireAdmin(event, token);
  return workerDatabase.getWorker(workerId);
});

ipcMain.handle('worker-save', (event, token, worker, originalWorkerId) => {
  requireAdmin(event, token);
  return workerDatabase.saveWorker(worker, originalWorkerId);
});

ipcMain.handle('worker-import', (event, token, records) => {
  requireAdmin(event, token);
  return workerDatabase.importWorkers(records);
});

ipcMain.handle('worker-basics-list', (event, token) => {
  requireAdmin(event, token);
  return workerDatabase.listWorkerBasics();
});

ipcMain.handle('worker-basics-save', (event, token, category, value, company) => {
  requireAdmin(event, token);
  workerDatabase.saveWorkerBasic(category, value, company);
});

ipcMain.handle('worker-basics-update', (event, token, category, originalValue, value, originalCompany, company) => {
  requireAdmin(event, token);
  workerDatabase.updateWorkerBasic(category, originalValue, value, originalCompany, company);
});

ipcMain.handle('worker-basics-delete', (event, token, category, value, company) => {
  requireAdmin(event, token);
  workerDatabase.deleteWorkerBasic(category, value, company);
});

ipcMain.handle('officers-list', (event, token) => {
  requireAdmin(event, token);
  return workerDatabase.listPersonnel('officers');
});

ipcMain.handle('officers-save', (event, token, record, originalMilitaryNumber) => {
  requireAdmin(event, token);
  workerDatabase.savePersonnel('officers', record, originalMilitaryNumber);
});

ipcMain.handle('officers-delete', (event, token, militaryNumber) => {
  requireAdmin(event, token);
  workerDatabase.deletePersonnel('officers', militaryNumber);
});

ipcMain.handle('officers-import', (event, token, records) => {
  requireAdmin(event, token);
  return workerDatabase.importPersonnel('officers', records);
});

ipcMain.handle('ncos-list', (event, token) => {
  requireAdmin(event, token);
  return workerDatabase.listPersonnel('ncos');
});

ipcMain.handle('ncos-save', (event, token, record, originalMilitaryNumber) => {
  requireAdmin(event, token);
  workerDatabase.savePersonnel('ncos', record, originalMilitaryNumber);
});

ipcMain.handle('ncos-delete', (event, token, militaryNumber) => {
  requireAdmin(event, token);
  workerDatabase.deletePersonnel('ncos', militaryNumber);
});

ipcMain.handle('ncos-import', (event, token, records) => {
  requireAdmin(event, token);
  return workerDatabase.importPersonnel('ncos', records);
});

ipcMain.handle('worker-users-list', (event, token) => {
  requireAdmin(event, token);
  return workerDatabase.listUsers();
});

ipcMain.handle('worker-user-create', (event, token, workerId, temporaryPassword) => {
  requireAdmin(event, token);
  return workerDatabase.createUser(workerId, temporaryPassword);
});

ipcMain.handle('worker-user-reset-password', (event, token, workerId, temporaryPassword) => {
  requireAdmin(event, token);
  return workerDatabase.resetUserPassword(workerId, temporaryPassword);
});

ipcMain.handle('worker-user-delete', (event, token, workerId) => {
  requireAdmin(event, token);
  return workerDatabase.deleteUser(workerId);
});

ipcMain.handle('leave-list', (event, token, workerId) => {
  const currentWorker = getSessionWorker(event, token);
  return workerDatabase.listLeaves(currentWorker.isAdmin ? workerId : currentWorker.militaryNumber);
});

ipcMain.handle('leave-save', (event, token, record) => {
  requireAdmin(event, token);
  workerDatabase.saveLeave(record);
});

ipcMain.handle('leave-delete', (event, token, id) => {
  requireAdmin(event, token);
  return workerDatabase.deleteLeave(id);
});

ipcMain.handle('personnel-leave-list', (event, token, filters) => {
  const worker = getSessionWorker(event, token);
  return workerDatabase.listPersonnelLeaves(
    worker.isAdmin
      ? filters
      : { personType: 'soldier', militaryNumber: worker.militaryNumber },
  );
});

ipcMain.handle('personnel-leave-save', (event, token, record) => {
  requireAdmin(event, token);
  workerDatabase.savePersonnelLeave(record);
});

ipcMain.handle('personnel-leave-delete', (event, token, source, id) => {
  requireAdmin(event, token);
  return workerDatabase.deletePersonnelLeave(source, id);
});

ipcMain.handle('transfer-list', (event, token, workerId) => {
  const currentWorker = getSessionWorker(event, token);
  return workerDatabase.listTransfers(currentWorker.isAdmin ? workerId : currentWorker.militaryNumber);
});

ipcMain.handle('transfer-save', (event, token, record) => {
  requireAdmin(event, token);
  workerDatabase.saveTransfer(record);
});

ipcMain.handle('transfer-delete', (event, token, id) => {
  requireAdmin(event, token);
  return workerDatabase.deleteTransfer(id);
});

ipcMain.handle('person-history-list', (event, token, personType, militaryNumber) => {
  requireAdmin(event, token);
  return workerDatabase.listPersonHistory(personType, militaryNumber);
});

ipcMain.handle('person-history-save', (event, token, record) => {
  requireAdmin(event, token);
  workerDatabase.savePersonHistory(record);
});

ipcMain.handle('person-history-delete', (event, token, id) => {
  requireAdmin(event, token);
  return workerDatabase.deletePersonHistory(id);
});

ipcMain.handle('database-export', async (event, token) => {
  requireAdmin(event, token);
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'تصدير نسخة قاعدة البيانات',
    defaultPath: `soldiers_backup_${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'نسخة احتياطية JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, workerDatabase.exportBackupJSON(), 'utf8');
  return { success: true };
});

ipcMain.handle('database-import', async (event, token) => {
  requireAdmin(event, token);
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'استيراد نسخة قاعدة البيانات',
    properties: ['openFile'],
    filters: [{ name: 'نسخة احتياطية JSON', extensions: ['json'] }],
  });
  if (canceled || filePaths.length === 0) return { success: false };

  const summary = workerDatabase.importBackupJSON(fs.readFileSync(filePaths[0], 'utf8'));
  sessions.clear();
  return { success: true, summary };
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const databasePath = path.join(app.getPath('userData'), 'workers.sqlite');
    try {
      workerDatabase = new WorkerDatabase(databasePath);
      if (browserServerEnabled) {
        const port = Number(process.env.WORKER_API_PORT || 3001);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('WORKER_API_PORT must be a valid TCP port.');
        }
        browserServer = await createWorkerWebServer({
          database: workerDatabase,
          port,
          distPath: path.join(__dirname, '../dist'),
        });
        console.log(`Worker database server listening at http://127.0.0.1:${port}`);
      }
    } catch (error) {
      console.error('Worker database or web server initialization failed:', error);
      dialog.showErrorBox(
        'تعذر تشغيل قاعدة البيانات أو خادم المتصفح',
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
      return;
    }
    if (!browserServerMode) createWindow();

    app.on('activate', () => {
      if (!browserServerMode && BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', event => {
    if (browserServer && !browserServerClosing) {
      event.preventDefault();
      browserServerClosing = true;
      const server = browserServer;
      browserServer = null;
      void server.close()
        .then(() => {
          workerDatabase?.close();
          workerDatabase = null;
          app.quit();
        })
        .catch(error => {
          console.error('Worker web server shutdown failed:', error);
          workerDatabase?.close();
          workerDatabase = null;
          app.quit();
        });
      return;
    }
    workerDatabase?.close();
    workerDatabase = null;
  });
}
