import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Employee,
  Role,
  ScheduleVersion,
  ShiftAssignment,
  CoverRequest,
  SwapRequest,
  DebtRecord,
  ExplanationRequest,
  AuditLogItem,
  NotificationItem,
  ScheduleStatus,
  WorkloadItem,
} from '../types';
import {
  CURRENT_USER,
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_VERSIONS,
  INITIAL_COVER_REQUESTS,
  INITIAL_SWAP_REQUESTS,
  INITIAL_DEBTS,
  INITIAL_EXPLANATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../mock/data';
import { translations, Language } from '../i18n';
import { scheduleService } from '../services/scheduleService';
import { debtService } from '../services/debtService';
import { auditService } from '../services/auditService';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextType {
  // Localization & Auth
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.vi;
  currentUser: Employee;
  setCurrentUser: (emp: Employee) => void;
  switchRole: (role: Role) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;

  // Schedules & Versions
  shifts: ShiftAssignment[];
  setShifts: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>;
  versions: ScheduleVersion[];
  scheduleStatus: ScheduleStatus;
  currentVersion: ScheduleVersion;
  runSchedulerSim: () => Promise<ScheduleVersion>;
  publishSchedule: () => void;
  reopenDraft: () => void;
  updateShiftEmployees: (shiftId: string, employeeIds: string[]) => void;

  // Employees & Roles
  employees: Employee[];
  updateEmployee: (emp: Employee) => void;
  toggleLockAccount: (empId: string) => void;

  // Coordination: Cover, Swap, Debt
  coverRequests: CoverRequest[];
  createCoverRequest: (shiftId: string, invitedIds: string[], note?: string) => void;
  acceptCoverRequest: (requestId: string, acceptorId: string) => void;
  cancelCoverRequest: (requestId: string) => void;

  swapRequests: SwapRequest[];
  createSwapRequest: (
    myShiftId: string,
    targetEmpId: string,
    targetShiftId: string,
    note?: string
  ) => void;
  acceptSwapRequest: (requestId: string) => void;
  rejectSwapRequest: (requestId: string) => void;

  debts: DebtRecord[];
  settleDebt: (debtId: string) => void;

  // Approvals (Explanations)
  explanations: ExplanationRequest[];
  approveExplanation: (id: string, note?: string) => void;
  rejectExplanation: (id: string, note?: string) => void;

  // Audit Logs & Notifications
  auditLogs: AuditLogItem[];
  addAuditLog: (
    action: string,
    category: any,
    targetObject: string,
    detail: string,
    result?: 'SUCCESS' | 'WARNING' | 'FAILED'
  ) => void;
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;

  // Workload helper
  workload: WorkloadItem[];

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('vi');
  const [currentUser, setCurrentUser] = useState<Employee>(CURRENT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<ShiftAssignment[]>(INITIAL_SHIFTS);
  const [versions, setVersions] = useState<ScheduleVersion[]>(INITIAL_VERSIONS);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('DRAFT');

  const [coverRequests, setCoverRequests] = useState<CoverRequest[]>(INITIAL_COVER_REQUESTS);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(INITIAL_SWAP_REQUESTS);
  const [debts, setDebts] = useState<DebtRecord[]>(INITIAL_DEBTS);
  const [explanations, setExplanations] = useState<ExplanationRequest[]>(INITIAL_EXPLANATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const t = translations[language];

  // Toast functions
  const showToast = (
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAuditLog = (
    action: string,
    category: any,
    targetObject: string,
    detail: string,
    result: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
  ) => {
    const newLog = auditService.createLog(
      currentUser.name,
      action,
      category,
      targetObject,
      detail,
      result
    );
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Role Switcher for Demo
  const switchRole = (newRole: Role) => {
    const matching = employees.find((e) => e.role === newRole) || currentUser;
    setCurrentUser({ ...matching, role: newRole });
    showToast(`Đã chuyển sang vai trò: ${t.roles[newRole]} (${matching.name})`, 'info');
  };

  // Current Version
  const currentVersion =
    versions.find((v) => v.version === 'V3') || versions[versions.length - 1];

  // Workload calculations
  const workload = scheduleService.getWorkload(shifts, employees);

  // Scheduler execution
  const runSchedulerSim = async (): Promise<ScheduleVersion> => {
    const newVersion: ScheduleVersion = {
      id: `ver-${Date.now()}`,
      version: 'V3',
      createdAt: new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdBy: `${currentUser.name} (${t.roles[currentUser.role]})`,
      status: 'DRAFT',
      shifts: [...shifts],
      notes: 'Phiên bản V3 tối ưu tự động từ thuật toán SmartShift. 96% thỏa mãn mục tiêu.',
      violationsCount: 1,
    };

    setVersions((prev) => [...prev.filter((v) => v.version !== 'V3'), newVersion]);
    setScheduleStatus('DRAFT');

    addAuditLog(
      'Chạy phân ca tự động',
      'SCHEDULER',
      'Lịch phân ca V3',
      'Tạo phiên bản lịch nháp V3 thành công với 28 ca làm việc.'
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Tự động phân ca hoàn tất',
        message: 'Phiên bản lịch nháp V3 đã được khởi tạo thành công.',
        timestamp: 'Vừa xong',
        read: false,
        link: '/scheduler/draft',
        type: 'success',
      },
      ...prev,
    ]);

    return newVersion;
  };

  const publishSchedule = () => {
    setScheduleStatus('PUBLISHED');
    setVersions((prev) =>
      prev.map((v) =>
        v.version === 'V3'
          ? {
              ...v,
              status: 'PUBLISHED',
              publishedAt: new Date().toLocaleString('vi-VN'),
              publishedBy: currentUser.name,
            }
          : v
      )
    );

    addAuditLog(
      'Công bố lịch làm việc',
      'SCHEDULE',
      'Lịch tuần 41 (V3)',
      `Công bố lịch làm việc chính thức bởi ${currentUser.name}.`
    );

    showToast('Lịch làm việc đã được công bố chính thức thành công!', 'success');
  };

  const reopenDraft = () => {
    setScheduleStatus('DRAFT');
    setVersions((prev) =>
      prev.map((v) => (v.version === 'V3' ? { ...v, status: 'DRAFT' } : v))
    );

    addAuditLog(
      'Mở lại bản nháp',
      'SCHEDULE',
      'Lịch tuần 41 (V3)',
      `Chuyển trạng thái lịch từ Đã công bố về Bản nháp để điều chỉnh.`
    );

    showToast('Lịch đã được chuyển về trạng thái Bản nháp để chỉnh sửa.', 'info');
  };

  const updateShiftEmployees = (shiftId: string, employeeIds: string[]) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, assignedEmployeeIds: employeeIds } : s))
    );
    showToast('Đã cập nhật danh sách nhân sự cho ca làm việc.', 'success');
  };

  // Employee update
  const updateEmployee = (emp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
    if (currentUser.id === emp.id) {
      setCurrentUser(emp);
    }
    showToast(`Đã cập nhật thông tin nhân viên ${emp.name}`, 'success');
  };

  const toggleLockAccount = (empId: string) => {
    const target = employees.find((e) => e.id === empId);
    if (!target) return;
    const newStatus = target.accountStatus === 'ACTIVE' ? 'BAN' : 'ACTIVE';
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, accountStatus: newStatus } : e))
    );
    addAuditLog(
      newStatus === 'BAN' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      'EMPLOYEE',
      target.name,
      `Chuyển trạng thái tài khoản thành ${newStatus === 'BAN' ? 'Bị khóa' : 'Đang hoạt động'}.`
    );
    showToast(
      `${newStatus === 'BAN' ? 'Đã khóa' : 'Đã mở khóa'} tài khoản của ${target.name}`,
      'warning'
    );
  };

  // Cover request actions
  const createCoverRequest = (shiftId: string, invitedIds: string[], note?: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const newReq: CoverRequest = {
      id: `cov-${Date.now().toString().slice(-4)}`,
      requesterId: currentUser.id,
      shiftId: shift.id,
      dayOfWeek: shift.dayOfWeek,
      shiftIndex: shift.shiftIndex,
      invitedCandidateIds: invitedIds,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      note: note || 'Nhờ đồng nghiệp hỗ trợ nhận ca.',
    };

    setCoverRequests((prev) => [newReq, ...prev]);
    addAuditLog(
      'Tạo yêu cầu nhờ nhận ca',
      'COVER',
      `Ca ${shift.shiftIndex} ngày Thứ ${shift.dayOfWeek + 1 === 8 ? 'CN' : shift.dayOfWeek + 1}`,
      `Gửi yêu cầu tới ${invitedIds.length} nhân viên hỗ trợ.`
    );
    showToast('Yêu cầu nhờ nhận ca đã được gửi thành công!', 'success');
  };

  const acceptCoverRequest = (requestId: string, acceptorId: string) => {
    const req = coverRequests.find((r) => r.id === requestId);
    if (!req) return;

    const acceptor = employees.find((e) => e.id === acceptorId);
    const requester = employees.find((e) => e.id === req.requesterId);

    // 1. Update Cover Request status
    setCoverRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: 'COMPLETED', acceptedByEmployeeId: acceptorId }
          : r
      )
    );

    // 2. Update Shift assignment: replace requester with acceptor
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === req.shiftId) {
          const updated = s.assignedEmployeeIds.map((id) =>
            id === req.requesterId ? acceptorId : id
          );
          if (!updated.includes(acceptorId)) {
            updated.push(acceptorId);
          }
          return { ...s, assignedEmployeeIds: updated };
        }
        return s;
      })
    );

    // 3. Create Debt: Requester owes Acceptor 1 shift!
    const newDebt: DebtRecord = debtService.createDebtFromCover(
      req.requesterId,
      acceptorId,
      `Nhờ nhận ca #${requestId}`
    );
    setDebts((prev) => [newDebt, ...prev]);

    // 4. Audit Log
    addAuditLog(
      'Chấp nhận nhận ca',
      'COVER',
      `Yêu cầu #${requestId}`,
      `${acceptor?.name || 'Nhân viên'} nhận ca thay cho ${requester?.name || 'đồng nghiệp'}. Tạo 1 công nợ ca.`
    );

    showToast(
      `${acceptor?.name || 'Đồng nghiệp'} đã nhận ca thành công! Đã cập nhật lịch và ghi nhận công nợ.`,
      'success'
    );
  };

  const cancelCoverRequest = (requestId: string) => {
    setCoverRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED' } : r))
    );
    showToast('Đã hủy yêu cầu nhờ nhận ca.', 'info');
  };

  // Swap request actions
  const createSwapRequest = (
    myShiftId: string,
    targetEmpId: string,
    targetShiftId: string,
    note?: string
  ) => {
    const newSwap: SwapRequest = {
      id: `swap-${Date.now().toString().slice(-4)}`,
      requesterId: currentUser.id,
      requesterShiftId: myShiftId,
      targetEmployeeId: targetEmpId,
      targetShiftId: targetShiftId,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      note: note || 'Đề nghị đổi ca làm việc',
    };

    setSwapRequests((prev) => [newSwap, ...prev]);
    addAuditLog(
      'Tạo yêu cầu đổi ca',
      'SWAP',
      `Yêu cầu #${newSwap.id}`,
      `Gửi yêu cầu hoán đổi ca cho nhân viên ${employees.find((e) => e.id === targetEmpId)?.name}.`
    );
    showToast('Yêu cầu đổi ca đã được gửi thành công!', 'success');
  };

  const acceptSwapRequest = (requestId: string) => {
    const swap = swapRequests.find((s) => s.id === requestId);
    if (!swap) return;

    // 1. Update status
    setSwapRequests((prev) =>
      prev.map((s) => (s.id === requestId ? { ...s, status: 'ACCEPTED' } : s))
    );

    // 2. Swap employee assignments in the 2 shifts
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === swap.requesterShiftId) {
          return {
            ...s,
            assignedEmployeeIds: s.assignedEmployeeIds.map((id) =>
              id === swap.requesterId ? swap.targetEmployeeId : id
            ),
          };
        }
        if (s.id === swap.targetShiftId) {
          return {
            ...s,
            assignedEmployeeIds: s.assignedEmployeeIds.map((id) =>
              id === swap.targetEmployeeId ? swap.requesterId : id
            ),
          };
        }
        return s;
      })
    );

    addAuditLog(
      'Chấp thuận đổi ca',
      'SWAP',
      `Yêu cầu #${swap.id}`,
      'Hoán đổi ca thành công giữa 2 nhân sự. Không phát sinh công nợ.'
    );

    showToast('Đổi ca thành công! Lịch phân ca đã được cập nhật.', 'success');
  };

  const rejectSwapRequest = (requestId: string) => {
    setSwapRequests((prev) =>
      prev.map((s) => (s.id === requestId ? { ...s, status: 'REJECTED' } : s))
    );
    showToast('Đã từ chối yêu cầu đổi ca.', 'info');
  };

  // Settle Debt
  const settleDebt = (debtId: string) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, status: 'SETTLED' } : d))
    );
    addAuditLog('Hoàn trả công nợ ca', 'DEBT', `Khoản nợ #${debtId}`, 'Ghi nhận hoàn trả 1 ca nợ thành công.');
    showToast('Đã ghi nhận thanh toán công nợ ca.', 'success');
  };

  // Approvals
  const approveExplanation = (id: string, note?: string) => {
    setExplanations((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              status: 'APPROVED',
              reviewedBy: currentUser.name,
              reviewedAt: 'Vừa xong',
              adminNote: note || 'Đã chấp thuận giải trình.',
            }
          : exp
      )
    );
    const exp = explanations.find((e) => e.id === id);
    if (exp) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === exp.employeeId ? { ...emp, explanationStatus: 'APPROVED' } : emp
        )
      );
    }
    addAuditLog(
      'Phê duyệt giải trình',
      'APPROVAL',
      `Giải trình #${id}`,
      `Phê duyệt đơn đăng ký ca thấp hơn định mức.`
    );
    showToast('Đã phê duyệt giải trình! Scheduler đã sẵn sàng chạy.', 'success');
  };

  const rejectExplanation = (id: string, note?: string) => {
    setExplanations((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              status: 'REJECTED',
              reviewedBy: currentUser.name,
              reviewedAt: 'Vừa xong',
              adminNote: note || 'Không chấp thuận giải trình.',
            }
          : exp
      )
    );
    const exp = explanations.find((e) => e.id === id);
    if (exp) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === exp.employeeId ? { ...emp, explanationStatus: 'REJECTED' } : emp
        )
      );
    }
    addAuditLog(
      'Từ chối giải trình',
      'APPROVAL',
      `Giải trình #${id}`,
      `Từ chối đơn giải trình đăng ký ca.`
    );
    showToast('Đã từ chối đơn giải trình.', 'warning');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentUser,
        setCurrentUser,
        switchRole,
        isAuthenticated,
        setIsAuthenticated,
        shifts,
        setShifts,
        versions,
        scheduleStatus,
        currentVersion,
        runSchedulerSim,
        publishSchedule,
        reopenDraft,
        updateShiftEmployees,
        employees,
        updateEmployee,
        toggleLockAccount,
        coverRequests,
        createCoverRequest,
        acceptCoverRequest,
        cancelCoverRequest,
        swapRequests,
        createSwapRequest,
        acceptSwapRequest,
        rejectSwapRequest,
        debts,
        settleDebt,
        explanations,
        approveExplanation,
        rejectExplanation,
        auditLogs,
        addAuditLog,
        notifications,
        markNotificationAsRead,
        workload,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
