export type Role = 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';

export type ScheduleStatus = 'WAITING' | 'RUNNING' | 'DRAFT' | 'PUBLISHED';

export type AccountStatus = 'ACTIVE' | 'BAN';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type WorkloadStatus = 'OK' | 'WARNING' | 'OVERLOAD';

export type ShiftTimeIndex = 1 | 2 | 3 | 4;

export interface ShiftInfo {
  index: ShiftTimeIndex;
  label: string;
  timeRange: string;
}

export const SHIFT_DEFINITIONS: ShiftInfo[] = [
  { index: 1, label: 'Ca 1', timeRange: '09:00 – 12:00' },
  { index: 2, label: 'Ca 2', timeRange: '12:00 – 15:00' },
  { index: 3, label: 'Ca 3', timeRange: '15:00 – 18:00' },
  { index: 4, label: 'Ca 4', timeRange: '18:00 – 21:00' },
];

export const DAYS_OF_WEEK = [
  { day: 1, name: 'Thứ 2', shortName: 'T2', dateStr: '12/10' },
  { day: 2, name: 'Thứ 3', shortName: 'T3', dateStr: '13/10' },
  { day: 3, name: 'Thứ 4', shortName: 'T4', dateStr: '14/10' },
  { day: 4, name: 'Thứ 5', shortName: 'T5', dateStr: '15/10' },
  { day: 5, name: 'Thứ 6', shortName: 'T6', dateStr: '16/10' },
  { day: 6, name: 'Thứ 7', shortName: 'T7', dateStr: '17/10' },
  { day: 7, name: 'Chủ Nhật', shortName: 'CN', dateStr: '18/10' },
];

export interface Employee {
  id: string;
  name: string;
  phone: string;
  nickname?: string;
  email: string;
  role: Role;
  targetShifts: number;
  accountStatus: AccountStatus;
  avatar: string;
  availabilityCount: number;
  registrationCompleted: boolean;
  needsExplanation: boolean;
  explanationText?: string;
  explanationStatus?: ApprovalStatus;
  firstLogin?: boolean;
}

export interface ShiftAssignment {
  id: string; // e.g., 'd1-s1'
  dayOfWeek: number; // 1-7
  shiftIndex: ShiftTimeIndex; // 1-4
  assignedEmployeeIds: string[];
  isSpecialShift: boolean; // Special Shift (target 4/week: 2 Official + 1 Manager or probation fallback)
  specialShiftFallback?: boolean;
  requiredCount: number;
}

export interface ScheduleVersion {
  id: string;
  version: string; // e.g. "V1", "V2", "V3"
  createdAt: string;
  createdBy: string;
  status: ScheduleStatus;
  shifts: ShiftAssignment[];
  notes?: string;
  violationsCount: number;
  publishedAt?: string;
  publishedBy?: string;
}

export interface WorkloadItem {
  employeeId: string;
  target: number;
  planned: number;
  actual: number;
  status: WorkloadStatus;
  note?: string;
}

export interface ConstraintViolation {
  id: string;
  shiftId?: string;
  dayOfWeek?: number;
  shiftIndex?: ShiftTimeIndex;
  employeeId?: string;
  level: 'WARNING' | 'ERROR';
  title: string;
  message: string;
  fallbackUsed?: string;
}

export interface CandidateCover {
  employee: Employee;
  category: 'SUITABLE' | 'SUPPORT' | 'UNAVAILABLE';
  reason: string;
  currentWorkload: number;
  hasAvailability: boolean;
  hasConflict: boolean;
  dailyShiftsCount: number;
}

export interface CoverRequest {
  id: string;
  requesterId: string;
  shiftId: string;
  dayOfWeek: number;
  shiftIndex: ShiftTimeIndex;
  invitedCandidateIds: string[];
  acceptedByEmployeeId?: string;
  status: RequestStatus;
  createdAt: string;
  note?: string;
}

export interface SwapCandidate {
  employee: Employee;
  candidateShiftId: string;
  candidateDayOfWeek: number;
  candidateShiftIndex: ShiftTimeIndex;
  isEligible: boolean;
  checks: {
    noConflict: boolean;
    maxTwoPerDay: boolean;
    availabilityMatch: boolean;
  };
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterShiftId: string;
  targetEmployeeId: string;
  targetShiftId: string;
  status: RequestStatus;
  createdAt: string;
  note?: string;
}

export interface DebtRecord {
  id: string;
  debtorId: string; // người đang nợ
  creditorId: string; // người được nợ
  shiftsCount: number;
  relatedAction: string;
  createdAt: string;
  status: 'ACTIVE' | 'SETTLED';
  note?: string;
}

export interface ExplanationRequest {
  id: string;
  employeeId: string;
  availabilityCount: number;
  targetShifts: number;
  reason: string;
  submittedAt: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNote?: string;
}

export type AuditCategory =
  | 'SCHEDULER'
  | 'AVAILABILITY'
  | 'COVER'
  | 'SWAP'
  | 'DEBT'
  | 'EMPLOYEE'
  | 'APPROVAL'
  | 'SCHEDULE';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  category: AuditCategory;
  targetObject: string;
  detail: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
