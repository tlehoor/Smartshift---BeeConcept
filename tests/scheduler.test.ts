import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index';
import { seedDatabase } from '../server/db/seed';
import { SchedulerService } from '../server/services/schedulerService';
import { AvailabilityService } from '../server/services/availabilityService';

describe('Phase 4: Dynamic Scheduler Engine & Immutable Schedule Versioning', () => {
  it('solves 28 shifts respecting all hard constraints, dynamic special shifts, and targets', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);

    // Approve the pending explanation for Bùi Hoài Thu first
    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run scheduler
    const result1 = await schedulerService.runScheduler(weekId, managerId);
    expect(result1.versionLabel).toBe('V1');
    expect(result1.assignments.length).toBe(28);

    // 1. EXACTLY 4 SPECIAL SHIFTS
    expect(result1.specialShiftIds.length).toBe(4);

    // 2. MAXIMUM 1 SPECIAL SHIFT PER DAY
    const shiftsRes = (await db.query<{ id: string; day_of_week: number }>('SELECT id, day_of_week FROM shifts WHERE week_id = $1', [weekId])).rows;
    const shiftDayMap = new Map<string, number>(shiftsRes.map(s => [s.id, s.day_of_week]));
    const specialDays = result1.specialShiftIds.map(sId => shiftDayMap.get(sId)!);
    const uniqueDays = new Set(specialDays);
    expect(uniqueDays.size).toBe(4); // Max 1 per day implies all 4 are on distinct days!

    // 3. EVERY SPECIAL SHIFT MUST CONTAIN AT LEAST 1 MANAGER
    const employeesRes = (await db.query<{ id: string; role: string }>('SELECT e.id, u.role FROM employees e JOIN users u ON e.id = u.id')).rows;
    const roleMap = new Map<string, string>(employeesRes.map(e => [e.id, e.role]));

    for (const sId of result1.specialShiftIds) {
      const assignment = result1.assignments.find(a => a.shiftId === sId)!;
      const assignedRoles = assignment.employeeIds.map(empId => roleMap.get(empId));
      expect(assignedRoles).toContain('MANAGER');
      expect(assignment.employeeIds.length).toBe(3); // 3 people per special shift
    }

    // 4. HARD CONSTRAINT: RESPECT AVAILABILITY (NO ASSIGNMENT OUTSIDE AVAILABILITY)
    const availRes = (await db.query<{ shift_id: string; employee_id: string }>('SELECT shift_id, employee_id FROM employee_availabilities WHERE week_id = $1', [weekId])).rows;
    const availSet = new Set(availRes.map(a => `${a.employee_id}_${a.shift_id}`));

    for (const a of result1.assignments) {
      for (const empId of a.employeeIds) {
        expect(availSet.has(`${empId}_${a.shiftId}`)).toBe(true);
      }
    }

    // 5. HARD CONSTRAINT: MAXIMUM 2 SHIFTS/DAY FOR ALL EMPLOYEES
    const empDailyCount: Record<string, Record<number, number>> = {};
    for (const a of result1.assignments) {
      const day = shiftDayMap.get(a.shiftId)!;
      for (const empId of a.employeeIds) {
        if (!empDailyCount[empId]) empDailyCount[empId] = {};
        empDailyCount[empId][day] = (empDailyCount[empId][day] || 0) + 1;
        expect(empDailyCount[empId][day]).toBeLessThanOrEqual(2);
      }
    }

    // 6. TARGET CAPS (Official <= 6, Probation <= 4, Workshop <= 4)
    const empTotalCount: Record<string, number> = {};
    for (const a of result1.assignments) {
      for (const empId of a.employeeIds) {
        empTotalCount[empId] = (empTotalCount[empId] || 0) + 1;
      }
    }

    for (const [empId, total] of Object.entries(empTotalCount)) {
      const role = roleMap.get(empId);
      if (role === 'OFFICIAL_STAFF') expect(total).toBeLessThanOrEqual(6);
      if (role === 'PROBATION_STAFF') expect(total).toBeLessThanOrEqual(4);
      if (role === 'WORKSHOP') expect(total).toBeLessThanOrEqual(4);
    }
  });

  it('preserves immutable schedule version snapshots across multiple runs (V1 -> V2 -> V3)', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run 1: Produces V1 DRAFT
    const v1 = await schedulerService.runScheduler(weekId, managerId);
    expect(v1.versionLabel).toBe('V1');

    // Run 2: Produces V2 DRAFT, V1 becomes REPLACED
    const v2 = await schedulerService.runScheduler(weekId, managerId);
    expect(v2.versionLabel).toBe('V2');

    // Check versions table in DB
    const versionsRes = await db.query<{ version_label: string; status: string }>(
      'SELECT version_label, status FROM schedule_versions WHERE week_id = $1 ORDER BY version_number',
      [weekId]
    );
    expect(versionsRes.rows.length).toBe(2);
    expect(versionsRes.rows[0].version_label).toBe('V1');
    expect(versionsRes.rows[0].status).toBe('REPLACED');
    expect(versionsRes.rows[1].version_label).toBe('V2');
    expect(versionsRes.rows[1].status).toBe('DRAFT');

    // Verify V1 immutable assignments are still intact in DB
    const v1Assignments = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM schedule_version_assignments WHERE version_id = $1',
      [v1.versionId]
    );
    expect(Number(v1Assignments.rows[0].count)).toBeGreaterThan(0);
  });
});
