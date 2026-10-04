import {
  Employee,
  ShiftAssignment,
  ScheduleVersion,
  CoverRequest,
  SwapRequest,
  DebtRecord,
  ExplanationRequest,
  AuditLogItem,
  NotificationItem,
  ConstraintViolation,
  WorkloadItem,
} from '../types';

export const CURRENT_USER: Employee = {
  id: 'emp-mgr-01',
  name: 'Nguyễn Minh Anh',
  phone: '0912 345 678',
  nickname: 'Minh Anh',
  email: 'minhanh.nguyen@smartshift.vn',
  role: 'MANAGER',
  targetShifts: 4,
  accountStatus: 'ACTIVE',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  availabilityCount: 8,
  registrationCompleted: true,
  needsExplanation: false,
};

export const INITIAL_EMPLOYEES: Employee[] = [
  CURRENT_USER,
  {
    id: 'emp-mgr-02',
    name: 'Trần Thu Trang',
    phone: '0903 112 233',
    nickname: 'Chị Trang',
    email: 'trang.tran@smartshift.vn',
    role: 'MANAGER',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 6,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-mgr-03',
    name: 'Lê Phương Thảo',
    phone: '0908 445 566',
    nickname: 'Thảo',
    email: 'thao.le@smartshift.vn',
    role: 'MANAGER',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 7,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-ws-01',
    name: 'Nguyễn Thái Linh',
    phone: '0918 778 899',
    nickname: 'Thái Linh',
    email: 'thailinh.nguyen@smartshift.vn',
    role: 'WORKSHOP',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 6,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-01',
    name: 'Phạm Ngọc Ánh',
    phone: '0932 101 202',
    nickname: 'Ánh',
    email: 'anh.pham@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 9,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-02',
    name: 'Hoàng Kim Ngân',
    phone: '0933 223 344',
    nickname: 'Ngân',
    email: 'ngan.hoang@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 8,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-03',
    name: 'Vũ Gia Hân',
    phone: '0934 334 455',
    nickname: 'Hân',
    email: 'han.vu@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 10,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-04',
    name: 'Đỗ Thùy Trang',
    phone: '0935 445 566',
    nickname: 'Thùy Trang',
    email: 'thuytrang.do@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 8,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-05',
    name: 'Bùi Hoài Thu',
    phone: '0936 556 677',
    nickname: 'Thu',
    email: 'thu.bui@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 5,
    registrationCompleted: true,
    needsExplanation: true,
    explanationText: 'Em phải tham gia thi chứng chỉ nghiệp vụ vào Thứ 7 và Chủ Nhật nên xin đăng ký 5 ca.',
    explanationStatus: 'PENDING',
  },
  {
    id: 'emp-off-06',
    name: 'Đặng Hương Giang',
    phone: '0937 667 788',
    nickname: 'Giang',
    email: 'giang.dang@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 8,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-07',
    name: 'Trịnh Tố Uyên',
    phone: '0938 778 899',
    nickname: 'Uyên',
    email: 'uyen.trinh@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 7,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-off-08',
    name: 'Lý Quỳnh Trâm',
    phone: '0939 889 900',
    nickname: 'Trâm',
    email: 'tram.ly@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 8,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-prob-01',
    name: 'Trần Quang Minh',
    phone: '0971 123 456',
    nickname: 'Minh',
    email: 'minh.tran@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 6,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-prob-02',
    name: 'Lê Mai Phương',
    phone: '0972 234 567',
    nickname: 'Phương',
    email: 'phuong.le@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 5,
    registrationCompleted: true,
    needsExplanation: false,
  },
  {
    id: 'emp-prob-03',
    name: 'Nguyễn Anh Đức',
    phone: '0973 345 678',
    nickname: 'Đức',
    email: 'duc.nguyen@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 4,
    registrationCompleted: true,
    needsExplanation: true,
    explanationText: 'Gia đình có việc gấp ở quê nên chỉ đăng ký được 4 ca tuần này.',
    explanationStatus: 'APPROVED',
  },
  {
    id: 'emp-adm-01',
    name: 'Lê Tuấn Kiệt',
    phone: '0901 999 888',
    nickname: 'Kiệt (Admin)',
    email: 'kiet.le@smartshift.vn',
    role: 'ADMIN',
    targetShifts: 0,
    accountStatus: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    availabilityCount: 0,
    registrationCompleted: true,
    needsExplanation: false,
  },
];

