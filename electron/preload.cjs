const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workerAPI', {
  getSetupState: () => ipcRenderer.invoke('worker-setup-status'),
  initializeAdmin: initialAdmin => ipcRenderer.invoke('worker-initialize-admin', initialAdmin),
  login: credentials => ipcRenderer.invoke('worker-login', credentials),
  logout: token => ipcRenderer.invoke('worker-logout', token),
  changePassword: (token, currentPassword, newPassword) =>
    ipcRenderer.invoke('worker-change-password', token, currentPassword, newPassword),
  listWorkers: (token, options) => ipcRenderer.invoke('worker-list', token, options),
  getWorker: (token, workerId) => ipcRenderer.invoke('worker-get', token, workerId),
  saveWorker: (token, worker, originalWorkerId) =>
    ipcRenderer.invoke('worker-save', token, worker, originalWorkerId),
  importWorkers: (token, records) =>
    ipcRenderer.invoke('worker-import', token, records),
  listWorkerBasics: token => ipcRenderer.invoke('worker-basics-list', token),
  saveWorkerBasic: (token, category, value, company) =>
    ipcRenderer.invoke('worker-basics-save', token, category, value, company),
  updateWorkerBasic: (token, category, originalValue, value, originalCompany, company) =>
    ipcRenderer.invoke('worker-basics-update', token, category, originalValue, value, originalCompany, company),
  deleteWorkerBasic: (token, category, value, company) =>
    ipcRenderer.invoke('worker-basics-delete', token, category, value, company),
  listOfficers: token => ipcRenderer.invoke('officers-list', token),
  saveOfficer: (token, record, originalMilitaryNumber) =>
    ipcRenderer.invoke('officers-save', token, record, originalMilitaryNumber),
  deleteOfficer: (token, militaryNumber) =>
    ipcRenderer.invoke('officers-delete', token, militaryNumber),
  importOfficers: (token, records) =>
    ipcRenderer.invoke('officers-import', token, records),
  listNonCommissionedOfficers: token => ipcRenderer.invoke('ncos-list', token),
  saveNonCommissionedOfficer: (token, record, originalMilitaryNumber) =>
    ipcRenderer.invoke('ncos-save', token, record, originalMilitaryNumber),
  deleteNonCommissionedOfficer: (token, militaryNumber) =>
    ipcRenderer.invoke('ncos-delete', token, militaryNumber),
  importNonCommissionedOfficers: (token, records) =>
    ipcRenderer.invoke('ncos-import', token, records),
  listUsers: token => ipcRenderer.invoke('worker-users-list', token),
  createUser: (token, workerId, temporaryPassword) =>
    ipcRenderer.invoke('worker-user-create', token, workerId, temporaryPassword),
  resetUserPassword: (token, workerId, temporaryPassword) =>
    ipcRenderer.invoke('worker-user-reset-password', token, workerId, temporaryPassword),
  deleteUser: (token, workerId) => ipcRenderer.invoke('worker-user-delete', token, workerId),
  listLeaves: (token, workerId) => ipcRenderer.invoke('leave-list', token, workerId),
  saveLeave: (token, record) => ipcRenderer.invoke('leave-save', token, record),
  deleteLeave: (token, id) => ipcRenderer.invoke('leave-delete', token, id),
  listPersonnelLeaves: (token, filters) => ipcRenderer.invoke('personnel-leave-list', token, filters),
  savePersonnelLeave: (token, record) => ipcRenderer.invoke('personnel-leave-save', token, record),
  deletePersonnelLeave: (token, source, id) =>
    ipcRenderer.invoke('personnel-leave-delete', token, source, id),
  listTransfers: (token, workerId) => ipcRenderer.invoke('transfer-list', token, workerId),
  saveTransfer: (token, record) => ipcRenderer.invoke('transfer-save', token, record),
  deleteTransfer: (token, id) => ipcRenderer.invoke('transfer-delete', token, id),
  listPersonHistory: (token, personType, militaryNumber) =>
    ipcRenderer.invoke('person-history-list', token, personType, militaryNumber),
  savePersonHistory: (token, record) => ipcRenderer.invoke('person-history-save', token, record),
  deletePersonHistory: (token, id) => ipcRenderer.invoke('person-history-delete', token, id),
  exportDatabase: token => ipcRenderer.invoke('database-export', token),
  importDatabase: token => ipcRenderer.invoke('database-import', token),
  isElectron: true,
  platform: process.platform,
});
