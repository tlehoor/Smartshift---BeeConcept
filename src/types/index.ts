export type Role = 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';

export type ScheduleStatus = 'WAITING' | 'RUNNING' | 'DRAFT' | 'PUBLISHED';

export type AccountStatus = 'ACTIVE' | 'BAN';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ShiftTimeIndex = 1 | 2 | 3 | 4;

export type WorkloadStatus = 'OK' | 'DEFICIT' | 'SURPLUS' | 'OVERLOAD' | 'WARNING';

export type DebtStatus = 'ACTIVE' | 'SETTLED' | 'OFFSET';

export type ScheduleVersionStatus = 'WAITING' | 'DRAFT' | 'PUBLISHED' | 'REPLACED';

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
  needsExplanation?: boolean;
  explanationText?: string;
  explanationStatus?: ApprovalStatus;
}

export interface ShiftDefinition {
  index: ShiftTimeIndex;
  label: string;
  timeRange: string;
  standardRequiredCount: number;
  specialRequiredCount: number;
}

export const SHIFT_DEFINITIONS: ShiftDefinition[] = [
  {
    index: 1,
    label: 'Ca 1',
    timeRange: '09:00 - 12:00',
    standardRequiredCount: 2,
    specialRequiredCount: 3,
  },
  {
    index: 2,
    label: 'Ca 2',
    timeRange: '12:00 - 15:00',
    standardRequiredCount: 2,
    specialRequiredCount: 3,
  },
  {
    index: 3,
    label: 'Ca 3',
    timeRange: '15:00 - 18:00',
    standardRequiredCount: 2,
    specialRequiredCount: 3,
  },
  {
    index: 4,
    label: 'Ca 4',
    timeRange: '18:00 - 21:00',
    standardRequiredCount: 2,
    specialRequiredCount: 3,
  },
];

export interface DayOfWeekInfo {
  day: number; // 1 (Mon) - 7 (Sun)
  name: string;
  shortName: string;
  dateStr: string;
}

export const DAYS_OF_WEEK: DayOfWeekInfo[] = [
  { day: 1, name: 'Thứ Hai', shortName: 'T2', dateStr: '12/10' },
  { day: 2, name: 'Thứ Ba', shortName: 'T3', dateStr: '13/10' },
  { day: 3, name: 'Thứ Tư', shortName: 'T4', dateStr: '14/10' },
  { day: 4, name: 'Thứ Năm', shortName: 'T5', dateStr: '15/10' },
  { day: 5, name: 'Thứ Sáu', shortName: 'T6', dateStr: '16/10' },
  { day: 6, name: 'Thứ Bảy', shortName: 'T7', dateStr: '17/10' },
  { day: 7, name: 'Chủ Nhật', shortName: 'CN', dateStr: '18/10' },
];

export interface ShiftAssignment {
  id: string; // e.g. "d1-s1"
  dayOfWeek: number; // 1-7
  shiftIndex: ShiftTimeIndex; // 1-4
  isSpecialShift: boolean;
  requiredCount: number;
  assignedEmployeeIds: string[];
  specialShiftFallback?: boolean;
}

export interface ScheduleVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  status: ScheduleVersionStatus;
  shifts: ShiftAssignment[];
  notes?: string;
  violationsCount?: number;
  publishedAt?: string;
  publishedBy?: string;
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
  acceptedAt?: string;
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
  resolvedAt?: string;
  note?: string;
}

export interface DebtRecord {
  id: string;
  debtorId: string; // người đang nợ
  creditorId: string; // người được nợ
  shiftsCount: number;
  relatedAction: string;
  createdAt: string;
  settledAt?: string;
  status: DebtStatus;
  note?: string;
  offsetWithDebtId?: string; // ID của khoản nợ đối ứng khi cấn trừ
}

export interface ExplanationRequest {
  id: string;
  employeeId: string;
  availabilityCount: number;
  targetShifts: number;
  reason: string;
  submittedAt: string;
  status: ApprovalStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ConstraintViolation {
  id: string;
  shiftId?: string;
  employeeId?: string;
  dayOfWeek?: number;
  shiftIndex?: ShiftTimeIndex;
  level: 'ERROR' | 'WARNING';
  title: string;
  message: string;
  fallbackUsed?: string;
}

export interface WorkloadItem {
  employeeId: string;
  employeeName?: string;
  role?: Role;
  target: number;
  planned: number;
  actual: number;
  difference?: number;
  status: WorkloadStatus;
  note?: string;
}

export type AuditCategory =
  | 'AUTH'
  | 'SCHEDULE'
  | 'SCHEDULER'
  | 'COVER'
  | 'SWAP'
  | 'DEBT'
  | 'EMPLOYEE'
  | 'APPROVAL'
  | 'SYSTEM'
  | 'AVAILABILITY';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId?: string;
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
  type?: 'info' | 'success' | 'warning';
}