// Generate 28 shift assignments
export const generateShifts = (): ShiftAssignment[] => {
  const shifts: ShiftAssignment[] = [];
  // 4 Special shifts in week:
  // T2 Ca 3 (day 1, shift 3)
  // T4 Ca 3 (day 3, shift 3)
  // T6 Ca 4 (day 5, shift 4)
  // CN Ca 2 (day 7, shift 2)

  const isSpecial = (day: number, sIndex: number) => {
    return (
      (day === 1 && sIndex === 3) ||
      (day === 3 && sIndex === 3) ||
      (day === 5 && sIndex === 4) ||
      (day === 7 && sIndex === 2)
    );
  };

  // Base schedule assignments
  const assignmentsMatrix: Record<string, string[]> = {
    'd1-s1': ['emp-off-01', 'emp-off-02'], // Ánh, Ngân
    'd1-s2': ['emp-off-03', 'emp-prob-01'], // Hân, Minh (Probation with Official)
    'd1-s3': ['emp-off-04', 'emp-off-05', 'emp-mgr-01'], // Special: Thùy Trang, Thu, Minh Anh (Mgr)
    'd1-s4': ['emp-off-06', 'emp-ws-01'], // Giang, Thái Linh (WS)

    'd2-s1': ['emp-off-07', 'emp-off-08'], // Uyên, Trâm
    'd2-s2': ['emp-off-01', 'emp-prob-02'], // Ánh, Phương
    'd2-s3': ['emp-off-02', 'emp-mgr-02'], // Ngân, Chị Trang
    'd2-s4': ['emp-off-03', 'emp-off-04'], // Hân, Thùy Trang

    'd3-s1': ['emp-off-05', 'emp-prob-03'], // Thu, Đức
    'd3-s2': ['emp-off-06', 'emp-ws-01'], // Giang, Thái Linh
    'd3-s3': ['emp-off-07', 'emp-off-08', 'emp-mgr-03'], // Special: Uyên, Trâm, Thảo (Mgr)
    'd3-s4': ['emp-off-01', 'emp-prob-01'], // Ánh, Minh

    'd4-s1': ['emp-off-02', 'emp-off-03'], // Ngân, Hân
    'd4-s2': ['emp-off-04', 'emp-prob-02'], // Thùy Trang, Phương
    'd4-s3': ['emp-off-05', 'emp-mgr-01'], // Thu, Minh Anh
    'd4-s4': ['emp-off-06', 'emp-off-07'], // Giang, Uyên

    'd5-s1': ['emp-off-08', 'emp-prob-03'], // Trâm, Đức
    'd5-s2': ['emp-off-01', 'emp-ws-01'], // Ánh, Thái Linh
    'd5-s3': ['emp-off-02', 'emp-mgr-02'], // Ngân, Chị Trang
    'd5-s4': ['emp-off-03', 'emp-prob-01', 'emp-mgr-01'], // Special: Hân, Minh (Probation fallback), Minh Anh (Mgr) - Fallback!

    'd6-s1': ['emp-off-04', 'emp-off-06'], // Thùy Trang, Giang
    'd6-s2': ['emp-off-07', 'emp-prob-02'], // Uyên, Phương
    'd6-s3': ['emp-off-08', 'emp-mgr-03'], // Trâm, Thảo
    'd6-s4': ['emp-off-01', 'emp-ws-01'], // Ánh, Thái Linh

    'd7-s1': ['emp-off-02', 'emp-prob-03'], // Ngân, Đức
    'd7-s2': ['emp-off-03', 'emp-off-04', 'emp-mgr-02'], // Special: Hân, Thùy Trang, Chị Trang (Mgr)
    'd7-s3': ['emp-off-06', 'emp-off-07'], // Giang, Uyên
    'd7-s4': ['emp-off-08', 'emp-mgr-03'], // Trâm, Thảo
  };

  for (let d = 1; d <= 7; d++) {
    for (let s = 1; s <= 4; s++) {
      const id = `d${d}-s${s}`;
      const special = isSpecial(d, s);
      const isFallback = d === 5 && s === 4; // T6 Ca 4 uses probation fallback
      shifts.push({
        id,
        dayOfWeek: d,
        shiftIndex: s as any,
        assignedEmployeeIds: assignmentsMatrix[id] || ['emp-off-01', 'emp-off-02'],
        isSpecialShift: special,
        specialShiftFallback: isFallback,
        requiredCount: special ? 3 : 2,
      });
    }
  }

  return shifts;
};

