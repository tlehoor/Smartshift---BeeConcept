import { ScheduleVersion, ShiftAssignment, Employee, ExplanationRequest } from '../types';
import { INITIAL_SHIFTS } from '../mock/data';

export const schedulerService = {
  checkReadiness: (
    employees: Employee[],
    explanations: ExplanationRequest[]
  ): {
    canRun: boolean;
    reason?: string;
    stats: {
      official: { count: number; total: number };
      probation: { count: number; total: number };
      workshop: { count: number; total: number };
      manager: { count: number; total: number };
    };
    pendingExplanationsCount: number;
  } => {
    const officials = employees.filter((e) => e.role === 'OFFICIAL_STAFF' && e.accountStatus === 'ACTIVE');
    const probations = employees.filter((e) => e.role === 'PROBATION_STAFF' && e.accountStatus === 'ACTIVE');
    const workshops = employees.filter((e) => e.role === 'WORKSHOP' && e.accountStatus === 'ACTIVE');
    const managers = employees.filter((e) => e.role === 'MANAGER' && e.accountStatus === 'ACTIVE');

    const officialDone = officials.filter((e) => e.registrationCompleted).length;
    const probationDone = probations.filter((e) => e.registrationCompleted).length;
    const workshopDone = workshops.filter((e) => e.registrationCompleted).length;
    const managerDone = managers.filter((e) => e.registrationCompleted).length;

    const pendingExplanations = explanations.filter((exp) => exp.status === 'PENDING');
    const pendingExplanationsCount = pendingExplanations.length;

    const allRegistered =
      officialDone === officials.length &&
      probationDone === probations.length &&
      workshopDone === workshops.length &&
      managerDone === managers.length;

    const canRun = allRegistered && pendingExplanationsCount === 0;

    let reason: string | undefined;
    if (!allRegistered) {
      reason = 'Vẫn còn nhân sự chưa hoàn tất đăng ký khả năng làm việc.';
    } else if (pendingExplanationsCount > 0) {
      reason = `Còn ${pendingExplanationsCount} giải trình đăng ký ca chưa được Admin phê duyệt.`;
    }

    return {
      canRun,
      reason,
      stats: {
        official: { count: officialDone, total: officials.length },
        probation: { count: probationDone, total: probations.length },
        workshop: { count: workshopDone, total: workshops.length },
        manager: { count: managerDone, total: managers.length },
      },
      pendingExplanationsCount,
    };
  },

  simulateRun: async (currentShifts: ShiftAssignment[]): Promise<ScheduleVersion> => {
    // Generate new version V3
    const newVersion: ScheduleVersion = {
      id: `ver-${Date.now()}`,
      version: 'V3',
      createdAt: 'Vừa xong',
      createdBy: 'Nguyễn Minh Anh (Quản lý)',
      status: 'DRAFT',
      shifts: [...currentShifts],
      notes: 'Phiên bản V3 tối ưu tự động từ thuật toán SmartShift. 96% thỏa mãn mục tiêu.',
      violationsCount: 1,
    };
    return newVersion;
  },
};
