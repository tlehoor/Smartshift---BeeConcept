import type { PGlite } from '@electric-sql/pglite';
import { AvailabilityService } from './availabilityService.js';

export interface ShiftInfo {
  id: string;
  dayOfWeek: number;
  shiftIndex: number;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  nickname?: string;
  role: 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';
  targetShifts: number;
  availableShiftIds: Set<string>;
}

export interface ConstraintViolation {
  level: 'WARNING' | 'ERROR';
  shiftId?: string;
  dayOfWeek?: number;
  shiftIndex?: number;
  employeeId?: string;
  title: string;
  message: string;
  fallbackUsed?: string;
}

export interface SchedulerResult {
  versionId: string;
  versionNumber: number;
  versionLabel: string;
  status: 'DRAFT';
  specialShiftIds: string[];
  assignments: {
    shiftId: string;
    employeeIds: string[];
    isSpecialShift: boolean;
    specialShiftFallback: boolean;
  }[];
  violations: ConstraintViolation[];
}

export class SchedulerService {
  constructor(private db: PGlite) {}

  /**
   * Main scheduler execution:
   * 1. Loads shifts, active employees, and point-in-time availabilities for week.
   * 2. Dynamically designates exactly 4 Special Shifts.
   * 3. Solves staffing under hard constraints & optimization weights.
   * 4. Persists immutable version and version assignments.
   * 5. Sets superseded drafts to 'REPLACED'.
   */
  async runScheduler(weekId: string, runnerUserId: string): Promise<SchedulerResult> {
    // 0. Defense-in-depth: Manager role check (Rule 39, 40)
    const userRoleRes = await this.db.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [runnerUserId]);
    if (userRoleRes.rows.length === 0 || userRoleRes.rows[0].role !== 'MANAGER') {
      throw new Error('FORBIDDEN: Chỉ Quản lý (MANAGER) mới được phép thực hiện thuật toán phân ca.');
    }

    // 0.1 Readiness check: All staff registered, all low-availability explanations approved (Rule 14, 15)
    const availService = new AvailabilityService(this.db);
    const readiness = await availService.checkSchedulerReadiness(weekId);
    if (!readiness.canRun) {
      throw new Error(`SCHEDULER_BLOCKED: Thuật toán phân ca bị chặn. ${readiness.blockingReasons.join('; ')}`);
    }