export const INITIAL_SHIFTS: ShiftAssignment[] = generateShifts();

export const INITIAL_VERSIONS: ScheduleVersion[] = [
  {
    id: 'ver-1',
    version: 'V1',
    createdAt: '10/10/2026 14:30',
    createdBy: 'Nguyễn Minh Anh',
    status: 'WAITING',
    shifts: INITIAL_SHIFTS,
    notes: 'Phiên bản khởi tạo ban đầu, chưa tối ưu ca đặc biệt.',
    violationsCount: 4,
  },
  {
    id: 'ver-2',
    version: 'V2',
    createdAt: '11/10/2026 09:15',
    createdBy: 'Nguyễn Minh Anh',
    status: 'WAITING',
    shifts: INITIAL_SHIFTS,
    notes: 'Phiên bản điều chỉnh phân bổ ca liên tiếp cho nhân viên Workshop.',
    violationsCount: 2,
  },
  {
    id: 'ver-3',
    version: 'V3',
    createdAt: '11/10/2026 16:45',
    createdBy: 'Nguyễn Minh Anh',
    status: 'DRAFT',
    shifts: INITIAL_SHIFTS,
    notes: 'Phiên bản tối ưu nhất, đã cân bằng mục tiêu tuần và phân bổ ca đặc biệt.',
    violationsCount: 1,
  },
];

export const INITIAL_CONSTRAINTS: ConstraintViolation[] = [
  {
    id: 'viol-01',
    shiftId: 'd5-s4',
    dayOfWeek: 5,
    shiftIndex: 4,
    level: 'WARNING',
    title: 'Ca đặc biệt sử dụng phương án dự phòng (Probation Fallback)',
    message: 'Thứ 6 — Ca 4 (18:00 - 21:00): Do thiếu nhân sự chính thức có khả năng làm việc, nhân viên thử việc Trần Quang Minh được chỉ định hỗ trợ cùng Vũ Gia Hân và Nguyễn Minh Anh.',
    fallbackUsed: 'Probation Staff thay thế 1 Official Staff',
  },
  {
    id: 'viol-02',
    employeeId: 'emp-off-05',
    level: 'WARNING',
    title: 'Nhân viên chưa đạt chỉ tiêu mục tiêu tuần',
    message: 'Bùi Hoài Thu chỉ được phân 5 ca (mục tiêu 6 ca) do có đơn giải trình bận thi chứng chỉ vào cuối tuần.',
  },
];

