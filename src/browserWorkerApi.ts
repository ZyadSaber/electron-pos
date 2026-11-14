import type {
  NonCommissionedOfficerDraft,
  PersonnelLeaveDraft,
  PersonnelLeaveFilters,
  PersonnelLeaveRecord,
  PersonnelImportResult,
  OfficerDraft,
  PersonHistory,
  PersonHistoryDraft,
  PersonType,
  WorkerBasicCategory,
  WorkerSession,
} from './types';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const request = async <T>(
  path: string,
  token?: string,
  method: RequestMethod = 'GET',
  body?: unknown,
): Promise<T> => {
  const headers = new Headers();
  if (token) headers.set('X-Session-Token', token);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json() as { error?: string };
      message = payload.error || message;
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
};

const selectBackupFile = () => new Promise<File | null>(resolve => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
  input.addEventListener('cancel', () => resolve(null), { once: true });
  input.click();
});

export const createBrowserWorkerAPI = (): NonNullable<Window['workerAPI']> => ({
  getSetupState: () => request('/setup'),
  initializeAdmin: initialAdmin => request<WorkerSession>('/setup', undefined, 'POST', initialAdmin),
  login: credentials => request<WorkerSession>('/login', undefined, 'POST', credentials),
  logout: async token => {
    await request<{ success: boolean }>('/session', token, 'DELETE');
  },
  changePassword: (token, currentPassword, newPassword) =>
    request('/password', token, 'PUT', { currentPassword, newPassword }),
  listWorkers: (token, options) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (key !== 'accountAvailable' && value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    }
    if (options.accountAvailable) query.set('accountAvailable', 'true');
    return request(`/workers?${query}`, token);
  },
  getWorker: (token, militaryNumber) =>
    request(`/worker?${new URLSearchParams({ militaryNumber })}`, token),
  saveWorker: (token, worker, originalMilitaryNumber) =>
    request('/worker', token, 'PUT', { worker, originalMilitaryNumber }),
  importWorkers: (token, records) =>
    request('/workers/import', token, 'POST', { records }),
  listWorkerBasics: token => request('/worker-basics', token),
  saveWorkerBasic: async (token, category: WorkerBasicCategory, value: string, company?: string) => {
    await request('/worker-basics', token, 'POST', { category, value, company });
  },
  updateWorkerBasic: async (
    token,
    category: WorkerBasicCategory,
    originalValue: string,
    value: string,
    originalCompany?: string,
    company?: string,
  ) => {
    await request('/worker-basics', token, 'PUT', {
      category,
      originalValue,
      value,
      originalCompany,
      company,
    });
  },
  deleteWorkerBasic: async (token, category: WorkerBasicCategory, value: string, company?: string) => {
    await request('/worker-basics', token, 'DELETE', { category, value, company });
  },
  listOfficers: token => request('/officers', token),
  saveOfficer: async (token, record: OfficerDraft, originalMilitaryNumber?: string) => {
    await request('/officers', token, 'PUT', { record, originalMilitaryNumber });
  },
  deleteOfficer: async (token, militaryNumber: string) => {
    await request('/officers', token, 'DELETE', { militaryNumber });
  },
  importOfficers: (token, records) =>
    request<PersonnelImportResult>('/officers/import', token, 'POST', { records }),
  listNonCommissionedOfficers: token => request('/non-commissioned-officers', token),
  saveNonCommissionedOfficer: async (
    token,
    record: NonCommissionedOfficerDraft,
    originalMilitaryNumber?: string,
  ) => {
    await request('/non-commissioned-officers', token, 'PUT', { record, originalMilitaryNumber });
  },
  deleteNonCommissionedOfficer: async (token, militaryNumber: string) => {
    await request('/non-commissioned-officers', token, 'DELETE', { militaryNumber });
  },
  importNonCommissionedOfficers: (token, records) =>
    request<PersonnelImportResult>('/non-commissioned-officers/import', token, 'POST', { records }),
  listUsers: token => request('/users', token),
  createUser: (token, militaryNumber, temporaryPassword) =>
    request('/users', token, 'POST', { militaryNumber, temporaryPassword }),
  resetUserPassword: async (token, militaryNumber, temporaryPassword) => {
    await request(`/users/${encodeURIComponent(militaryNumber)}/password`, token, 'PUT', { temporaryPassword });
  },
  deleteUser: async (token, militaryNumber) => {
    await request(`/users/${encodeURIComponent(militaryNumber)}`, token, 'DELETE');
  },
  listLeaves: (token, workerId) => {
    const query = workerId ? `?${new URLSearchParams({ workerId })}` : '';
    return request(`/leaves${query}`, token);
  },
  saveLeave: async (token, record) => {
    await request<{ success: boolean }>('/leaves', token, 'POST', { record });
  },
  deleteLeave: (token, id) => request(`/leaves/${id}`, token, 'DELETE'),
  listPersonnelLeaves: (token, filters: PersonnelLeaveFilters = {}) => {
    const query = new URLSearchParams();
    if (filters.personType) query.set('personType', filters.personType);
    if (filters.company) query.set('company', filters.company);
    if (filters.fullName) query.set('fullName', filters.fullName);
    if (filters.militaryNumber) query.set('militaryNumber', filters.militaryNumber);
    return request<PersonnelLeaveRecord[]>(`/personnel-leaves?${query}`, token);
  },
  savePersonnelLeave: async (token, record: PersonnelLeaveDraft) => {
    await request<{ success: boolean }>('/personnel-leaves', token, 'POST', { record });
  },
  deletePersonnelLeave: (token, source: 'legacy' | 'history', id) =>
    request(`/personnel-leaves/${source}/${id}`, token, 'DELETE'),
  listTransfers: (token, workerId) => {
    const query = workerId ? `?${new URLSearchParams({ workerId })}` : '';
    return request(`/transfers${query}`, token);
  },
  saveTransfer: async (token, record) => {
    await request<{ success: boolean }>('/transfers', token, 'POST', { record });
  },
  deleteTransfer: (token, id) => request(`/transfers/${id}`, token, 'DELETE'),
  listPersonHistory: (token, personType: PersonType, militaryNumber) => {
    const query = new URLSearchParams({ personType, militaryNumber });
    return request<PersonHistory[]>(`/person-history?${query}`, token);
  },
  savePersonHistory: async (token, record: PersonHistoryDraft) => {
    await request<{ success: boolean }>('/person-history', token, 'POST', { record });
  },
  deletePersonHistory: (token, id) => request(`/person-history/${id}`, token, 'DELETE'),
  exportDatabase: async token => {
    const response = await fetch('/api/backup', {
      headers: { 'X-Session-Token': token },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = response.headers.get('Content-Disposition')
      ?.match(/filename="([^"]+)"/)?.[1] || 'soldiers_backup.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    return { success: true };
  },
  importDatabase: async token => {
    const file = await selectBackupFile();
    if (!file) return { success: false };
    return request('/backup', token, 'POST', { content: await file.text() });
  },
  isElectron: false,
  platform: navigator.platform || 'browser',
});
