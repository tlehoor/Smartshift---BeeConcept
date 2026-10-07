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
  WorkloadItem,
  ScheduleStatus,
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
import { scheduleService } from '../services/scheduleService';
import { auditService } from '../services/auditService';
import { debtService } from '../services/debtService';
import { translations, Language, TranslationKeys } from '../i18n';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../services/apiClient';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextType {
  // Locale & Translation
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;

  // Authentication & Current User
  currentUser: Employee;
  setCurrentUser: (emp: Employee) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  login: (phone: string, passwordOrRole?: string | Role) => Promise<boolean> | boolean;
  changePassword: (newPassword: string, oldPassword?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: Role) => void;

  // Schedule Management
  shifts: ShiftAssignment[];
  setShifts: React.Dispatch<React.SetStateAction<ShiftAssignment[]>>;
  versions: ScheduleVersion[];
  currentVersion: ScheduleVersion;
  scheduleStatus: ScheduleStatus;
  setScheduleStatus: (status: ScheduleStatus) => void;
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
  cancelSwapRequest: (requestId: string) => void;

  debts: DebtRecord[];
  settleDebt: (debtId: string) => void;
  offsetDebts: (debtIdA: string, debtIdB: string) => boolean;

  // Approvals (Explanations) & Availability
  explanations: ExplanationRequest[];
  approveExplanation: (id: string, note?: string) => void;
  rejectExplanation: (id: string, note?: string) => void;
  updateEmployeeAvailability: (empId: string, count: number) => void;
  submitExplanation: (empId: string, count: number, target: number, reason: string) => void;

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

  // Backend API Data Hydration
  useEffect(() => {
    let isMounted = true;
    const initFromBackend = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          try {
            const me = await api.get('/auth/me');
            if (me && isMounted) {
              setCurrentUser(me);
              setIsAuthenticated(true);
            }
          } catch {
            removeAuthToken();
          }
        }

        const [empList, opData, vers, cov, swp, dbt, exp, aud] = await Promise.all([
          api.get('/employees').catch(() => null),
          api.get('/schedules/operational').catch(() => null),
          api.get('/scheduler/versions').catch(() => null),
          api.get('/covers').catch(() => null),
          api.get('/swaps').catch(() => null),
          api.get('/debts').catch(() => null),
          api.get('/availability/explanations').catch(() => null),
          api.get('/audit-logs').catch(() => null),
        ]);

        if (isMounted) {
          if (Array.isArray(empList) && empList.length > 0) setEmployees(empList);
          if (opData?.shifts && Array.isArray(opData.shifts)) {
            setShifts(opData.shifts);
            if (opData.week?.current_status) setScheduleStatus(opData.week.current_status);
          }
          if (Array.isArray(vers) && vers.length > 0) setVersions(vers);
          if (Array.isArray(cov)) setCoverRequests(cov);
          if (Array.isArray(swp)) setSwapRequests(swp);
          if (Array.isArray(dbt)) setDebts(dbt);
          if (Array.isArray(exp)) setExplanations(exp);
          if (Array.isArray(aud)) setAuditLogs(aud);
        }
      } catch {
        // Fallback gracefully to mock constants if server is offline
      }
    };

    initFromBackend();
    return () => { isMounted = false; };
  }, []);

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

  // Current Active Version (Latest draft or active published)
  const currentVersion =
    versions.find((v) => v.status === 'DRAFT') ||
    versions.find((v) => v.status === 'PUBLISHED') ||
    versions[versions.length - 1];

  // Workload calculations
  const workload = scheduleService.getWorkload(shifts, employees);

  // 1. SCHEDULER EXECUTION: V1 -> V2 -> V3 -> V4... KHÔNG OVERWRITE
  const runSchedulerSim = async (): Promise<ScheduleVersion> => {
    // Tìm số phiên bản kế tiếp cao nhất dựa trên các version hiện có
    const maxVerNum = versions.reduce((max, v) => {
      const match = v.version.match(/^V(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 0);
    const nextVer = `V${maxVerNum + 1}`;

    const newVersion: ScheduleVersion = {
      id: `ver-${Date.now()}`,
      version: nextVer,
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
      notes: `Phiên bản ${nextVer} tối ưu tự động từ thuật toán SmartShift. Bảo toàn lịch sử các phiên bản trước.`,
      violationsCount: 1,
    };

    // Đánh dấu các bản DRAFT trước đó thành REPLACED, bảo toàn toàn bộ lịch sử (KHÔNG XÓA/OVERWRITE)
    setVersions((prev) => [
      ...prev.map((v) => (v.status === 'DRAFT' ? { ...v, status: 'REPLACED' as const } : v)),
      newVersion,
    ]);
    setScheduleStatus('DRAFT');

    addAuditLog(
      'Chạy phân ca tự động',
      'SCHEDULER',
      `Lịch phân ca ${nextVer}`,
      `Tạo thành công phiên bản ${nextVer} với 28 ca làm việc (Lưu vết các phiên bản trước).`
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Tự động phân ca hoàn tất',
        message: `Phiên bản lịch nháp ${nextVer} đã được khởi tạo thành công.`,
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
    const publishedAtStr = new Date().toLocaleString('vi-VN');
    let publishedVersionName = 'V3';

    setVersions((prev) => {
      const activeDraft = prev.find((v) => v.status === 'DRAFT') || prev[prev.length - 1];
      if (activeDraft) {
        publishedVersionName = activeDraft.version;
      }
      return prev.map((v) =>
        v.id === activeDraft?.id
          ? {
              ...v,
              status: 'PUBLISHED' as const,
              publishedAt: publishedAtStr,
              publishedBy: currentUser.name,
            }
          : v
      );
    });

    addAuditLog(
      'Công bố lịch làm việc',
      'SCHEDULE',
      `Lịch tuần 41 (${publishedVersionName})`,
      `Công bố lịch làm việc chính thức bởi ${currentUser.name}.`
    );

    showToast(`Lịch làm việc (${publishedVersionName}) đã được công bố chính thức thành công!`, 'success');
  };

  const reopenDraft = () => {
    setScheduleStatus('DRAFT');
    let reopenedVersionName = 'V3';

    setVersions((prev) => {
      const publishedVer = prev.find((v) => v.status === 'PUBLISHED') || prev[prev.length - 1];
      if (publishedVer) {
        reopenedVersionName = publishedVer.version;
      }
      return prev.map((v) =>
        v.id === publishedVer?.id ? { ...v, status: 'DRAFT' as const } : v
      );
    });

    addAuditLog(
      'Mở lại bản nháp',
      'SCHEDULE',
      `Lịch tuần 41 (${reopenedVersionName})`,
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

  // 2. COVER ACTIONS & OWNERSHIP VALIDATION
  const createCoverRequest = (shiftId: string, invitedIds: string[], note?: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      showToast('Không tìm thấy ca làm việc.', 'error');
      return;
    }

    // Ownership check: Requester MUST currently own/be assigned to the shift
    if (!shift.assignedEmployeeIds.includes(currentUser.id)) {
      showToast('Xác thực thất bại: Bạn chỉ có thể nhờ nhận ca đối với ca làm được phân bổ cho chính bạn.', 'error');
      return;
    }

    // Filter out self-invitations
    const sanitizedInvitedIds = invitedIds.filter((id) => id !== currentUser.id);
    if (sanitizedInvitedIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 đồng nghiệp để gửi lời mời nhận ca.', 'warning');
      return;
    }

    const newReq: CoverRequest = {
      id: `cov-${Date.now().toString().slice(-4)}`,
      requesterId: currentUser.id,
      shiftId: shift.id,
      dayOfWeek: shift.dayOfWeek,
      shiftIndex: shift.shiftIndex,
      invitedCandidateIds: sanitizedInvitedIds,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      note: note || 'Nhờ đồng nghiệp hỗ trợ nhận ca.',
    };

    setCoverRequests((prev) => [newReq, ...prev]);
    addAuditLog(
      'Tạo yêu cầu nhờ nhận ca',
      'COVER',
      `Ca ${shift.shiftIndex} ngày Thứ ${shift.dayOfWeek + 1 === 8 ? 'CN' : shift.dayOfWeek + 1}`,
      `Gửi yêu cầu tới ${sanitizedInvitedIds.length} nhân viên hỗ trợ.`
    );
    showToast('Yêu cầu nhờ nhận ca đã được gửi thành công!', 'success');
  };

  // 2. COVER: FIRST VALID ACCEPT WINS (Người đầu tiên đồng ý sẽ nhận ca, khóa với các ứng viên còn lại)
  const acceptCoverRequest = (requestId: string, acceptorId: string) => {
    const req = coverRequests.find((r) => r.id === requestId);
    if (!req) {
      showToast('Không tìm thấy yêu cầu nhờ nhận ca.', 'error');
      return;
    }

    // Check 1: FIRST VALID ACCEPT WINS
    if (req.status !== 'PENDING') {
      const winner = employees.find((e) => e.id === req.acceptedByEmployeeId);
      showToast(
        `Rất tiếc! Yêu cầu nhờ nhận ca này đã được ${winner?.name || 'đồng nghiệp khác'} nhận trước! (First Valid Accept Wins)`,
        'warning'
      );
      return;
    }

    // Check 2: Ownership validation - Cannot accept your own cover request
    if (acceptorId === req.requesterId) {
      showToast('Bạn không thể tự nhận ca do chính mình nhờ hỗ trợ.', 'error');
      return;
    }

    // Check 3: Candidate eligibility - must be an invited candidate or manager
    if (!req.invitedCandidateIds.includes(acceptorId) && currentUser.role !== 'MANAGER') {
      showToast('Bạn không nằm trong danh sách được mời nhận ca này.', 'error');
      return;
    }

    const acceptor = employees.find((e) => e.id === acceptorId);
    const requester = employees.find((e) => e.id === req.requesterId);

    // Check 4: Verify requester is still in this shift
    const targetShift = shifts.find((s) => s.id === req.shiftId);
    if (!targetShift || !targetShift.assignedEmployeeIds.includes(req.requesterId)) {
      showToast('Ca làm việc này đã thay đổi phân bổ nhân sự, không thể hoàn tất nhận ca.', 'error');
      return;
    }

    const timestamp = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Cập nhật trạng thái Cover Request: COMPLETED với người nhận đầu tiên
    setCoverRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'COMPLETED',
              acceptedByEmployeeId: acceptorId,
              acceptedAt: timestamp,
            }
          : r
      )
    );

    // 2. Cập nhật phân ca: thay thế requester bằng acceptor
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

    // 3. Ghi nhận giao dịch công nợ (Debt Transaction): Người nhờ nợ người nhận 1 ca
    const newDebt: DebtRecord = debtService.createDebtFromCover(
      req.requesterId,
      acceptorId,
      `Nhờ nhận ca #${requestId} (Ca ${req.shiftIndex} Thứ ${req.dayOfWeek + 1 === 8 ? 'CN' : req.dayOfWeek + 1})`
    );
    setDebts((prev) => [newDebt, ...prev]);

    // 4. Audit Log
    addAuditLog(
      'Chấp nhận nhận ca (First Valid Accept Wins)',
      'COVER',
      `Yêu cầu #${requestId}`,
      `${acceptor?.name || 'Nhân viên'} là người đầu tiên chấp thuận nhận ca thay cho ${requester?.name || 'đồng nghiệp'}. Tạo 1 giao dịch nợ ca.`
    );

    showToast(
      `${acceptor?.name || 'Bạn'} đã nhận ca thành công (First Valid Accept Wins)! Đã cập nhật lịch và ghi nhận công nợ.`,
      'success'
    );
  };

  const cancelCoverRequest = (requestId: string) => {
    const req = coverRequests.find((r) => r.id === requestId);
    if (!req) return;

    // Ownership check: only requester or manager can cancel
    if (currentUser.id !== req.requesterId && currentUser.role !== 'MANAGER') {
      showToast('Bạn chỉ có thể hủy yêu cầu do chính mình tạo ra.', 'error');
      return;
    }

    if (req.status !== 'PENDING') {
      showToast('Yêu cầu này đã được đồng nghiệp nhận hoặc đã hủy trước đó.', 'warning');
      return;
    }

    setCoverRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED' } : r))
    );
    addAuditLog(
      'Hủy yêu cầu nhờ nhận ca',
      'COVER',
      `Yêu cầu #${requestId}`,
      'Người yêu cầu đã hủy yêu cầu nhờ nhận ca.'
    );
    showToast('Đã hủy yêu cầu nhờ nhận ca thành công.', 'info');
  };

  // 3. SWAP ACTIONS & OWNERSHIP VALIDATION
  const createSwapRequest = (
    myShiftId: string,
    targetEmpId: string,
    targetShiftId: string,
    note?: string
  ) => {
    // Ownership check: myShift must belong to currentUser
    const myShift = shifts.find((s) => s.id === myShiftId);
    const targetShift = shifts.find((s) => s.id === targetShiftId);

    if (!myShift || !myShift.assignedEmployeeIds.includes(currentUser.id)) {
      showToast('Xác thực thất bại: Bạn chỉ có thể tạo yêu cầu đổi ca cho ca làm của chính mình.', 'error');
      return;
    }

    if (!targetShift || !targetShift.assignedEmployeeIds.includes(targetEmpId)) {
      showToast('Đồng nghiệp được chọn không còn phụ trách ca làm việc này.', 'error');
      return;
    }

    if (targetEmpId === currentUser.id) {
      showToast('Không thể tạo yêu cầu đổi ca với chính mình.', 'warning');
      return;
    }

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
      `Gửi đề xuất hoán đổi ca cho nhân viên ${employees.find((e) => e.id === targetEmpId)?.name}.`
    );
    showToast('Yêu cầu đổi ca đã được gửi thành công!', 'success');
  };

  const acceptSwapRequest = (requestId: string) => {
    const swap = swapRequests.find((s) => s.id === requestId);
    if (!swap) return;

    // Ownership check: Only target employee (recipient) or manager can accept!
    if (currentUser.id !== swap.targetEmployeeId && currentUser.role !== 'MANAGER') {
      showToast('Chỉ nhân viên được đề xuất đổi ca mới có quyền chấp thuận yêu cầu này.', 'error');
      return;
    }

    if (swap.status !== 'PENDING') {
      showToast('Yêu cầu đổi ca này không còn ở trạng thái chờ phản hồi.', 'warning');
      return;
    }

    // Verify current assignments are still intact
    const reqShift = shifts.find((s) => s.id === swap.requesterShiftId);
    const tarShift = shifts.find((s) => s.id === swap.targetShiftId);

    if (
      !reqShift?.assignedEmployeeIds.includes(swap.requesterId) ||
      !tarShift?.assignedEmployeeIds.includes(swap.targetEmployeeId)
    ) {
      showToast('Không thể đổi ca: Một trong hai nhân sự không còn ở ca làm ban đầu.', 'error');
      return;
    }

    const timestamp = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Cập nhật trạng thái Swap
    setSwapRequests((prev) =>
      prev.map((s) => (s.id === requestId ? { ...s, status: 'ACCEPTED', resolvedAt: timestamp } : s))
    );

    // 2. Hoán đổi nhân sự trong 2 ca (Atomic Swap)
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
      'Hoán đổi ca thành công giữa 2 nhân sự. Xác thực quyền sở hữu hợp lệ. Không phát sinh công nợ.'
    );

    showToast('Đổi ca thành công! Lịch phân ca đã được hoán đổi tự động.', 'success');
  };

  const rejectSwapRequest = (requestId: string) => {
    const swap = swapRequests.find((s) => s.id === requestId);
    if (!swap) return;

    // Ownership check: Only target employee or manager can reject
    if (currentUser.id !== swap.targetEmployeeId && currentUser.role !== 'MANAGER') {
      showToast('Chỉ nhân viên nhận đề xuất mới có quyền từ chối yêu cầu đổi ca.', 'error');
      return;
    }

    setSwapRequests((prev) =>
      prev.map((s) => (s.id === requestId ? { ...s, status: 'REJECTED' } : s))
    );
    addAuditLog('Từ chối đổi ca', 'SWAP', `Yêu cầu #${swap.id}`, 'Đã từ chối đề xuất đổi ca.');
    showToast('Đã từ chối yêu cầu đổi ca.', 'info');
  };

  const cancelSwapRequest = (requestId: string) => {
    const swap = swapRequests.find((s) => s.id === requestId);
    if (!swap) return;
    if (currentUser.id !== swap.requesterId && currentUser.role !== 'MANAGER') {
      showToast('Bạn chỉ có thể hủy yêu cầu do chính mình tạo ra.', 'error');
      return;
    }
    setSwapRequests((prev) =>
      prev.map((s) => (s.id === requestId ? { ...s, status: 'CANCELLED' } : s))
    );
    addAuditLog('Hủy yêu cầu đổi ca', 'SWAP', `Yêu cầu #${swap.id}`, 'Đã hủy đề xuất đổi ca.');
    showToast('Đã hủy yêu cầu đổi ca.', 'info');
  };

  // 4. DEBT TRANSACTION & OFFSET MODEL
  const settleDebt = (debtId: string) => {
    const updated = debtService.settleDebt(debtId, debts);
    setDebts(updated);
    addAuditLog('Hoàn trả công nợ ca', 'DEBT', `Khoản nợ #${debtId}`, 'Xác nhận hoàn trả 1 ca làm bù thành công.');
    showToast('Đã ghi nhận thanh toán công nợ ca thành công.', 'success');
  };

  const offsetDebts = (debtIdA: string, debtIdB: string): boolean => {
    const result = debtService.offsetDebts(debtIdA, debtIdB, debts);
    if (!result.success) {
      showToast(result.error || 'Cấn trừ không thành công.', 'error');
      return false;
    }

    setDebts(result.updatedDebts);
    addAuditLog(
      'Cấn trừ công nợ 2 chiều (Offset)',
      'DEBT',
      `Khoản nợ #${debtIdA} & #${debtIdB}`,
      'Cấn trừ 1:1 thành công giữa 2 nhân sự có công nợ đối ứng qua lại.'
    );
    showToast('Cấn trừ công nợ 1:1 thành công! Cả hai khoản nợ đối ứng đã được tất toán bù trừ.', 'success');
    return true;
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
      `Từ chối đơn đăng ký ca thấp hơn định mức.`
    );
    showToast('Đã từ chối giải trình.', 'warning');
  };

  const updateEmployeeAvailability = (empId: string, count: number) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? {
              ...e,
              availabilityCount: count,
              registrationCompleted: true,
              needsExplanation: count <= e.targetShifts,
            }
          : e
      )
    );
    if (currentUser.id === empId) {
      setCurrentUser((prev) => ({
        ...prev,
        availabilityCount: count,
        registrationCompleted: true,
        needsExplanation: count <= prev.targetShifts,
      }));
    }
  };

  const submitExplanation = (empId: string, count: number, target: number, reason: string) => {
    const newExp: ExplanationRequest = {
      id: `exp-${Date.now().toString().slice(-4)}`,
      employeeId: empId,
      availabilityCount: count,
      targetShifts: target,
      reason,
      submittedAt: new Date().toLocaleString('vi-VN'),
      status: 'PENDING',
    };
    setExplanations((prev) => [newExp, ...prev]);
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? { ...e, needsExplanation: true, explanationText: reason, explanationStatus: 'PENDING' }
          : e
      )
    );
    if (currentUser.id === empId) {
      setCurrentUser((prev) => ({
        ...prev,
        needsExplanation: true,
        explanationText: reason,
        explanationStatus: 'PENDING',
      }));
    }
    const empName = employees.find((e) => e.id === empId)?.name || currentUser.name;
    addAuditLog('Gửi đơn giải trình', 'AVAILABILITY', `Nhân viên ${empName}`, reason);
    showToast('Đã gửi đơn giải trình thành công. Vui lòng đợi Admin phê duyệt.', 'success');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const login = async (phone: string, passwordOrRole?: string | Role): Promise<boolean> => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const password = typeof passwordOrRole === 'string' && passwordOrRole.length >= 6 ? passwordOrRole : cleanPhone;

    try {
      const res = await api.post('/auth/login', { phone: cleanPhone, password });
      if (res?.token) {
        setAuthToken(res.token);
        if (res.user) {
          const emp: Employee = {
            id: res.user.id,
            name: res.user.name,
            phone: res.user.phone,
            email: res.user.email,
            role: res.user.role,
            targetShifts: Number(res.user.targetShifts || 0),
            accountStatus: res.user.accountStatus,
            avatar: res.user.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            availabilityCount: 0,
            registrationCompleted: true,
          };
          setCurrentUser(emp);
          setIsAuthenticated(true);
          showToast(`Đăng nhập thành công! Chào mừng ${emp.name}`, 'success');
          return true;
        }
      }
    } catch (err: any) {
      // Local fallback for quick demo login if server unreachable
      const found = employees.find((e) => e.phone.replace(/\s/g, '') === cleanPhone);
      if (found) {
        if (found.accountStatus === 'BAN') {
          showToast('Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Admin.', 'error');
          return false;
        }
        setCurrentUser(found);
        setIsAuthenticated(true);
        showToast(`Đăng nhập thành công! Chào mừng ${found.name}`, 'success');
        return true;
      }
      showToast(err.message || 'Số điện thoại hoặc mật khẩu không chính xác.', 'error');
      return false;
    }

    if (passwordOrRole && typeof passwordOrRole === 'string' && ['ADMIN', 'MANAGER', 'OFFICIAL_STAFF', 'PROBATION_STAFF', 'WORKSHOP'].includes(passwordOrRole)) {
      const matchRole = employees.find((e) => e.role === passwordOrRole);
      if (matchRole) {
        setCurrentUser(matchRole);
        setIsAuthenticated(true);
        showToast(`Đăng nhập thành công với vai trò ${t.roles[passwordOrRole as Role]}`, 'success');
        return true;
      }
    }

    showToast('Số điện thoại không tồn tại trong hệ thống SmartShift.', 'error');
    return false;
  };

  const changePassword = async (newPassword: string, oldPassword?: string): Promise<boolean> => {
    try {
      await api.post('/auth/change-password', { newPassword, oldPassword });
      showToast('Đổi mật khẩu thành công!', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi đổi mật khẩu', 'error');
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    showToast('Đã đăng xuất khỏi hệ thống.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentUser,
        setCurrentUser,
        isAuthenticated,
        setIsAuthenticated,
        login,
        changePassword,
        logout,
        switchRole,
        shifts,
        setShifts,
        versions,
        currentVersion,
        scheduleStatus,
        setScheduleStatus,
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
        cancelSwapRequest,
        debts,
        settleDebt,
        offsetDebts,
        explanations,
        approveExplanation,
        rejectExplanation,
        updateEmployeeAvailability,
        submitExplanation,
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
