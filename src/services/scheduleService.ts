import {
  ScheduleVersion,
  ShiftAssignment,
  WorkloadItem,
  ConstraintViolation,
  CandidateCover,
  SwapCandidate,
  Employee,
} from '../types';
import {
  INITIAL_SHIFTS,
  INITIAL_VERSIONS,
  INITIAL_CONSTRAINTS,
  INITIAL_EMPLOYEES,
} from '../mock/data';

export const scheduleService = {
  getWeeklyShifts: async (): Promise<ShiftAssignment[]> => {
    return Promise.resolve([...INITIAL_SHIFTS]);
  },

  getVersions: async (): Promise<ScheduleVersion[]> => {
    return Promise.resolve([...INITIAL_VERSIONS]);
  },

  getCurrentDraft: async (): Promise<ScheduleVersion> => {
    const draft = INITIAL_VERSIONS.find((v) => v.status === 'DRAFT') || INITIAL_VERSIONS[2];
    return Promise.resolve({ ...draft });
  },

  getPublishedSchedule: async (): Promise<ScheduleVersion | null> => {
    const published = INITIAL_VERSIONS.find((v) => v.status === 'PUBLISHED');
    return Promise.resolve(published ? { ...published } : null);
  },

  getWorkload: (shifts: ShiftAssignment[], employees: Employee[]): WorkloadItem[] => {
    const counts: Record<string, number> = {};
    employees.forEach((e) => (counts[e.id] = 0));

    shifts.forEach((shift) => {
      shift.assignedEmployeeIds.forEach((empId) => {
        counts[empId] = (counts[empId] || 0) + 1;
      });
    });

    return employees
      .filter((e) => e.role !== 'ADMIN')
      .map((e) => {
        const assigned = counts[e.id] || 0;
        let status: 'OK' | 'WARNING' | 'OVERLOAD' = 'OK';
        let note = '';

        if (assigned < e.targetShifts) {
          status = 'WARNING';
          note = `Thiếu ${e.targetShifts - assigned} ca so với mục tiêu`;
        } else if (assigned > e.targetShifts) {
          status = 'OVERLOAD';
          note = `Vượt mục tiêu ${assigned - e.targetShifts} ca`;
        }

        return {
          employeeId: e.id,
          employeeName: e.name,
          role: e.role,
          target: e.targetShifts,
          planned: assigned,
          actual: assigned,
          difference: assigned - e.targetShifts,
          status,
          note,
        };
      });
  },

  getConstraints: async (): Promise<ConstraintViolation[]> => {
    return Promise.resolve([...INITIAL_CONSTRAINTS]);
  },
};
