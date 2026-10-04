import {
  CoverRequest,
  CandidateCover,
  Employee,
  ShiftAssignment,
  ShiftTimeIndex,
} from '../types';
import { INITIAL_COVER_REQUESTS } from '../mock/data';

export const coverService = {
  getRequests: async (): Promise<CoverRequest[]> => {
    return Promise.resolve([...INITIAL_COVER_REQUESTS]);
  },

  getCandidatesForShift: (
    shift: ShiftAssignment,
    requesterId: string,
    allEmployees: Employee[],
    allShifts: ShiftAssignment[]
  ): {
    suitable: CandidateCover[];
    support: CandidateCover[];
    unavailable: CandidateCover[];
  } => {
    const suitable: CandidateCover[] = [];
    const support: CandidateCover[] = [];
    const unavailable: CandidateCover[] = [];

    // Count shifts per day for all employees
    const dailyCounts: Record<string, number> = {};
    const hasShiftInSlot: Record<string, boolean> = {};

    allShifts.forEach((s) => {
      s.assignedEmployeeIds.forEach((empId) => {
        if (s.dayOfWeek === shift.dayOfWeek) {
          dailyCounts[empId] = (dailyCounts[empId] || 0) + 1;
        }
        if (s.dayOfWeek === shift.dayOfWeek && s.shiftIndex === shift.shiftIndex) {
          hasShiftInSlot[empId] = true;
        }
      });
    });

    allEmployees
      .filter((e) => e.role !== 'ADMIN' && e.id !== requesterId && e.accountStatus === 'ACTIVE')
      .forEach((emp) => {
        const dayCount = dailyCounts[emp.id] || 0;
        const conflict = hasShiftInSlot[emp.id] || false;
        const exceedsDailyLimit = dayCount >= 2;

        if (conflict || exceedsDailyLimit) {
          const reason = conflict
            ? 'Đã có lịch làm việc trong ca này'
            : 'Đã đạt giới hạn tối đa 2 ca/ngày';
          unavailable.push({
            employee: emp,
            category: 'UNAVAILABLE',
            reason,
            currentWorkload: dayCount,
            hasAvailability: false,
            hasConflict: true,
            dailyShiftsCount: dayCount,
          });
        } else {
          // If employee is Official or Probation or Manager with availability
          const hasAvailability = emp.availabilityCount >= emp.targetShifts;
          if (hasAvailability) {
            suitable.push({
              employee: emp,
              category: 'SUITABLE',
              reason: 'Lịch trống, đáp ứng khả năng làm việc và không quá tải',
              currentWorkload: dayCount,
              hasAvailability: true,
              hasConflict: false,
              dailyShiftsCount: dayCount,
            });
          } else {
            support.push({
              employee: emp,
              category: 'SUPPORT',
              reason: 'Lịch trống trong khung giờ, chưa đăng ký ca này nhưng có thể mời nhận thêm',
              currentWorkload: dayCount,
              hasAvailability: false,
              hasConflict: false,
              dailyShiftsCount: dayCount,
            });
          }
        }
      });

    return { suitable, support, unavailable };
  },

  createRequest: async (
    requesterId: string,
    shift: ShiftAssignment,
    invitedCandidateIds: string[],
    note?: string
  ): Promise<CoverRequest> => {
    const newReq: CoverRequest = {
      id: `cov-${Date.now().toString().slice(-4)}`,
      requesterId,
      shiftId: shift.id,
      dayOfWeek: shift.dayOfWeek,
      shiftIndex: shift.shiftIndex,
      invitedCandidateIds,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      note,
    };
    return Promise.resolve(newReq);
  },
};