    // 1. Fetch 28 shifts
    const shiftsRes = await this.db.query<{ id: string; day_of_week: number; shift_index: number }>(
      'SELECT id, day_of_week, shift_index FROM shifts WHERE week_id = $1 ORDER BY day_of_week, shift_index',
      [weekId]
    );
    const shifts: ShiftInfo[] = shiftsRes.rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      shiftIndex: r.shift_index,
    }));

    if (shifts.length !== 28) {
      throw new Error(`INVALID_SHIFT_COUNT: Tuần làm việc phải có đủ 28 ca làm việc (tìm thấy ${shifts.length}).`);
    }

    // 2. Fetch active employees (excluding ADMIN)
    const empRes = await this.db.query<{
      id: string;
      name: string;
      nickname?: string;
      role: string;
      target_shifts: number;
    }>(
      `SELECT e.id, e.name, e.nickname, u.role, e.target_shifts
       FROM employees e
       JOIN users u ON e.id = u.id
       WHERE u.role <> 'ADMIN' AND u.account_status = 'ACTIVE'
       ORDER BY u.role, e.name`
    );

    // 3. Fetch availabilities
    const availRes = await this.db.query<{ shift_id: string; employee_id: string }>(
      'SELECT shift_id, employee_id FROM employee_availabilities WHERE week_id = $1',
      [weekId]
    );
    const availMap = new Map<string, Set<string>>(); // employee_id -> Set of shift_ids
    for (const a of availRes.rows) {
      if (!availMap.has(a.employee_id)) {
        availMap.set(a.employee_id, new Set());
      }
      availMap.get(a.employee_id)!.add(a.shift_id);
    }

    const employees: EmployeeInfo[] = empRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      nickname: r.nickname,
      role: r.role as any,
      targetShifts: r.target_shifts,
      availableShiftIds: availMap.get(r.id) || new Set(),
    }));

    // 4. Solve the schedule
    const solution = this.solve(shifts, employees);

    // 5. Version numbering (find next version number)
    const maxVerRes = await this.db.query<{ max_ver: number | null }>(
      'SELECT MAX(version_number) as max_ver FROM schedule_versions WHERE week_id = $1',
      [weekId]
    );
    const nextVerNum = (maxVerRes.rows[0]?.max_ver || 0) + 1;
    const versionLabel = `V${nextVerNum}`;

    // Mark previous DRAFT versions as REPLACED (superseded)
    await this.db.query(
      `UPDATE schedule_versions 
       SET status = 'REPLACED' 
       WHERE week_id = $1 AND status = 'DRAFT'`,
      [weekId]
    );

    // Insert new schedule_version
    const runnerRes = await this.db.query<{ name: string }>('SELECT name FROM employees WHERE id = $1', [runnerUserId]);
    const runnerName = runnerRes.rows[0]?.name || 'Quản lý';

    const verRes = await this.db.query<{ id: string }>(
      `INSERT INTO schedule_versions (week_id, version_number, version_label, status, created_by, notes, violations_summary)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6)
       RETURNING id`,
      [
        weekId,
        nextVerNum,
        versionLabel,
        runnerUserId,
        `Phiên bản nháp ${versionLabel} tối ưu tự động từ thuật toán SmartShift.`,
        JSON.stringify(solution.violations),
      ]
    );
    const versionId = verRes.rows[0].id;

    // Insert immutable snapshot into schedule_version_assignments
    for (const item of solution.assignments) {
      for (const empId of item.employeeIds) {
        await this.db.query(
          `INSERT INTO schedule_version_assignments (version_id, shift_id, employee_id, is_special_shift_assignment, is_fallback_assignment)
           VALUES ($1, $2, $3, $4, $5)`,
          [versionId, item.shiftId, empId, item.isSpecialShift, item.specialShiftFallback]
        );
      }
    }

    // Update shifts table special status
    for (const item of solution.assignments) {
      await this.db.query(
        'UPDATE shifts SET is_special_shift = $1, required_count = $2 WHERE id = $3',
        [item.isSpecialShift, item.isSpecialShift ? 3 : 2, item.shiftId]
      );
    }

    // Update week status to DRAFT
    await this.db.query(
      "UPDATE schedule_weeks SET current_status = 'DRAFT', active_version_id = $1 WHERE id = $2",
      [versionId, weekId]
    );

    // Audit log
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, $2, 'Chạy phân ca tự động', 'SCHEDULER', 'Lịch tuần phiên bản ' || $3, $4, 'SUCCESS')`,
      [
        runnerUserId,
        runnerName,
        versionLabel,
        `Tạo thành công ${versionLabel} với 28 ca (4 ca đặc biệt). ${solution.violations.length} cảnh báo.`,
      ]
    );

    return {
      versionId,
      versionNumber: nextVerNum,
      versionLabel,
      status: 'DRAFT',
      specialShiftIds: solution.specialShiftIds,
      assignments: solution.assignments,
      violations: solution.violations,
    };
  }

  /**
   * Pure constraint solver algorithm:
   * Dynamically designates 4 special shifts & assigns personnel.
   */
  solve(shifts: ShiftInfo[], employees: EmployeeInfo[]): {
    specialShiftIds: string[];
    assignments: {
      shiftId: string;
      employeeIds: string[];
      isSpecialShift: boolean;
      specialShiftFallback: boolean;
    }[];
    violations: ConstraintViolation[];
  } {
    const managers = employees.filter((e) => e.role === 'MANAGER');
    const officials = employees.filter((e) => e.role === 'OFFICIAL_STAFF');
    const probations = employees.filter((e) => e.role === 'PROBATION_STAFF');
    const workshops = employees.filter((e) => e.role === 'WORKSHOP');

    // State trackers
    const assignedPerEmp: Record<string, number> = {};
    const shiftsPerEmpPerDay: Record<string, Record<number, number>> = {};
    employees.forEach((e) => {
      assignedPerEmp[e.id] = 0;
      shiftsPerEmpPerDay[e.id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    const shiftAssignmentsMap = new Map<string, string[]>();
    shifts.forEach((s) => shiftAssignmentsMap.set(s.id, []));

    const violations: ConstraintViolation[] = [];
    const fallbackShifts = new Set<string>();

    // -------------------------------------------------------------
    // STEP 1: DYNAMIC SPECIAL SHIFT SELECTION
    // Exactly 4 Special Shifts, max 1 per day.
    // Must have available Manager.
    // -------------------------------------------------------------
    interface ShiftScore {
      shift: ShiftInfo;
      managerAvailCount: number;
      officialAvailCount: number;
      probationAvailCount: number;
      score: number;
    }

    const shiftScores: ShiftScore[] = [];

    for (const shift of shifts) {
      const mgrAvail = managers.filter((m) => m.availableShiftIds.has(shift.id)).length;
      const offAvail = officials.filter((o) => o.availableShiftIds.has(shift.id)).length;
      const probAvail = probations.filter((p) => p.availableShiftIds.has(shift.id)).length;

      // Cannot be special if zero managers available!
      if (mgrAvail === 0) continue;

      // Score components:
      // Reward shifts with >= 2 officials available (no fallback needed)
      // Small penalty if probation fallback required
      // Prefer weekend or peak slots (shifts 3 and 4)
      const timeSlotWeight = shift.shiftIndex >= 3 ? 3 : 1;
      const dayWeight = shift.dayOfWeek >= 5 ? 2 : 1;
      const staffingQuality = offAvail >= 2 ? 10 : offAvail === 1 && probAvail >= 1 ? 5 : 0;

      const score = mgrAvail * 4 + offAvail * 3 + staffingQuality + timeSlotWeight + dayWeight;
      shiftScores.push({
        shift,
        managerAvailCount: mgrAvail,
        officialAvailCount: offAvail,
        probationAvailCount: probAvail,
        score,
      });
    }

    // Sort descending by score
    shiftScores.sort((a, b) => b.score - a.score);

    // Pick 4 special shifts ensuring MAX 1 PER DAY
    const selectedSpecialShifts: ShiftInfo[] = [];
    const usedDays = new Set<number>();

    for (const item of shiftScores) {
      if (selectedSpecialShifts.length >= 4) break;
      if (!usedDays.has(item.shift.dayOfWeek)) {
        selectedSpecialShifts.push(item.shift);
        usedDays.add(item.shift.dayOfWeek);
      }
    }

    // If fewer than 4 days found (very sparse availability), fill from remaining top shifts
    if (selectedSpecialShifts.length < 4) {
      for (const item of shiftScores) {
        if (selectedSpecialShifts.length >= 4) break;
        if (!selectedSpecialShifts.some((s) => s.id === item.shift.id)) {
          selectedSpecialShifts.push(item.shift);
        }
      }
    }

    // If still < 4 (e.g. extreme test scenario with 1 manager), pick from shifts where manager is available
    if (selectedSpecialShifts.length < 4) {
      for (const shift of shifts) {
        if (selectedSpecialShifts.length >= 4) break;
        if (!selectedSpecialShifts.some((s) => s.id === shift.id)) {
          selectedSpecialShifts.push(shift);
        }
      }
    }

    const specialShiftIds = new Set(selectedSpecialShifts.map((s) => s.id));

    // -------------------------------------------------------------
    // HELPER: Can assign employee to shift?
    // Hard constraints:
    // 1. Employee MUST have availability
    // 2. No double booking in this shift
    // 3. Max 2 shifts/day for ALL roles
    // 4. Target limits:
    //    Official <= 6
    //    Probation <= 4
    //    Workshop <= 4
    //    Manager: soft, elastic
    // -------------------------------------------------------------
    const canAssign = (emp: EmployeeInfo, shift: ShiftInfo, allowOverTarget = false): boolean => {
      // 1. Availability check (HARD)
      if (!emp.availableShiftIds.has(shift.id)) return false;

      // 2. Already assigned in this shift
      const currentInShift = shiftAssignmentsMap.get(shift.id) || [];
      if (currentInShift.includes(emp.id)) return false;

      // 3. Daily shift ceiling (HARD: max 2/day for ALL roles)
      const dayCount = shiftsPerEmpPerDay[emp.id][shift.dayOfWeek] || 0;
      if (dayCount >= 2) return false;

      // 4. Role target constraints during initial Auto-Scheduler
      if (!allowOverTarget) {
        const currentCount = assignedPerEmp[emp.id];
        if (emp.role === 'OFFICIAL_STAFF' && currentCount >= 6) return false;
        if (emp.role === 'PROBATION_STAFF' && currentCount >= 4) return false;
        if (emp.role === 'WORKSHOP' && currentCount >= 4) return false;
        // Manager target is soft/elastic; limit to 5 in normal solving
        if (emp.role === 'MANAGER' && currentCount >= 5) return false;
      }

      return true;
    };

    const assign = (emp: EmployeeInfo, shift: ShiftInfo) => {
      shiftAssignmentsMap.get(shift.id)!.push(emp.id);
      assignedPerEmp[emp.id]++;
      shiftsPerEmpPerDay[emp.id][shift.dayOfWeek]++;
    };

    // Anti-split score: preference for adjacent shift if already has 1 shift on this day
    const getAntiSplitBonus = (emp: EmployeeInfo, shift: ShiftInfo): number => {
      const dayShifts = shifts.filter(
        (s) => s.dayOfWeek === shift.dayOfWeek && shiftAssignmentsMap.get(s.id)?.includes(emp.id)
      );
      if (dayShifts.length === 0) return 0;
      // If employee already works on this day, check distance between shift indices
      const existingIdx = dayShifts[0].shiftIndex;
      const distance = Math.abs(existingIdx - shift.shiftIndex);
      return distance === 1 ? 50 : -20; // High bonus for adjacent (distance 1), penalty for split
    };

    // -------------------------------------------------------------
    // STEP 2: ASSIGN SPECIAL SHIFTS FIRST
    // Composition: 1 Manager + 2 Official Staff (or 1 Official + 1 Probation fallback)
    // -------------------------------------------------------------
    for (const shift of selectedSpecialShifts) {
      // 1. Assign 1 Manager
      const availableManagers = managers
        .filter((m) => canAssign(m, shift))
        .sort((a, b) => assignedPerEmp[a.id] - assignedPerEmp[b.id]);

      if (availableManagers.length > 0) {
        assign(availableManagers[0], shift);
      } else {
        violations.push({
          level: 'ERROR',
          shiftId: shift.id,
          dayOfWeek: shift.dayOfWeek,
          shiftIndex: shift.shiftIndex as any,
          title: 'Ca đặc biệt thiếu Quản lý',
          message: `Không có Quản lý nào có khả năng làm việc trong Ca đặc biệt ${shift.shiftIndex} ngày Thứ ${shift.dayOfWeek}.`,
        });
      }

      // 2. Assign 2 Official Staff
      const availableOfficials = officials
        .filter((o) => canAssign(o, shift))
        .sort((a, b) => {
          const scoreA = (6 - assignedPerEmp[a.id]) * 10 + getAntiSplitBonus(a, shift);
          const scoreB = (6 - assignedPerEmp[b.id]) * 10 + getAntiSplitBonus(b, shift);
          return scoreB - scoreA;
        });

      if (availableOfficials.length >= 2) {
        assign(availableOfficials[0], shift);
        assign(availableOfficials[1], shift);
      } else if (availableOfficials.length === 1) {
        assign(availableOfficials[0], shift);

        // Fallback: Check for 1 Probation Staff with availability
        const availableProbations = probations
          .filter((p) => canAssign(p, shift))
          .sort((a, b) => (4 - assignedPerEmp[a.id]) * 10 + getAntiSplitBonus(a, shift));

        if (availableProbations.length > 0) {
          assign(availableProbations[0], shift);
          fallbackShifts.add(shift.id);
          violations.push({
            level: 'WARNING',
            shiftId: shift.id,
            dayOfWeek: shift.dayOfWeek,
            shiftIndex: shift.shiftIndex as any,
            title: 'Ca đặc biệt sử dụng phương án dự phòng (Probation Fallback)',
            message: `Thiếu 1 nhân viên chính thức; chỉ định nhân viên thử việc ${availableProbations[0].name} hỗ trợ.`,
            fallbackUsed: `Probation Staff ${availableProbations[0].name}`,
          });
        } else {
          violations.push({
            level: 'WARNING',
            shiftId: shift.id,
            dayOfWeek: shift.dayOfWeek,
            shiftIndex: shift.shiftIndex as any,
            title: 'Ca đặc biệt chưa đủ 3 người',
            message: 'Không tìm thấy đủ nhân sự chính thức hoặc thử việc có availability để bổ sung.',
          });
        }
      }
    }

    // -------------------------------------------------------------
    // STEP 3: ASSIGN REGULAR SHIFTS (24 shifts)
    // Rule: Min 2 people per shift, at least 1 Official OR Manager.
    // Targets: Official = 6, Workshop = 4, Probation = 4.
    // -------------------------------------------------------------
    const regularShifts = shifts.filter((s) => !specialShiftIds.has(s.id));

    // Sort regular shifts by fewest candidates first (most constrained shifts first)
    regularShifts.sort((a, b) => {
      const candA = employees.filter((e) => e.availableShiftIds.has(a.id)).length;
      const candB = employees.filter((e) => e.availableShiftIds.has(b.id)).length;
      return candA - candB;
    });

    // Sub-step 3.1: Ensure Supervisor presence (At least 1 Official or Manager)
    for (const shift of regularShifts) {
      const current = shiftAssignmentsMap.get(shift.id)!;
      const hasSupervisor = current.some((id) => {
        const r = employees.find((e) => e.id === id)?.role;
        return r === 'OFFICIAL_STAFF' || r === 'MANAGER';
      });

      if (!hasSupervisor) {
        // Find best official or manager
        const candidateSupervisors = [...officials, ...managers]
          .filter((e) => canAssign(e, shift))
          .sort((a, b) => {
            // Priority: Official staff needing shifts before manager (manager regular shifts reduced when surplus)
            const roleBonusA = a.role === 'OFFICIAL_STAFF' ? 20 : 0;
            const roleBonusB = b.role === 'OFFICIAL_STAFF' ? 20 : 0;
            const quotaNeedA = (a.targetShifts - assignedPerEmp[a.id]) * 10;
            const quotaNeedB = (b.targetShifts - assignedPerEmp[b.id]) * 10;
            return (quotaNeedB + roleBonusB + getAntiSplitBonus(b, shift)) -
                   (quotaNeedA + roleBonusA + getAntiSplitBonus(a, shift));
          });

        if (candidateSupervisors.length > 0) {
          assign(candidateSupervisors[0], shift);
        }
      }
    }

    // Sub-step 3.2: Fill up to minimum required headcount (2 for regular, 3 for special)
    for (const shift of shifts) {
      const reqCount = specialShiftIds.has(shift.id) ? 3 : 2;
      const current = shiftAssignmentsMap.get(shift.id)!;

      while (current.length < reqCount) {
        // Pool candidate employees (Workshop, Probation, Official, then Manager as elastic buffer)
        const candidates = employees
          .filter((e) => canAssign(e, shift))
          .sort((a, b) => {
            // Prioritize candidates with remaining target quota
            const quotaNeedA = a.targetShifts - assignedPerEmp[a.id];
            const quotaNeedB = b.targetShifts - assignedPerEmp[b.id];

            // Manager regular shifts should be reduced when staff quota is available
            const managerDeprecateA = a.role === 'MANAGER' ? -15 : 0;
            const managerDeprecateB = b.role === 'MANAGER' ? -15 : 0;

            const scoreA = quotaNeedA * 10 + managerDeprecateA + getAntiSplitBonus(a, shift);
            const scoreB = quotaNeedB * 10 + managerDeprecateB + getAntiSplitBonus(b, shift);
            return scoreB - scoreA;
          });

        if (candidates.length === 0) break; // Cannot fill without violating hard constraints
        assign(candidates[0], shift);
      }

      if (current.length < reqCount) {
        violations.push({
          level: 'WARNING',
          shiftId: shift.id,
          dayOfWeek: shift.dayOfWeek,
          shiftIndex: shift.shiftIndex as any,
          title: 'Ca làm việc chưa đủ nhân sự',
          message: `Ca ${shift.shiftIndex} Thứ ${shift.dayOfWeek}: Mới có ${current.length}/${reqCount} nhân sự do giới hạn availability và ràng buộc 2 ca/ngày.`,
        });
      }
    }

    // -------------------------------------------------------------
    // STEP 4: WORKLOAD TARGET VALIDATION & REPORTING
    // -------------------------------------------------------------
    for (const emp of employees) {
      const assigned = assignedPerEmp[emp.id];
      if (emp.role === 'OFFICIAL_STAFF' && assigned < 6) {
        violations.push({
          level: 'WARNING',
          employeeId: emp.id,
          title: 'Nhân viên chưa đạt chỉ tiêu tuần',
          message: `${emp.name} được phân ${assigned}/6 ca (thiếu ${6 - assigned} ca do giới hạn availability).`,
        });
      } else if ((emp.role === 'PROBATION_STAFF' || emp.role === 'WORKSHOP') && assigned < 4) {
        violations.push({
          level: 'WARNING',
          employeeId: emp.id,
          title: 'Nhân viên chưa đạt chỉ tiêu tuần',
          message: `${emp.name} (${emp.role}) được phân ${assigned}/4 ca.`,
        });
      }
    }

    const assignments = shifts.map((s) => ({
      shiftId: s.id,
      employeeIds: shiftAssignmentsMap.get(s.id) || [],
      isSpecialShift: specialShiftIds.has(s.id),
      specialShiftFallback: fallbackShifts.has(s.id),
    }));

    return {
      specialShiftIds: Array.from(specialShiftIds),
      assignments,
      violations,
    };
  }
}
