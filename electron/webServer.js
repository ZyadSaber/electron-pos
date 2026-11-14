import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';

const isLoopbackOrigin = origin => {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

const createError = (status, message) => Object.assign(new Error(message), { status });

export const createWorkerWebServer = async ({
  database,
  host = '127.0.0.1',
  port = 3001,
  distPath,
}) => {
  const app = express();
  const sessions = new Map();
  const resolvedDistPath = distPath ? path.resolve(distPath) : '';
  const indexPath = resolvedDistPath ? path.join(resolvedDistPath, 'index.html') : '';

  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !isLoopbackOrigin(origin)) {
      res.status(403).json({ error: 'يُسمح بالاتصال من المتصفح المحلي فقط.' });
      return;
    }
    if (!origin && req.method !== 'GET') {
      res.status(403).json({ error: 'تعذر التحقق من مصدر الطلب.' });
      return;
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: '100mb' }));

  const route = operation => (req, res) => {
    try {
      res.json(operation(req));
    } catch (error) {
      const status = Number(error?.status) || 400;
      if (status >= 500) console.error('Browser API request failed:', error);
      res.status(status).json({
        error: error instanceof Error ? error.message : 'تعذر تنفيذ الطلب.',
      });
    }
  };

  const getSessionWorker = (req, { allowPasswordChange = false } = {}) => {
    const token = req.get('x-session-token');
    const userId = token && sessions.get(token);
    if (!userId) throw createError(401, 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');
    const worker = database.getSessionWorker(userId);
    if (!worker) {
      sessions.delete(token);
      throw createError(401, 'لم يعد حساب المستخدم متاحاً.');
    }
    if (worker.mustChangePassword && !allowPasswordChange) {
      throw createError(403, 'يجب تغيير كلمة المرور المؤقتة قبل متابعة استخدام التطبيق.');
    }
    return worker;
  };

  const requireAdmin = req => {
    const worker = getSessionWorker(req);
    if (!worker.isAdmin) throw createError(403, 'ليس لديك صلاحية تنفيذ هذا الإجراء.');
    return worker;
  };

  const createSession = ({ userId, worker, mustChangePassword }) => {
    const token = randomUUID();
    sessions.set(token, userId);
    return { token, worker, mustChangePassword };
  };

  app.get('/api/setup', route(() => database.getSetupState()));
  app.post('/api/setup', route(req => createSession(database.createInitialAdmin(req.body || {}))));
  app.post('/api/login', route(req => {
    const result = database.authenticate(req.body?.militaryNumber, req.body?.password);
    if (!result) throw createError(401, 'الرقم العسكري أو كلمة المرور غير صحيحة.');
    return createSession(result);
  }));
  app.delete('/api/session', route(req => {
    const token = req.get('x-session-token');
    if (token) sessions.delete(token);
    return { success: true };
  }));
  app.put('/api/password', route(req => {
    const worker = getSessionWorker(req, { allowPasswordChange: true });
    database.changePassword(sessions.get(req.get('x-session-token')), req.body?.currentPassword, req.body?.newPassword);
    return database.getWorker(worker.militaryNumber);
  }));
  app.get('/api/workers', route(req => {
    requireAdmin(req);
    return database.listWorkers({
      search: req.query.search,
      page: req.query.page,
      pageSize: req.query.pageSize,
      accountAvailable: req.query.accountAvailable === 'true',
      militaryNumber: req.query.militaryNumber,
      fullName: req.query.fullName,
      company: req.query.company,
      subLocation: req.query.subLocation,
      joinDateFrom: req.query.joinDateFrom,
      joinDateTo: req.query.joinDateTo,
      dischargeDateFrom: req.query.dischargeDateFrom,
      dischargeDateTo: req.query.dischargeDateTo,
      enlistmentDateFrom: req.query.enlistmentDateFrom,
      enlistmentDateTo: req.query.enlistmentDateTo,
      governorate: req.query.governorate,
      religion: req.query.religion,
    });
  }));
  app.get('/api/worker', route(req => {
    requireAdmin(req);
    return database.getWorker(req.query.militaryNumber);
  }));
  app.put('/api/worker', route(req => {
    requireAdmin(req);
    return database.saveWorker(req.body?.worker, req.body?.originalMilitaryNumber);
  }));
  app.post('/api/workers/import', route(req => {
    requireAdmin(req);
    return database.importWorkers(req.body?.records);
  }));
  app.get('/api/worker-basics', route(req => {
    requireAdmin(req);
    return database.listWorkerBasics();
  }));
  app.post('/api/worker-basics', route(req => {
    requireAdmin(req);
    const { category, value, company } = req.body || {};
    database.saveWorkerBasic(category, value, company);
    return { success: true };
  }));
  app.put('/api/worker-basics', route(req => {
    requireAdmin(req);
    const { category, originalValue, value, originalCompany, company } = req.body || {};
    database.updateWorkerBasic(category, originalValue, value, originalCompany, company);
    return { success: true };
  }));
  app.delete('/api/worker-basics', route(req => {
    requireAdmin(req);
    const { category, value, company } = req.body || {};
    database.deleteWorkerBasic(category, value, company);
    return { success: true };
  }));
  app.get('/api/officers', route(req => {
    requireAdmin(req);
    return database.listPersonnel('officers');
  }));
  app.put('/api/officers', route(req => {
    requireAdmin(req);
    database.savePersonnel('officers', req.body?.record, req.body?.originalMilitaryNumber);
    return { success: true };
  }));
  app.delete('/api/officers', route(req => {
    requireAdmin(req);
    database.deletePersonnel('officers', req.body?.militaryNumber);
    return { success: true };
  }));
  app.post('/api/officers/import', route(req => {
    requireAdmin(req);
    return database.importPersonnel('officers', req.body?.records);
  }));
  app.get('/api/non-commissioned-officers', route(req => {
    requireAdmin(req);
    return database.listPersonnel('ncos');
  }));
  app.put('/api/non-commissioned-officers', route(req => {
    requireAdmin(req);
    database.savePersonnel('ncos', req.body?.record, req.body?.originalMilitaryNumber);
    return { success: true };
  }));
  app.delete('/api/non-commissioned-officers', route(req => {
    requireAdmin(req);
    database.deletePersonnel('ncos', req.body?.militaryNumber);
    return { success: true };
  }));
  app.post('/api/non-commissioned-officers/import', route(req => {
    requireAdmin(req);
    return database.importPersonnel('ncos', req.body?.records);
  }));
  app.get('/api/users', route(req => {
    requireAdmin(req);
    return database.listUsers();
  }));
  app.post('/api/users', route(req => {
    requireAdmin(req);
    return database.createUser(req.body?.militaryNumber, req.body?.temporaryPassword);
  }));
  app.put('/api/users/:workerId/password', route(req => {
    requireAdmin(req);
    database.resetUserPassword(req.params.workerId, req.body?.temporaryPassword);
    return { success: true };
  }));
  app.delete('/api/users/:workerId', route(req => {
    requireAdmin(req);
    database.deleteUser(req.params.workerId);
    return { success: true };
  }));
  app.get('/api/leaves', route(req => {
    const currentWorker = getSessionWorker(req);
    return database.listLeaves(currentWorker.isAdmin ? req.query.workerId : currentWorker.militaryNumber);
  }));
  app.post('/api/leaves', route(req => {
    requireAdmin(req);
    database.saveLeave(req.body?.record || {});
    return { success: true };
  }));
  app.delete('/api/leaves/:id', route(req => {
    requireAdmin(req);
    return database.deleteLeave(req.params.id);
  }));
  app.get('/api/personnel-leaves', route(req => {
    const worker = getSessionWorker(req);
    return database.listPersonnelLeaves(
      worker.isAdmin
        ? {
          personType: req.query.personType,
          company: req.query.company,
          fullName: req.query.fullName,
          militaryNumber: req.query.militaryNumber,
        }
        : { personType: 'soldier', militaryNumber: worker.militaryNumber },
    );
  }));
  app.post('/api/personnel-leaves', route(req => {
    requireAdmin(req);
    database.savePersonnelLeave(req.body?.record || {});
    return { success: true };
  }));
  app.delete('/api/personnel-leaves/:source/:id', route(req => {
    requireAdmin(req);
    return database.deletePersonnelLeave(req.params.source, req.params.id);
  }));
  app.get('/api/transfers', route(req => {
    const currentWorker = getSessionWorker(req);
    return database.listTransfers(currentWorker.isAdmin ? req.query.workerId : currentWorker.militaryNumber);
  }));
  app.post('/api/transfers', route(req => {
    requireAdmin(req);
    database.saveTransfer(req.body?.record || {});
    return { success: true };
  }));
  app.delete('/api/transfers/:id', route(req => {
    requireAdmin(req);
    return database.deleteTransfer(req.params.id);
  }));
  app.get('/api/person-history', route(req => {
    requireAdmin(req);
    return database.listPersonHistory(req.query.personType, req.query.militaryNumber);
  }));
  app.post('/api/person-history', route(req => {
    requireAdmin(req);
    database.savePersonHistory(req.body?.record || {});
    return { success: true };
  }));
  app.delete('/api/person-history/:id', route(req => {
    requireAdmin(req);
    return database.deletePersonHistory(req.params.id);
  }));
  app.get('/api/backup', (req, res, next) => {
    try {
      requireAdmin(req);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="soldiers_backup_${new Date().toISOString().slice(0, 10)}.json"`,
      );
      res.type('application/json').send(database.exportBackupJSON());
    } catch (error) {
      next(error);
    }
  });
  app.post('/api/backup', route(req => {
    requireAdmin(req);
    const summary = database.importBackupJSON(String(req.body?.content ?? ''));
    sessions.clear();
    return { success: true, summary };
  }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'لم يتم العثور على هذا الإجراء.' }));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('Browser API middleware failed:', error);
    res.status(status).json({
      error: status >= 500 ? 'تعذر تنفيذ الطلب.' : error.message,
    });
  });

  if (distPath && fs.existsSync(indexPath)) {
    app.use(express.static(resolvedDistPath));
    app.get('*', (_req, res) => res.sendFile(indexPath));
  }

  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, host, () => {
      listener.removeListener('error', reject);
      resolve(listener);
    });
    listener.once('error', reject);
  });
  const actualPort = server.address()?.port ?? port;

  return {
    host,
    port: actualPort,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
};
