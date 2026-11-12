/**
 * Electron Preload Script (ContextBridge IPC Bridge)
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  exportDatabaseFile: (dataString) => ipcRenderer.invoke('export-db-file', dataString),
  importDatabaseFile: () => ipcRenderer.invoke('import-db-file'),
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  verifyMasterKey: (masterKey) => ipcRenderer.invoke('verify-master-key', masterKey),
  isElectron: true,
  platform: process.platform,
});
