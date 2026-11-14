import type {
  Worker,
  WorkerBasicCategory,
  WorkerBasicDefinition,
  WorkerDetails,
  WorkerImportResult,
  WorkerLeave,
  WorkerLeaveDraft,
  WorkerListFilters,
  PersonnelLeaveRecord,
  PersonnelLeaveDraft,
  PersonnelLeaveFilters,
  WorkerPage,
  WorkerSession,
  WorkerTransfer,
  WorkerTransferDraft,
  UserAccount,
  Officer,
  OfficerDraft,
  NonCommissionedOfficer,
  NonCommissionedOfficerDraft,
  PersonnelImportResult,
  PersonHistory,
  PersonHistoryDraft,
  PersonType,
} from './types';

export {};

declare global {
  interface Window {
    workerAPI?: {
      getSetupState: () => Promise<{ setupRequired: boolean }>;
      initializeAdmin: (initialAdmin: {
        militaryNumber: string;
        fullName: string;
        password: string;
      }) => Promise<WorkerSession>;
      login: (credentials: { militaryNumber: string; password: string }) => Promise<WorkerSession>;
      logout: (token: string) => Promise<void>;
      changePassword: (
        token: string,
        currentPassword: string,
        newPassword: string,
      ) => Promise<Worker>;
      listWorkers: (
        token: string,
        options: { search?: string; page?: number; pageSize?: number; accountAvailable?: boolean } & WorkerListFilters,
      ) => Promise<WorkerPage>;
      getWorker: (token: string, militaryNumber: string) => Promise<Worker | null>;
      saveWorker: (
        token: string,
        worker: WorkerDetails,
        originalMilitaryNumber?: string,
      ) => Promise<Worker>;
      importWorkers: (
        token: string,
        records: WorkerDetails[],
      ) => Promise<WorkerImportResult>;
      listWorkerBasics: (token: string) => Promise<WorkerBasicDefinition[]>;
      saveWorkerBasic: (
        token: string,
        category: WorkerBasicCategory,
        value: string,
        company?: string,
      ) => Promise<void>;
      updateWorkerBasic: (
        token: string,
        category: WorkerBasicCategory,
        originalValue: string,
        value: string,
        originalCompany?: string,
        company?: string,
      ) => Promise<void>;
      deleteWorkerBasic: (
        token: string,
        category: WorkerBasicCategory,
        value: string,
        company?: string,
      ) => Promise<void>;
      listOfficers: (token: string) => Promise<Officer[]>;
      saveOfficer: (token: string, record: OfficerDraft, originalMilitaryNumber?: string) => Promise<void>;
      deleteOfficer: (token: string, militaryNumber: string) => Promise<void>;
      importOfficers: (token: string, records: OfficerDraft[]) => Promise<PersonnelImportResult>;
      listNonCommissionedOfficers: (token: string) => Promise<NonCommissionedOfficer[]>;
      saveNonCommissionedOfficer: (
        token: string,
        record: NonCommissionedOfficerDraft,
        originalMilitaryNumber?: string,
      ) => Promise<void>;
      deleteNonCommissionedOfficer: (token: string, militaryNumber: string) => Promise<void>;
      importNonCommissionedOfficers: (
        token: string,
        records: NonCommissionedOfficerDraft[],
      ) => Promise<PersonnelImportResult>;
      listUsers: (token: string) => Promise<UserAccount[]>;
      createUser: (token: string, militaryNumber: string, temporaryPassword: string) => Promise<UserAccount>;
      resetUserPassword: (token: string, militaryNumber: string, temporaryPassword: string) => Promise<void>;
      deleteUser: (token: string, militaryNumber: string) => Promise<void>;
      listLeaves: (token: string, workerId?: string) => Promise<WorkerLeave[]>;
      saveLeave: (token: string, record: WorkerLeaveDraft) => Promise<void>;
      deleteLeave: (token: string, id: number) => Promise<boolean>;
      listPersonnelLeaves: (
        token: string,
        filters?: PersonnelLeaveFilters,
      ) => Promise<PersonnelLeaveRecord[]>;
      savePersonnelLeave: (token: string, record: PersonnelLeaveDraft) => Promise<void>;
      deletePersonnelLeave: (token: string, source: 'legacy' | 'history', id: number) => Promise<boolean>;
      listTransfers: (token: string, workerId?: string) => Promise<WorkerTransfer[]>;
      saveTransfer: (token: string, record: WorkerTransferDraft) => Promise<void>;
      deleteTransfer: (token: string, id: number) => Promise<boolean>;
      listPersonHistory: (
        token: string,
        personType: PersonType,
        militaryNumber: string,
      ) => Promise<PersonHistory[]>;
      savePersonHistory: (token: string, record: PersonHistoryDraft) => Promise<void>;
      deletePersonHistory: (token: string, id: number) => Promise<boolean>;
      exportDatabase: (token: string) => Promise<{ success: boolean }>;
      importDatabase: (
        token: string,
      ) => Promise<{
        success: boolean;
        summary?: {
          soldiers: number;
          users: number;
          leaves: number;
          transfers: number;
          officers: number;
          nonCommissionedOfficers: number;
          historyRecords: number;
        };
      }>;
      isElectron: boolean;
      platform: string;
    };
  }
}
