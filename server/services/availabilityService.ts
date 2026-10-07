import type { PGlite } from '@electric-sql/pglite';

export interface AvailabilitySlot {
  shiftId: string;
  dayOfWeek: number;
  shiftIndex: number;
  isSpecialShift: boolean;
}

export interface TeamAvailabilityOverview {
  employeeId: string;
  name: string;
  nickname?: string;
  role: string;
  targetShifts: number;
  registeredCount: number;
  needsExplanation: boolean;
  explanationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isComplete: boolean;
  availableShiftIds: string[];
}

export class AvailabilityService {
  constructor(private db: PGlite) {}

  /**
   * Check if current time is within registration window for a given week.
   * Can accept a custom reference time for deterministic testing.
   */
  async isRegistrationWindowOpen(weekId: string, referenceTime?: Date): Promise<boolean> {
    const weekRes = await this.db.query<{ registration_open: string; registration_close: string }>(
      'SELECT registration_open, registration_close FROM schedule_weeks WHERE id = $1',
      [weekId]
    );

    if (weekRes.rows.length === 0) {
      throw new Error('WEEK_NOT_FOUND: Không tìm thấy tuần làm việc.');
    }

    const now = referenceTime || new Date();
    const open = new Date(weekRes.rows[0].registration_open);
    const close = new Date(weekRes.rows[0].registration_close);

    return now >= open && now <= close;
  }

  /**
   * Get an employee's registered availability shift IDs for a week.
   */
  async getEmployeeAvailability(weekId: string, employeeId: string): Promise<string[]> {
    const res = await this.db.query<{ shift_id: string }>(
      'SELECT shift_id FROM employee_availabilities WHERE week_id = $1 AND employee_id = $2',
      [weekId, employeeId]
    );
    return res.rows.map((r) => r.shift_id);
  }

  /**
   * Update availability for an employee. Enforces registration window and ownership.
   */
  async updateAvailability(
    weekId: string,
    employeeId: string,
    shiftIds: string[],
    referenceTime?: Date
  ): Promise<{ registeredCount: number; needsExplanation: boolean; explanationRequiredReason?: string }> {
    const isOpen = await this.isRegistrationWindowOpen(weekId, referenceTime);
    if (!isOpen) {
      throw new Error('REGISTRATION_WINDOW_CLOSED: Cổng đăng ký ca đã đóng (chỉ mở từ Thứ Năm 12:00 đến Thứ Sáu 21:00).');
    }

    // Get employee target and role
    const empRes = await this.db.query<{ role: string; target_shifts: number }>(
      'SELECT u.role, e.target_shifts FROM users u JOIN employees e ON u.id = e.id WHERE e.id = $1',
      [employeeId]
    );
    if (empRes.rows.length === 0) {
      throw new Error('EMPLOYEE_NOT_FOUND: Nhân viên không tồn tại.');
    }
    const { role, target_shifts: target } = empRes.rows[0];

    // Atomically replace availability
    await this.db.query(
      'DELETE FROM employee_availabilities WHERE week_id = $1 AND employee_id = $2',
      [weekId, employeeId]
    );

    for (const sId of shiftIds) {
      await this.db.query(
        `INSERT INTO employee_availabilities (week_id, shift_id, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (week_id, shift_id, employee_id) DO NOTHING`,
        [weekId, sId, employeeId]
      );
    }

    const count = shiftIds.length;
    let needsExplanation = false;
    let explanationRequiredReason: string | undefined;

    // Rule:
    // Official: <= 6 requires explanation (exactly 6 ALSO requires explanation!)
    // Probation: <= 4 requires explanation
    // Workshop: <= 4 requires explanation
    if (role === 'OFFICIAL_STAFF' && count <= 6) {
      needsExplanation = true;
      explanationRequiredReason = `Nhân viên chính thức đăng ký ${count}/6 ca (yêu cầu > 6 ca để đảm bảo phân ca tối ưu).`;
    } else if ((role === 'PROBATION_STAFF' || role === 'WORKSHOP') && count <= 4) {
      needsExplanation = true;
      explanationRequiredReason = `Đăng ký ${count}/4 ca (yêu cầu > 4 ca để đảm bảo phân bổ ca tối ưu).`;
    }

    return {
      registeredCount: count,
      needsExplanation,
      explanationRequiredReason,
    };
  }

