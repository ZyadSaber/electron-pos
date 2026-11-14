export interface Soldier {
  militaryNumber: string;
  rank: string;
  fullName: string;
  company: string;
  subLocation: string;
  nationalId: string;
  tripleNumber: string;
  joinDate: string;
  dischargeDate: string;
  enlistmentDate: string;
  governorate: string;
  district: string;
  religion: string;
  trainingCenter: string;
  weapon: string;
  phone?: string;
  monthlyStatus?: string;
  notes?: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Worker = Soldier;

export type SoldierDetails = Omit<
  Soldier,
  'isAdmin' | 'mustChangePassword' | 'createdAt' | 'updatedAt' | 'phone' | 'monthlyStatus' | 'notes'
>;

export type WorkerDetails = SoldierDetails;

export type WorkerBasicCategory =
  | 'company'
  | 'subLocation'
  | 'governorate'
  | 'trainingCenter'
  | 'rank'
  | 'weapon'
  | 'leaveType';

export interface WorkerBasicDefinition {
  category: WorkerBasicCategory;
  value: string;
  company?: string;
}

export interface PersonnelFields {
  militaryNumber: string;
  seniorityNumber: string;
  fullName: string;
  maritalStatus: string;
  maleChildren: number;
  femaleChildren: number;
  nationalId: string;
  company: string;
  subLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface Officer extends PersonnelFields {
  rank: string;
}

export type OfficerDraft = Omit<Officer, 'createdAt' | 'updatedAt'>;

export interface NonCommissionedOfficer extends PersonnelFields {
  degree: string;
}

export type NonCommissionedOfficerDraft = Omit<NonCommissionedOfficer, 'createdAt' | 'updatedAt'>;

export interface WorkerPage {
  workers: Soldier[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkerListFilters {
  militaryNumber?: string;
  fullName?: string;
  company?: string;
  subLocation?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
  dischargeDateFrom?: string;
  dischargeDateTo?: string;
  enlistmentDateFrom?: string;
  enlistmentDateTo?: string;
  governorate?: string;
  religion?: string;
}

export interface WorkerSession {
  token: string;
  worker: Soldier;
  mustChangePassword: boolean;
}

export interface UserAccount {
  userId: number;
  militaryNumber: string;
  fullName: string;
  role: 'admin';
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; militaryNumber: string; message: string }>;
}

export interface PersonnelImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; militaryNumber: string; message: string }>;
}

export interface WorkerLeave {
  id: number;
  workerId: string;
  fullName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: string;
  notes: string;
}

export interface WorkerLeaveDraft {
  id?: number;
  workerId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration?: string;
  notes: string;
}

export interface PersonnelLeaveRecord extends WorkerLeave {
  personType: PersonType;
  company: string;
  source: 'legacy' | 'history';
}

export interface PersonnelLeaveDraft {
  personType: PersonType;
  militaryNumber: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: string;
  notes: string;
}

export interface PersonnelLeaveFilters {
  personType?: PersonType;
  company?: string;
  fullName?: string;
  militaryNumber?: string;
}

export interface WorkerTransfer {
  id: number;
  workerId: string;
  fullName: string;
  effectiveDate: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
  notes: string;
}

export interface WorkerTransferDraft {
  workerId: string;
  effectiveDate: string;
  fromLocation?: string;
  toLocation: string;
  reason: string;
  notes: string;
}

export type PersonType = 'soldier' | 'officer' | 'nco';

export type PersonHistoryType =
  | 'punishment'
  | 'detention'
  | 'absence'
  | 'leave'
  | 'transfer'
  | 'struckOff'
  | 'dismissed'
  | 'medical';

export interface PersonHistory {
  id: number;
  personType: PersonType;
  militaryNumber: string;
  historyType: PersonHistoryType;
  eventDate: string;
  endDate: string;
  title: string;
  duration: string;
  reason: string;
  fromLocation: string;
  toLocation: string;
  location: string;
  notes: string;
  createdAt: string;
}

export type PersonHistoryDraft = Omit<PersonHistory, 'id' | 'createdAt'>;
