import type { PGlite } from '@electric-sql/pglite';

export interface CoverCandidateItem {
  employeeId: string;
  name: string;
  nickname?: string;
  role: string;
  category: 'SUITABLE' | 'SUPPORT' | 'UNAVAILABLE';
  reason: string;
  hasAvailability: boolean;
  hasConflict: boolean;
  dailyShiftsCount: number;
}

export interface SwapCandidateItem {
  employeeId: string;
  name: string;
  nickname?: string;
  role: string;
  targetAssignmentId: string;
  targetShiftId: string;
  dayOfWeek: number;
  shiftIndex: number;
  isEligible: boolean;
  reason?: string;
}

export class CoordinationService {
  constructor(private db: PGlite) {}

  // =========================================================================
  // 1. SCHEDULE PUBLISHING & REOPENING
  // =========================================================================

  async publishSchedule(weekId: string, versionId: string, managerUserId: string): Promise<void> {
    // Verify version exists and belongs to week
    const verRes = await this.db.query<{ id: string; status: string; version_label: string }>(
      'SELECT id, status, version_label FROM schedule_versions WHERE id = $1 AND week_id = $2',
      [versionId, weekId]
    );
    if (verRes.rows.length === 0) {
      throw new Error('VERSION_NOT_FOUND: Phiên bản phân ca không tồn tại.');
    }

    const version = verRes.rows[0];

    // Clear any prior operational assignments for this week and copy snapshot
    await this.db.query('DELETE FROM operational_shift_assignments WHERE week_id = $1', [weekId]);

    const snapshotRes = await this.db.query<{ shift_id: string; employee_id: string }>(
      'SELECT shift_id, employee_id FROM schedule_version_assignments WHERE version_id = $1',
      [versionId]
    );

    for (const snap of snapshotRes.rows) {
      await this.db.query(
        `INSERT INTO operational_shift_assignments (week_id, shift_id, employee_id, source_version_id, assignment_status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`,
        [weekId, snap.shift_id, snap.employee_id, versionId]
      );
    }

    // Update version status to PUBLISHED
    await this.db.query(
      `UPDATE schedule_versions 
       SET status = 'PUBLISHED', published_by = $1, published_at = NOW()
       WHERE id = $2`,
      [managerUserId, versionId]
    );

    // Update week status to PUBLISHED
    await this.db.query(
      "UPDATE schedule_weeks SET current_status = 'PUBLISHED', active_version_id = $1 WHERE id = $2",
      [versionId, weekId]
    );

    // Audit log
    const managerName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [managerUserId])).rows[0]?.name || 'Quản lý';
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Công bố lịch làm việc', 'SCHEDULE', 'Lịch tuần ' || $3, $4, 'SUCCESS')`,
      [managerUserId, managerName, weekId, `Công bố chính thức lịch tuần theo phiên bản ${version.version_label}.`]
    );
  }

  async reopenSchedule(weekId: string, managerUserId: string): Promise<string> {
    // Creates a brand new DRAFT version seeded from current operational state
    const weekRes = await this.db.query<{ active_version_id: string }>(
      'SELECT active_version_id FROM schedule_weeks WHERE id = $1',
      [weekId]
    );
    if (weekRes.rows.length === 0) {
      throw new Error('WEEK_NOT_FOUND: Không tìm thấy tuần làm việc.');
    }

    const maxVerRes = await this.db.query<{ max_ver: number | null }>(
      'SELECT MAX(version_number) as max_ver FROM schedule_versions WHERE week_id = $1',
      [weekId]
    );
    const nextVerNum = (maxVerRes.rows[0]?.max_ver || 0) + 1;
    const versionLabel = `V${nextVerNum}`;

    const newVerRes = await this.db.query<{ id: string }>(
      `INSERT INTO schedule_versions (week_id, version_number, version_label, status, created_by, notes)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5)
       RETURNING id`,
      [
        weekId,
        nextVerNum,
        versionLabel,
        managerUserId,
        `Mở lại chỉnh sửa từ lịch đã công bố. Khởi tạo phiên bản nháp ${versionLabel}.`,
      ]
    );
    const newVersionId = newVerRes.rows[0].id;

    // Seed snapshot from operational assignments
    const currentOps = await this.db.query<{ shift_id: string; employee_id: string }>(
      "SELECT shift_id, employee_id FROM operational_shift_assignments WHERE week_id = $1 AND assignment_status = 'ACTIVE'",
      [weekId]
    );

    for (const op of currentOps.rows) {
      await this.db.query(
        `INSERT INTO schedule_version_assignments (version_id, shift_id, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (version_id, shift_id, employee_id) DO NOTHING`,
        [newVersionId, op.shift_id, op.employee_id]
      );
    }

    // Set week status back to DRAFT
    await this.db.query(
      "UPDATE schedule_weeks SET current_status = 'DRAFT', active_version_id = $1 WHERE id = $2",
      [newVersionId, weekId]
    );

    const managerName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [managerUserId])).rows[0]?.name || 'Quản lý';
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Mở lại bản nháp', 'SCHEDULE', 'Lịch tuần ' || $3, $4, 'SUCCESS')`,
      [managerUserId, managerName, weekId, `Mở lại lịch để chỉnh sửa. Tạo phiên bản nháp ${versionLabel}.`]
    );

    return newVersionId;
  }

  // =========================================================================
  // 2. COVER ACTIONS & FIRST VALID ACCEPT WINS
  // =========================================================================

  async getCoverCandidates(weekId: string, operationalAssignmentId: string): Promise<{ suitable: CoverCandidateItem[]; support: CoverCandidateItem[]; unavailable: CoverCandidateItem[] }> {
    const assignRes = await this.db.query<{ shift_id: string; employee_id: string }>(
      'SELECT shift_id, employee_id FROM operational_shift_assignments WHERE id = $1',
      [operationalAssignmentId]
    );
    if (assignRes.rows.length === 0) {
      throw new Error('ASSIGNMENT_NOT_FOUND: Không tìm thấy ca làm việc.');
    }
    const { shift_id: shiftId, employee_id: requesterId } = assignRes.rows[0];

    const shiftRes = await this.db.query<{ day_of_week: number; shift_index: number }>(
      'SELECT day_of_week, shift_index FROM shifts WHERE id = $1',
      [shiftId]
    );
    const dayOfWeek = shiftRes.rows[0].day_of_week;

    // Fetch all active non-admin employees
    const employees = (await this.db.query<{ id: string; name: string; nickname?: string; role: string }>(
      `SELECT e.id, e.name, e.nickname, u.role
       FROM employees e JOIN users u ON e.id = u.id
       WHERE u.role <> 'ADMIN' AND u.account_status = 'ACTIVE' AND e.id <> $1`,
      [requesterId]
    )).rows;

    const suitable: CoverCandidateItem[] = [];
    const support: CoverCandidateItem[] = [];
    const unavailable: CoverCandidateItem[] = [];

    for (const emp of employees) {
      // 1. Check availability
      const availCheck = await this.db.query(
        'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
        [weekId, shiftId, emp.id]
      );
      const hasAvailability = availCheck.rows.length > 0;

      // 2. Check conflicts in same shift
      const conflictCheck = await this.db.query(
        "SELECT 1 FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3 AND assignment_status = 'ACTIVE'",
        [weekId, shiftId, emp.id]
      );
      const hasConflict = conflictCheck.rows.length > 0;

      // 3. Check daily shift count
      const dailyCountRes = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM operational_shift_assignments osa
         JOIN shifts s ON osa.shift_id = s.id
         WHERE osa.week_id = $1 AND osa.employee_id = $2 AND s.day_of_week = $3 AND osa.assignment_status = 'ACTIVE'`,
        [weekId, emp.id, dayOfWeek]
      );
      const dailyCount = Number(dailyCountRes.rows[0].count);

      if (hasConflict || dailyCount >= 2) {
        unavailable.push({
          employeeId: emp.id,
          name: emp.name,
          nickname: emp.nickname,
          role: emp.role,
          category: 'UNAVAILABLE',
          reason: hasConflict ? 'Đã có lịch làm việc trong khung giờ này' : 'Đã đạt giới hạn tối đa 2 ca/ngày',
          hasAvailability,
          hasConflict: true,
          dailyShiftsCount: dailyCount,
        });
      } else if (hasAvailability) {
        suitable.push({
          employeeId: emp.id,
          name: emp.name,
          nickname: emp.nickname,
          role: emp.role,
          category: 'SUITABLE',
          reason: 'Có đăng ký availability và lịch trống',
          hasAvailability: true,
          hasConflict: false,
          dailyShiftsCount: dailyCount,
        });
      } else {
        support.push({
          employeeId: emp.id,
          name: emp.name,
          nickname: emp.nickname,
          role: emp.role,
          category: 'SUPPORT',
          reason: 'Lịch trống trong ngày, có thể nhờ hỗ trợ thêm',
          hasAvailability: false,
          hasConflict: false,
          dailyShiftsCount: dailyCount,
        });
      }
    }

    return { suitable, support, unavailable };
  }

  async createCoverRequest(requesterUserId: string, operationalAssignmentId: string, candidateIds: string[], note?: string): Promise<string> {
    const assignRes = await this.db.query<{ week_id: string; shift_id: string; employee_id: string }>(
      'SELECT week_id, shift_id, employee_id FROM operational_shift_assignments WHERE id = $1',
      [operationalAssignmentId]
    );
    if (assignRes.rows.length === 0) {
      throw new Error('ASSIGNMENT_NOT_FOUND: Không tìm thấy ca làm việc.');
    }
    const { week_id: weekId, shift_id: shiftId, employee_id: currentOwnerId } = assignRes.rows[0];

    if (currentOwnerId !== requesterUserId) {
      throw new Error('UNAUTHORIZED_OWNER: Bạn chỉ có thể nhờ nhận ca đối với ca làm của chính mình.');
    }

    const cleanCandidateIds = candidateIds.filter((id) => id !== requesterUserId);
    if (cleanCandidateIds.length === 0) {
      throw new Error('CANDIDATES_REQUIRED: Vui lòng chọn ít nhất 1 đồng nghiệp để gửi lời mời.');
    }

    const reqRes = await this.db.query<{ id: string }>(
      `INSERT INTO cover_requests (week_id, shift_id, operational_assignment_id, requester_id, status, note)
       VALUES ($1, $2, $3, $4, 'PENDING', $5)
       RETURNING id`,
      [weekId, shiftId, operationalAssignmentId, requesterUserId, note || null]
    );
    const requestId = reqRes.rows[0].id;

    for (const cId of cleanCandidateIds) {
      await this.db.query(
        `INSERT INTO cover_invitations (cover_request_id, candidate_id)
         VALUES ($1, $2)
         ON CONFLICT (cover_request_id, candidate_id) DO NOTHING`,
        [requestId, cId]
      );
    }

    const requesterName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [requesterUserId])).rows[0]?.name || requesterUserId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Tạo yêu cầu nhờ nhận ca', 'COVER', 'Yêu cầu #' || $3, $4, 'SUCCESS')`,
      [requesterUserId, requesterName, requestId, `Gửi lời mời nhận ca tới ${cleanCandidateIds.length} nhân sự.`]
    );

    return requestId;
  }

  /**
   * Concurrency-safe Cover Acceptance (First Valid Accept Wins)
   * 1. Locks candidate's employee row to serialize workload check
   * 2. Locks cover request row
   * 3. Locks operational assignment row
   * 4. Revalidates point-in-time availability
   * 5. Checks daily cap & conflicts
   * 6. Updates assignment + creates exactly 1 debt transaction
   */
  async acceptCoverRequest(candidateUserId: string, coverRequestId: string): Promise<{ success: boolean; debtId: string }> {
    // Step 1: Lock candidate employee row exclusively to serialize all shift additions for candidate
    await this.db.query('SELECT id FROM employees WHERE id = $1 FOR UPDATE', [candidateUserId]);

    // Step 2: Lock Cover Request row
    const reqRes = await this.db.query<{
      id: string;
      week_id: string;
      shift_id: string;
      operational_assignment_id: string;
      requester_id: string;
      status: string;
    }>('SELECT id, week_id, shift_id, operational_assignment_id, requester_id, status FROM cover_requests WHERE id = $1 FOR UPDATE', [coverRequestId]);

    if (reqRes.rows.length === 0) {
      throw new Error('REQUEST_NOT_FOUND: Không tìm thấy yêu cầu nhờ nhận ca.');
    }
    const req = reqRes.rows[0];

    // Check 1: First Valid Accept Wins
    if (req.status !== 'PENDING') {
      throw new Error('COVER_ALREADY_RESOLVED: Rất tiếc, yêu cầu nhờ nhận ca này đã được đồng nghiệp khác nhận trước hoặc đã hủy.');
    }

    // Check 2: Was candidate invited?
    const invCheck = await this.db.query(
      'SELECT 1 FROM cover_invitations WHERE cover_request_id = $1 AND candidate_id = $2',
      [coverRequestId, candidateUserId]
    );
    if (invCheck.rows.length === 0) {
      throw new Error('NOT_INVITED: Bạn không nằm trong danh sách được mời nhận ca này.');
    }

    // Step 3: Lock and verify operational assignment
    const assignRes = await this.db.query<{ id: string; employee_id: string; assignment_status: string }>(
      'SELECT id, employee_id, assignment_status FROM operational_shift_assignments WHERE id = $1 FOR UPDATE',
      [req.operational_assignment_id]
    );
    if (assignRes.rows.length === 0 || assignRes.rows[0].employee_id !== req.requester_id) {
      throw new Error('STALE_ASSIGNMENT: Người yêu cầu không còn phụ trách ca làm này.');
    }

    // Check 4: POINT-IN-TIME AVAILABILITY VERIFICATION
    const availCheck = await this.db.query(
      'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
      [req.week_id, req.shift_id, candidateUserId]
    );
    if (availCheck.rows.length === 0) {
      throw new Error('CANDIDATE_NO_LONGER_AVAILABLE: Bạn chưa đăng ký hoặc đã hủy khả năng làm việc trong khung giờ của ca này.');
    }

    // Check 5: Conflict in same slot
    const slotConflict = await this.db.query(
      "SELECT 1 FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3 AND assignment_status = 'ACTIVE'",
      [req.week_id, req.shift_id, candidateUserId]
    );
    if (slotConflict.rows.length > 0) {
      throw new Error('SLOT_CONFLICT: Bạn đã có ca làm việc khác trong cùng khung giờ này.');
    }

    // Check 6: Daily cap <= 2 shifts/day
    const shiftInfo = (await this.db.query<{ day_of_week: number; shift_index: number }>('SELECT day_of_week, shift_index FROM shifts WHERE id = $1', [req.shift_id])).rows[0];
    const dailyCountRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM operational_shift_assignments osa
       JOIN shifts s ON osa.shift_id = s.id
       WHERE osa.week_id = $1 AND osa.employee_id = $2 AND s.day_of_week = $3 AND osa.assignment_status = 'ACTIVE'`,
      [req.week_id, candidateUserId, shiftInfo.day_of_week]
    );
    if (Number(dailyCountRes.rows[0].count) >= 2) {
      throw new Error('DAILY_CAP_EXCEEDED: Bạn đã đạt giới hạn tối đa 2 ca/ngày. Không thể nhận thêm.');
    }

    // 7. Execute updates
    // A. Operational assignment reassigned to candidate
    await this.db.query(
      'UPDATE operational_shift_assignments SET employee_id = $1, updated_at = NOW() WHERE id = $2',
      [candidateUserId, req.operational_assignment_id]
    );

    // B. Mark Cover request COMPLETED
    await this.db.query(
      "UPDATE cover_requests SET status = 'COMPLETED', accepted_by = $1, accepted_at = NOW(), updated_at = NOW() WHERE id = $2",
      [candidateUserId, coverRequestId]
    );

    // C. Create exactly ONE Debt transaction (Requester owes Candidate 1 shift)
    const debtRes = await this.db.query<{ id: string }>(
      `INSERT INTO debt_transactions (debtor_id, creditor_id, shifts_count, status, cover_request_id, action_description)
       VALUES ($1, $2, 1, 'ACTIVE', $3, $4)
       RETURNING id`,
      [
        req.requester_id,
        candidateUserId,
        coverRequestId,
        `Nhận ca thay (Cover) Ca ${shiftInfo.shift_index} ngày Thứ ${shiftInfo.day_of_week}`,
      ]
    );
    const debtId = debtRes.rows[0].id;

    // D. Audit log
    const candidateName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [candidateUserId])).rows[0]?.name || candidateUserId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Chấp nhận nhờ nhận ca', 'COVER', 'Yêu cầu #' || $3, $4, 'SUCCESS')`,
      [
        candidateUserId,
        candidateName,
        coverRequestId,
        `Nhận ca thành công (First Valid Accept Wins). Chuyển ca trực và tạo giao dịch nợ #${debtId}.`,
      ]
    );

    return { success: true, debtId };
  }

  async cancelCoverRequest(userId: string, coverRequestId: string): Promise<void> {
    const reqRes = await this.db.query<{ requester_id: string; status: string }>(
      'SELECT requester_id, status FROM cover_requests WHERE id = $1',
      [coverRequestId]
    );
    if (reqRes.rows.length === 0) {
      throw new Error('REQUEST_NOT_FOUND: Không tìm thấy yêu cầu nhờ nhận ca.');
    }
    const r = reqRes.rows[0];
    if (r.requester_id !== userId) {
      throw new Error('FORBIDDEN: Chỉ người tạo yêu cầu mới có quyền hủy.');
    }
    if (r.status !== 'PENDING') {
      throw new Error('CANNOT_CANCEL: Yêu cầu này đã được đồng nghiệp nhận hoặc đã đóng trước đó.');
    }

    await this.db.query(
      "UPDATE cover_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1",
      [coverRequestId]
    );

    const name = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [userId])).rows[0]?.name || userId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Hủy yêu cầu nhờ nhận ca', 'COVER', 'Yêu cầu #' || $3, 'Người yêu cầu đã hủy yêu cầu nhận ca.', 'SUCCESS')`,
      [userId, name, coverRequestId]
    );
  }

  // =========================================================================
  // 3. SWAP ACTIONS & ATOMIC TWO-WAY EXCHANGE
  // =========================================================================

  async getSwapCandidates(weekId: string, myOperationalAssignmentId: string): Promise<SwapCandidateItem[]> {
    const myAssign = (await this.db.query<{ shift_id: string; employee_id: string }>(
      'SELECT shift_id, employee_id FROM operational_shift_assignments WHERE id = $1',
      [myOperationalAssignmentId]
    )).rows[0];
    if (!myAssign) throw new Error('ASSIGNMENT_NOT_FOUND');

    const myShift = (await this.db.query<{ id: string; day_of_week: number; shift_index: number }>(
      'SELECT id, day_of_week, shift_index FROM shifts WHERE id = $1',
      [myAssign.shift_id]
    )).rows[0];

    // Find all other operational assignments in week
    const otherAssignments = (await this.db.query<{
      assignment_id: string;
      shift_id: string;
      employee_id: string;
      employee_name: string;
      nickname?: string;
      role: string;
      day_of_week: number;
      shift_index: number;
    }>(
      `SELECT osa.id as assignment_id, osa.shift_id, osa.employee_id,
              e.name as employee_name, e.nickname, u.role,
              s.day_of_week, s.shift_index
       FROM operational_shift_assignments osa
       JOIN shifts s ON osa.shift_id = s.id
       JOIN employees e ON osa.employee_id = e.id
       JOIN users u ON e.id = u.id
       WHERE osa.week_id = $1 AND osa.employee_id <> $2 AND osa.shift_id <> $3 AND osa.assignment_status = 'ACTIVE'
         AND u.role <> 'ADMIN' AND u.account_status = 'ACTIVE'`,
      [weekId, myAssign.employee_id, myAssign.shift_id]
    )).rows;

    const candidates: SwapCandidateItem[] = [];

    for (const other of otherAssignments) {
      // 1. Check mutual availability
      const iAmAvailable = (await this.db.query(
        'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
        [weekId, other.shift_id, myAssign.employee_id]
      )).rows.length > 0;

      const theyAreAvailable = (await this.db.query(
        'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
        [weekId, myAssign.shift_id, other.employee_id]
      )).rows.length > 0;

      // 2. Check double booking conflicts
      const iConflict = (await this.db.query(
        "SELECT 1 FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3 AND assignment_status = 'ACTIVE'",
        [weekId, other.shift_id, myAssign.employee_id]
      )).rows.length > 0;

      const theyConflict = (await this.db.query(
        "SELECT 1 FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3 AND assignment_status = 'ACTIVE'",
        [weekId, myAssign.shift_id, other.employee_id]
      )).rows.length > 0;

      const isEligible = iAmAvailable && theyAreAvailable && !iConflict && !theyConflict;
      let reason: string | undefined;
      if (!iAmAvailable) reason = 'Bạn chưa đăng ký availability cho ca này';
      else if (!theyAreAvailable) reason = 'Đồng nghiệp chưa đăng ký availability cho ca của bạn';
      else if (iConflict || theyConflict) reason = 'Trùng lịch làm việc trong khung giờ';

      candidates.push({
        employeeId: other.employee_id,
        name: other.employee_name,
        nickname: other.nickname,
        role: other.role,
        targetAssignmentId: other.assignment_id,
        targetShiftId: other.shift_id,
        dayOfWeek: other.day_of_week,
        shiftIndex: other.shift_index,
        isEligible,
        reason,
      });
    }

    return candidates;
  }

  async createSwapRequest(requesterUserId: string, requesterAssignmentId: string, targetAssignmentId: string, note?: string): Promise<string> {
    const reqAssign = (await this.db.query<{ week_id: string; shift_id: string; employee_id: string }>(
      'SELECT week_id, shift_id, employee_id FROM operational_shift_assignments WHERE id = $1',
      [requesterAssignmentId]
    )).rows[0];
    if (!reqAssign || reqAssign.employee_id !== requesterUserId) {
      throw new Error('UNAUTHORIZED_OWNER: Bạn chỉ có thể tạo yêu cầu đổi ca cho ca làm của chính mình.');
    }

    const tarAssign = (await this.db.query<{ week_id: string; shift_id: string; employee_id: string }>(
      'SELECT week_id, shift_id, employee_id FROM operational_shift_assignments WHERE id = $1',
      [targetAssignmentId]
    )).rows[0];
    if (!tarAssign) throw new Error('TARGET_NOT_FOUND: Ca làm việc của đồng nghiệp không tồn tại.');
    if (tarAssign.employee_id === requesterUserId) {
      throw new Error('CANNOT_SWAP_SELF: Không thể tự đổi ca với chính mình.');
    }

    const swapRes = await this.db.query<{ id: string }>(
      `INSERT INTO swap_requests (week_id, requester_assignment_id, target_assignment_id, requester_id, target_employee_id, status, note)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       RETURNING id`,
      [reqAssign.week_id, requesterAssignmentId, targetAssignmentId, requesterUserId, tarAssign.employee_id, note || null]
    );
    const swapId = swapRes.rows[0].id;

    const reqName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [requesterUserId])).rows[0]?.name || requesterUserId;
    const tarName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [tarAssign.employee_id])).rows[0]?.name || tarAssign.employee_id;

    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Tạo yêu cầu đổi ca', 'SWAP', 'Yêu cầu #' || $3, $4, 'SUCCESS')`,
      [requesterUserId, reqName, swapId, `Gửi đề xuất hoán đổi ca cho ${tarName}.`]
    );

    return swapId;
  }

  /**
   * Concurrency-safe atomic two-way Swap:
   * 1. Lock swap request row
   * 2. Lock both assignments in deterministic lexicographical order
   * 3. Validate point-in-time mutual availability
   * 4. Single-statement atomic CASE exchange
   * 5. Zero debt produced
   */
  async acceptSwapRequest(recipientUserId: string, swapRequestId: string): Promise<void> {
    // Step 1: Lock swap request row
    const swapRes = await this.db.query<{
      id: string;
      week_id: string;
      requester_assignment_id: string;
      target_assignment_id: string;
      requester_id: string;
      target_employee_id: string;
      status: string;
    }>('SELECT id, week_id, requester_assignment_id, target_assignment_id, requester_id, target_employee_id, status FROM swap_requests WHERE id = $1 FOR UPDATE', [swapRequestId]);

    if (swapRes.rows.length === 0) {
      throw new Error('REQUEST_NOT_FOUND: Không tìm thấy yêu cầu đổi ca.');
    }
    const swap = swapRes.rows[0];

    if (swap.status !== 'PENDING') {
      throw new Error('SWAP_NOT_PENDING: Yêu cầu đổi ca này không còn ở trạng thái chờ phản hồi.');
    }

    if (swap.target_employee_id !== recipientUserId) {
      throw new Error('FORBIDDEN_RECIPIENT: Chỉ người nhận đề xuất đổi ca mới có quyền chấp thuận.');
    }

    // Step 2: Lock both assignments in deterministic order to prevent deadlocks
    const firstId = swap.requester_assignment_id < swap.target_assignment_id ? swap.requester_assignment_id : swap.target_assignment_id;
    const secondId = swap.requester_assignment_id < swap.target_assignment_id ? swap.target_assignment_id : swap.requester_assignment_id;

    const assignRows = (await this.db.query<{ id: string; employee_id: string; shift_id: string }>(
      'SELECT id, employee_id, shift_id FROM operational_shift_assignments WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE',
      [firstId, secondId]
    )).rows;

    const reqAssign = assignRows.find((r) => r.id === swap.requester_assignment_id);
    const tarAssign = assignRows.find((r) => r.id === swap.target_assignment_id);

    if (!reqAssign || reqAssign.employee_id !== swap.requester_id || !tarAssign || tarAssign.employee_id !== swap.target_employee_id) {
      throw new Error('STALE_SWAP_ASSIGNMENT: Một trong hai nhân viên không còn phụ trách ca làm ban đầu.');
    }

    // Step 3: POINT-IN-TIME MUTUAL AVAILABILITY VERIFICATION
    const reqAvailCheck = await this.db.query(
      'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
      [swap.week_id, tarAssign.shift_id, swap.requester_id]
    );
    if (reqAvailCheck.rows.length === 0) {
      throw new Error('REQUESTER_NO_LONGER_AVAILABLE: Người đề xuất không còn đăng ký availability cho ca muốn đổi.');
    }

    const tarAvailCheck = await this.db.query(
      'SELECT 1 FROM employee_availabilities WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
      [swap.week_id, reqAssign.shift_id, swap.target_employee_id]
    );
    if (tarAvailCheck.rows.length === 0) {
      throw new Error('RECIPIENT_NO_LONGER_AVAILABLE: Bạn chưa đăng ký availability cho ca làm việc này.');
    }

    // Step 4: Single-statement atomic CASE exchange (PostgreSQL safe)
    await this.db.query(
      `UPDATE operational_shift_assignments
       SET employee_id = CASE
           WHEN id = $1 THEN $2::uuid
           WHEN id = $3 THEN $4::uuid
       END,
       updated_at = NOW()
       WHERE id IN ($1, $3)`,
      [swap.requester_assignment_id, swap.target_employee_id, swap.target_assignment_id, swap.requester_id]
    );

    // Step 5: Mark Swap ACCEPTED
    await this.db.query(
      "UPDATE swap_requests SET status = 'ACCEPTED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1",
      [swapRequestId]
    );

    // Step 6: Audit log (NO debt transaction created!)
    const recipientName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [recipientUserId])).rows[0]?.name || recipientUserId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Chấp thuận đổi ca', 'SWAP', 'Yêu cầu #' || $3, $4, 'SUCCESS')`,
      [recipientUserId, recipientName, swapRequestId, 'Hoán đổi 2 ca trực thành công. Không phát sinh công nợ.']
    );
  }

  async rejectSwapRequest(recipientUserId: string, swapRequestId: string): Promise<void> {
    const swapRes = await this.db.query<{ target_employee_id: string; status: string }>(
      'SELECT target_employee_id, status FROM swap_requests WHERE id = $1',
      [swapRequestId]
    );
    if (swapRes.rows.length === 0) throw new Error('REQUEST_NOT_FOUND');
    const s = swapRes.rows[0];
    if (s.target_employee_id !== recipientUserId) {
      throw new Error('FORBIDDEN: Chỉ người nhận đề xuất mới có quyền từ chối.');
    }
    if (s.status !== 'PENDING') throw new Error('NOT_PENDING');

    await this.db.query(
      "UPDATE swap_requests SET status = 'REJECTED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1",
      [swapRequestId]
    );

    const name = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [recipientUserId])).rows[0]?.name || recipientUserId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Từ chối đổi ca', 'SWAP', 'Yêu cầu #' || $3, 'Đã từ chối đề xuất đổi ca.', 'SUCCESS')`,
      [recipientUserId, name, swapRequestId]
    );
  }

  // =========================================================================
  // 4. DEBT LEDGER & 1:1 RECIPROCAL OFFSET
  // =========================================================================

  async getDebtSummary(userId: string): Promise<{
    iOwe: any[];
    owedToMe: any[];
    history: any[];
    potentialOffsets: { myDebtId: string; counterDebtId: string; partnerId: string; partnerName: string }[];
  }> {
    const debts = (await this.db.query<{
      id: string;
      debtor_id: string;
      creditor_id: string;
      debtor_name: string;
      creditor_name: string;
      shifts_count: number;
      status: string;
      action_description: string;
      note?: string;
      offset_with_debt_id?: string;
      created_at: string;
      settled_at?: string;
    }>(
      `SELECT d.id, d.debtor_id, d.creditor_id,
              e_deb.name as debtor_name, e_cred.name as creditor_name,
              d.shifts_count, d.status, d.action_description, d.note,
              d.offset_with_debt_id, d.created_at, d.settled_at
       FROM debt_transactions d
       JOIN employees e_deb ON d.debtor_id = e_deb.id
       JOIN employees e_cred ON d.creditor_id = e_cred.id
       WHERE d.debtor_id = $1 OR d.creditor_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    )).rows;

    const iOwe = debts.filter((d) => d.debtor_id === userId && d.status === 'ACTIVE');
    const owedToMe = debts.filter((d) => d.creditor_id === userId && d.status === 'ACTIVE');
    const history = debts.filter((d) => d.status === 'SETTLED' || d.status === 'OFFSET');

    // Find reciprocal pairs
    const potentialOffsets: { myDebtId: string; counterDebtId: string; partnerId: string; partnerName: string }[] = [];
    const usedCounterIds = new Set<string>();

    for (const myD of iOwe) {
      const counter = owedToMe.find(
        (theirD) => theirD.debtor_id === myD.creditor_id && !usedCounterIds.has(theirD.id)
      );
      if (counter) {
        usedCounterIds.add(counter.id);
        potentialOffsets.push({
          myDebtId: myD.id,
          counterDebtId: counter.id,
          partnerId: myD.creditor_id,
          partnerName: myD.creditor_name,
        });
      }
    }

    return { iOwe, owedToMe, history, potentialOffsets };
  }

  async offsetDebts(userId: string, debtIdA: string, debtIdB: string): Promise<void> {
    const firstId = debtIdA < debtIdB ? debtIdA : debtIdB;
    const secondId = debtIdA < debtIdB ? debtIdB : debtIdA;

    const debts = (await this.db.query<{
      id: string;
      debtor_id: string;
      creditor_id: string;
      status: string;
    }>(
      'SELECT id, debtor_id, creditor_id, status FROM debt_transactions WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE',
      [firstId, secondId]
    )).rows;

    if (debts.length !== 2) throw new Error('DEBTS_NOT_FOUND: Không tìm thấy thông tin công nợ.');

    const d1 = debts[0];
    const d2 = debts[1];

    if (d1.status !== 'ACTIVE' || d2.status !== 'ACTIVE') {
      throw new Error('DEBTS_NOT_ACTIVE: Chỉ các khoản nợ đang ACTIVE mới được cấn trừ.');
    }

    const isReciprocal = (d1.debtor_id === d2.creditor_id && d1.creditor_id === d2.debtor_id);
    if (!isReciprocal) {
      throw new Error('NOT_RECIPROCAL: Hai khoản nợ không đối ứng qua lại giữa 2 nhân sự.');
    }

    // Update both to OFFSET
    await this.db.query(
      `UPDATE debt_transactions
       SET status = 'OFFSET', settled_at = NOW(), offset_with_debt_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [d2.id, d1.id]
    );

    await this.db.query(
      `UPDATE debt_transactions
       SET status = 'OFFSET', settled_at = NOW(), offset_with_debt_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [d1.id, d2.id]
    );

    const userName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [userId])).rows[0]?.name || userId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Cấn trừ công nợ 1:1', 'DEBT', 'Khoản nợ #' || $3 || ' & #' || $4, 'Cấn trừ đối ứng 1:1 thành công giữa 2 nhân sự.', 'SUCCESS')`,
      [userId, userName, d1.id, d2.id]
    );
  }

  async settleDebt(userId: string, debtId: string): Promise<void> {
    const debtRes = await this.db.query<{ debtor_id: string; creditor_id: string; status: string }>(
      'SELECT debtor_id, creditor_id, status FROM debt_transactions WHERE id = $1 FOR UPDATE',
      [debtId]
    );
    if (debtRes.rows.length === 0) throw new Error('DEBT_NOT_FOUND');
    const d = debtRes.rows[0];

    // Only creditor (the one who is owed) or manager can settle
    if (d.creditor_id !== userId) {
      const userRole = (await this.db.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId])).rows[0]?.role;
      if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
        throw new Error('FORBIDDEN: Chỉ người được nợ mới có quyền xác nhận thanh toán công nợ.');
      }
    }

    await this.db.query(
      "UPDATE debt_transactions SET status = 'SETTLED', settled_at = NOW(), updated_at = NOW() WHERE id = $1",
      [debtId]
    );

    const userName = (await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [userId])).rows[0]?.name || userId;
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Hoàn tất công nợ ca', 'DEBT', 'Khoản nợ #' || $3, 'Xác nhận hoàn tất nợ ca.', 'SUCCESS')`,
      [userId, userName, debtId]
    );
  }
}