  /**
   * Submit explanation for low availability
   */
  async submitExplanation(
    weekId: string,
    employeeId: string,
    reason: string
  ): Promise<{ id: string; status: string }> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('REASON_REQUIRED: Vui lòng nhập lý do giải trình cụ thể.');
    }

    const currentShifts = await this.getEmployeeAvailability(weekId, employeeId);
    const empRes = await this.db.query<{ target_shifts: number; name: string }>(
      'SELECT target_shifts, name FROM employees WHERE id = $1',
      [employeeId]
    );
    const target = empRes.rows[0]?.target_shifts || 6;
    const name = empRes.rows[0]?.name || employeeId;

    // Insert or update existing pending explanation for this week
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO availability_explanations (week_id, employee_id, submitted_count, target_count, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING id`,
      [weekId, employeeId, currentShifts.length, target, reason.trim()]
    );

    // Audit log
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Gửi đơn giải trình ca', 'AVAILABILITY', 'Tuần ' || $3, $4, 'SUCCESS')`,
      [employeeId, name, weekId, `Giải trình đăng ký ${currentShifts.length}/${target} ca: ${reason}`]
    );

    return { id: res.rows[0].id, status: 'PENDING' };
  }

  /**
   * Admin reviews explanation (APPROVE / REJECT)
   */
  async reviewExplanation(
    adminUserId: string,
    explanationId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminNote?: string
  ): Promise<void> {
    const adminRes = await this.db.query<{ role: string; name: string }>(
      'SELECT u.role, e.name FROM users u JOIN employees e ON u.id = e.id WHERE u.id = $1',
      [adminUserId]
    );
    if (adminRes.rows.length === 0 || adminRes.rows[0].role !== 'ADMIN') {
      throw new Error('FORBIDDEN: Chỉ Quản trị viên (Admin) mới có thẩm quyền phê duyệt giải trình.');
    }

    const expRes = await this.db.query<{ employee_id: string; week_id: string }>(
      'SELECT employee_id, week_id FROM availability_explanations WHERE id = $1',
      [explanationId]
    );
    if (expRes.rows.length === 0) {
      throw new Error('EXPLANATION_NOT_FOUND: Không tìm thấy đơn giải trình.');
    }

    await this.db.query(
      `UPDATE availability_explanations
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [decision, adminUserId, adminNote || null, explanationId]
    );

    // Audit
    const targetEmp = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [expRes.rows[0].employee_id])).rows[0];
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, $3, 'APPROVAL', 'Đơn giải trình #' || $4, $5, 'SUCCESS')`,
      [
        adminUserId,
        adminRes.rows[0].name,
        decision === 'APPROVED' ? 'Phê duyệt giải trình' : 'Từ chối giải trình',
        explanationId,
        `Admin ${decision === 'APPROVED' ? 'chấp thuận' : 'từ chối'} giải trình của ${targetEmp?.name || 'nhân viên'}. Ghi chú: ${adminNote || 'Không có'}`,
      ]
    );
  }

  /**
   * Get team availability overview for Manager / Admin
   */
  async getTeamAvailabilityOverview(weekId: string): Promise<TeamAvailabilityOverview[]> {
    const query = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.nickname,
        u.role,
        e.target_shifts,
        COUNT(DISTINCT ea.shift_id) as registered_count,
        latest_exp.status as explanation_status,
        ARRAY_AGG(ea.shift_id) FILTER (WHERE ea.shift_id IS NOT NULL) as available_shift_ids
      FROM employees e
      JOIN users u ON e.id = u.id
      LEFT JOIN employee_availabilities ea ON e.id = ea.employee_id AND ea.week_id = $1
      LEFT JOIN LATERAL (
        SELECT status
        FROM availability_explanations ae
        WHERE ae.employee_id = e.id AND ae.week_id = $1
        ORDER BY ae.created_at DESC
        LIMIT 1
      ) latest_exp ON true
      WHERE u.role <> 'ADMIN' AND u.account_status = 'ACTIVE'
      GROUP BY e.id, e.name, e.nickname, u.role, e.target_shifts, latest_exp.status
      ORDER BY u.role, e.name;
    `;

    const res = await this.db.query<{
      employee_id: string;
      name: string;
      nickname?: string;
      role: string;
      target_shifts: number;
      registered_count: string;
      explanation_status?: string;
      available_shift_ids: string[] | null;
    }>(query, [weekId]);

    return res.rows.map((r) => {
      const count = Number(r.registered_count);
      const role = r.role;
      let needsExplanation = false;

      if (role === 'OFFICIAL_STAFF' && count <= 6) {
        needsExplanation = true;
      } else if ((role === 'PROBATION_STAFF' || role === 'WORKSHOP') && count <= 4) {
        needsExplanation = true;
      }

      const isComplete = !needsExplanation || r.explanation_status === 'APPROVED';

      return {
        employeeId: r.employee_id,
        name: r.name,
        nickname: r.nickname,
        role: r.role,
        targetShifts: r.target_shifts,
        registeredCount: count,
        needsExplanation,
        explanationStatus: r.explanation_status as any,
        isComplete,
        availableShiftIds: r.available_shift_ids || [],
      };
    });
  }

  /**
   * Check whether Scheduler is permitted to run.
   * Hard Rule:
   * 1. All active staff have registered availability.
   * 2. Any employee with low availability MUST have their explanation APPROVED by Admin.
   * If any required explanation is PENDING or REJECTED or missing, SCHEDULER MUST NOT RUN!
   */
  async checkSchedulerReadiness(weekId: string): Promise<{ canRun: boolean; blockingReasons: string[]; pendingCount: number }> {
    const team = await this.getTeamAvailabilityOverview(weekId);
    const blockingReasons: string[] = [];
    let pendingCount = 0;

    for (const member of team) {
      if (member.registeredCount === 0) {
        blockingReasons.push(`${member.name} (${member.role}): Chưa đăng ký bất kỳ ca làm việc nào.`);
      } else if (member.needsExplanation) {
        if (!member.explanationStatus || member.explanationStatus === 'PENDING') {
          pendingCount++;
          blockingReasons.push(
            `${member.name} (${member.role}): Đăng ký ${member.registeredCount}/${member.targetShifts} ca. Đơn giải trình đang chờ Admin phê duyệt.`
          );
        } else if (member.explanationStatus === 'REJECTED') {
          blockingReasons.push(
            `${member.name} (${member.role}): Đơn giải trình đã bị Admin từ chối. Cần đăng ký lại trước khi chạy phân ca.`
          );
        }
      }
    }

    return {
      canRun: blockingReasons.length === 0,
      blockingReasons,
      pendingCount,
    };
  }
}