export const INITIAL_COVER_REQUESTS: CoverRequest[] = [
  {
    id: 'cov-01',
    requesterId: 'emp-off-01', // Ánh
    shiftId: 'd3-s4', // Thứ 4 - Ca 4 (18:00 - 21:00)
    dayOfWeek: 3,
    shiftIndex: 4,
    invitedCandidateIds: ['emp-off-02', 'emp-off-04', 'emp-off-07'],
    status: 'PENDING',
    createdAt: '11/10/2026 10:20',
    note: 'Em có việc gia đình đột xuất vào tối Thứ 4, nhờ mọi người hỗ trợ giúp em ạ!',
  },
  {
    id: 'cov-02',
    requesterId: 'emp-off-05', // Thu
    shiftId: 'd1-s3', // Thứ 2 - Ca 3
    dayOfWeek: 1,
    shiftIndex: 3,
    invitedCandidateIds: ['emp-off-02'],
    acceptedByEmployeeId: 'emp-off-02', // Ngân đã nhận
    status: 'COMPLETED',
    createdAt: '09/10/2026 15:00',
    note: 'Nhờ Ngân nhận ca giúp chị nha.',
  },
];

export const INITIAL_SWAP_REQUESTS: SwapRequest[] = [
  {
    id: 'swap-01',
    requesterId: 'emp-off-04', // Thùy Trang
    requesterShiftId: 'd2-s4', // Thứ 3 - Ca 4
    targetEmployeeId: 'emp-off-03', // Hân
    targetShiftId: 'd4-s1', // Thứ 5 - Ca 1
    status: 'PENDING',
    createdAt: '11/10/2026 11:30',
    note: 'Đổi ca tối Thứ 3 lấy sáng Thứ 5 để tiện lịch học nhé Hân ơi!',
  },
];

export const INITIAL_DEBTS: DebtRecord[] = [
  {
    id: 'debt-01',
    debtorId: 'emp-mgr-01', // Nguyễn Minh Anh đang nợ
    creditorId: 'emp-off-04', // Đỗ Thùy Trang
    shiftsCount: 1,
    relatedAction: 'Nhờ nhận ca (Cover) tuần 40',
    createdAt: '02/10/2026 18:30',
    status: 'ACTIVE',
    note: 'Thùy Trang hỗ trợ trực ca chiều Chủ Nhật giúp Minh Anh.',
  },
  {
    id: 'debt-02',
    debtorId: 'emp-off-05', // Bùi Hoài Thu đang nợ
    creditorId: 'emp-off-02', // Hoàng Kim Ngân
    shiftsCount: 1,
    relatedAction: 'Nhờ nhận ca (Cover) #COV-02',
    createdAt: '09/10/2026 15:30',
    status: 'ACTIVE',
    note: 'Ngân nhận ca Thứ 2 - Ca 3 giúp Thu.',
  },
  {
    id: 'debt-03',
    debtorId: 'emp-off-07', // Trịnh Tố Uyên đang nợ
    creditorId: 'emp-mgr-01', // Nguyễn Minh Anh
    shiftsCount: 1,
    relatedAction: 'Nhờ nhận ca (Cover) tuần 39',
    createdAt: '25/09/2026 12:00',
    status: 'ACTIVE',
    note: 'Minh Anh nhận ca sáng Thứ 7 giúp Uyên.',
  },
];

