import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';
import { WorkerDatabase } from '../electron/workerDatabase.js';

const confirmationFlag = '--confirm-full-reset';
const packagePath = fileURLToPath(new URL('../package.json', import.meta.url));
const packageName = JSON.parse(fs.readFileSync(packagePath, 'utf8')).name;
app.setName(packageName);
const hasInstanceLock = app.requestSingleInstanceLock();

if (!hasInstanceLock) {
  console.error('The application is running. Close it before cleaning the database.');
  app.quit();
} else {
  app.whenReady().then(() => {
    const databasePath = path.join(app.getPath('userData'), 'workers.sqlite');
    if (!fs.existsSync(databasePath)) {
      console.log(`No worker database was found at ${databasePath}; nothing was changed.`);
      app.quit();
      return;
    }

    if (!process.argv.includes(confirmationFlag)) {
      console.log('No changes were made.');
      console.log(`Database location: ${databasePath}`);
      console.log(`To back up and remove all soldiers, accounts, leaves, and transfers, run this script with ${confirmationFlag}.`);
      app.quit();
      return;
    }

    let database;
    try {
      database = new WorkerDatabase(databasePath);
      const backup = JSON.parse(database.exportBackupJSON());
      const backupDirectory = path.join(app.getPath('userData'), 'backups');
      fs.mkdirSync(backupDirectory, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDirectory, `soldiers-before-cleanup-${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });

      database.clearAllData();
      console.log(`Database reset complete. Backup saved to: ${backupPath}`);
      console.log('The next application launch will show the initial admin setup.');
      console.log('The backup contains password hashes; keep it private.');
    } catch (error) {
      console.error('Database cleanup failed; no data was intentionally deleted.', error);
      process.exitCode = 1;
    } finally {
      database?.close();
      app.quit();
    }
  });
}