export const INITIAL_EXPLANATIONS: ExplanationRequest[] = [
  {
    id: 'exp-01',
    employeeId: 'emp-off-05', // Bùi Hoài Thu
    availabilityCount: 5,
    targetShifts: 6,
    reason: 'Em phải tham gia thi chứng chỉ nghiệp vụ vào Thứ 7 và Chủ Nhật nên xin đăng ký 5 ca.',
    submittedAt: '10/10/2026 16:30',
    status: 'PENDING',
  },
  {
    id: 'exp-02',
    employeeId: 'emp-prob-03', // Nguyễn Anh Đức
    availabilityCount: 4,
    targetShifts: 4,
    reason: 'Gia đình có việc gấp ở quê nên chỉ đăng ký được 4 ca tuần này.',
    submittedAt: '09/10/2026 11:20',
    status: 'APPROVED',
    reviewedBy: 'Lê Tuấn Kiệt (Admin)',
    reviewedAt: '09/10/2026 14:00',
    adminNote: 'Đồng ý duyệt theo đơn trình bày lý do chính đáng.',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-01',
    timestamp: '11/10/2026 16:45:22',
    actorId: 'emp-mgr-01',
    actorName: 'Nguyễn Minh Anh',
    action: 'Chạy phân ca tự động',
    category: 'SCHEDULER',
    targetObject: 'Lịch phân ca V3',
    detail: 'Hệ thống tối ưu hóa thành công 28 ca làm việc, thỏa mãn 96% ràng buộc và mục tiêu.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-02',
    timestamp: '11/10/2026 11:30:15',
    actorId: 'emp-off-04',
    actorName: 'Đỗ Thùy Trang',
    action: 'Tạo yêu cầu đổi ca',
    category: 'SWAP',
    targetObject: 'Yêu cầu #SWAP-01',
    detail: 'Gửi yêu cầu hoán đổi ca T3-Ca 4 sang T5-Ca 1 cho Vũ Gia Hân.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-03',
    timestamp: '11/10/2026 10:20:00',
    actorId: 'emp-off-01',
    actorName: 'Phạm Ngọc Ánh',
    action: 'Tạo yêu cầu nhờ nhận ca',
    category: 'COVER',
    targetObject: 'Yêu cầu #COV-01',
    detail: 'Gửi lời mời nhận ca T4-Ca 4 cho nhóm 3 nhân viên phù hợp.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-04',
    timestamp: '09/10/2026 15:30:10',
    actorId: 'emp-off-02',
    actorName: 'Hoàng Kim Ngân',
    action: 'Chấp nhận nhờ nhận ca',
    category: 'COVER',
    targetObject: 'Yêu cầu #COV-02',
    detail: 'Chấp nhận nhận ca T1-Ca 3 thay cho Bùi Hoài Thu. Ghi nhận +1 công nợ ca.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-05',
    timestamp: '09/10/2026 14:00:45',
    actorId: 'emp-adm-01',
    actorName: 'Lê Tuấn Kiệt',
    action: 'Phê duyệt giải trình',
    category: 'APPROVAL',
    targetObject: 'Giải trình #EXP-02',
    detail: 'Phê duyệt lý do đăng ký 4 ca của Nguyễn Anh Đức (Thử việc).',
    result: 'SUCCESS',
  },
  {
    id: 'aud-06',
    timestamp: '09/10/2026 08:00:00',
    actorId: 'emp-adm-01',
    actorName: 'Lê Tuấn Kiệt',
    action: 'Mở cổng đăng ký ca',
    category: 'AVAILABILITY',
    targetObject: 'Tuần 41 (12/10 - 18/10)',
    detail: 'Mở đăng ký khả năng làm việc từ Thứ 5 12:00 đến Thứ 6 21:00.',
    result: 'SUCCESS',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-01',
    title: 'Tự động phân ca hoàn tất',
    message: 'Phiên bản lịch nháp V3 đã được khởi tạo thành công với 1 cảnh báo ràng buộc.',
    timestamp: '15 phút trước',
    read: false,
    link: '/scheduler/draft',
    type: 'success',
  },
  {
    id: 'notif-02',
    title: 'Yêu cầu nhờ nhận ca mới',
    message: 'Phạm Ngọc Ánh vừa gửi yêu cầu nhờ nhận ca Thứ 4 (18:00 – 21:00).',
    timestamp: '2 giờ trước',
    read: false,
    link: '/cover/requests',
    type: 'info',
  },
  {
    id: 'notif-03',
    title: 'Giải trình đăng ký ca cần duyệt',
    message: 'Bùi Hoài Thu đã gửi đơn giải trình đăng ký 5/6 ca tuần này.',
    timestamp: '1 ngày trước',
    read: true,
    link: '/approvals',
    type: 'warning',
  },
  {
    id: 'notif-04',
    title: 'Lịch tuần 40 đã lưu trữ',
    message: 'Toàn bộ dữ liệu công nợ ca tuần trước đã được đồng bộ vào hệ thống.',
    timestamp: '2 ngày trước',
    read: true,
    link: '/debt',
    type: 'info',
  },
];
