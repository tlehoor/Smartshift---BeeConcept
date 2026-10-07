import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index.js';
import { seedDatabase } from '../server/db/seed.js';
import { SchedulerService } from '../server/services/schedulerService.js';
import { AvailabilityService } from '../server/services/availabilityService.js';

describe('Scheduler Stress & Invariant Verification Suite', () => {
  it('strictly respects Manager Availability for Special Shifts (0 avail -> 0, 1 avail -> max 1, 2 avail -> max 2)', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);

    const adminId = userMap.get('0901999888')!;
    const mgr1Id = userMap.get('0912345678')!; // Nguyễn Minh Anh
    const mgr2Id = userMap.get('0903112233')!; // Trần Thu Trang
    const mgr3Id = userMap.get('0908445566')!; // Lê Phương Thảo

    // Approve pending explanation so scheduler is permitted to run
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Fetch the 28 shifts
    const shifts = (await db.query<{ id: string; day_of_week: number; shift_index: number }>(
      'SELECT id, day_of_week, shift_index FROM shifts WHERE week_id = $1 ORDER BY day_of_week, shift_index',
      [weekId]
    )).rows;

    // Reset availability for all 3 managers to test exact sensitivity:
    await db.query('DELETE FROM employee_availabilities WHERE employee_id IN ($1, $2, $3)', [mgr1Id, mgr2Id, mgr3Id]);

    // Manager 1 (Minh Anh): Available for 2 regular weekend morning shifts (Ca 1 on T6, T7) - ZERO Special Shift slots
    const regularM1A = shifts.find(s => s.day_of_week === 6 && s.shift_index === 1)!;
    const regularM1B = shifts.find(s => s.day_of_week === 7 && s.shift_index === 1)!;
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, regularM1A.id, mgr1Id]);
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, regularM1B.id, mgr1Id]);

    // Manager 2 (Trần Thu Trang): Available for exactly 1 shift (T2 Ca 3)
    const shift1 = shifts.find(s => s.day_of_week === 1 && s.shift_index === 3)!;
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, shift1.id, mgr2Id]);

    // Manager 3 (Lê Phương Thảo): Available for exactly 3 shifts on distinct days (T3 Ca 3, T4 Ca 3, T5 Ca 3)
    const shift2 = shifts.find(s => s.day_of_week === 2 && s.shift_index === 3)!;
    const shift3 = shifts.find(s => s.day_of_week === 3 && s.shift_index === 3)!;
    const shift4 = shifts.find(s => s.day_of_week === 4 && s.shift_index === 3)!;
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, shift2.id, mgr3Id]);
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, shift3.id, mgr3Id]);
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, shift4.id, mgr3Id]);

    // Run scheduler
    const result = await schedulerService.runScheduler(weekId, mgr1Id);

    // Filter special shifts assignments
    const specialAssignments = result.assignments.filter(a => a.isSpecialShift);
    expect(specialAssignments.length).toBe(4);

    let mgr1SpecialCount = 0;
    let mgr2SpecialCount = 0;
    let mgr3SpecialCount = 0;

    for (const a of specialAssignments) {
      if (a.employeeIds.includes(mgr1Id)) mgr1SpecialCount++;
      if (a.employeeIds.includes(mgr2Id)) mgr2SpecialCount++;
      if (a.employeeIds.includes(mgr3Id)) mgr3SpecialCount++;
    }

    // Invariant checks:
    // Manager 1 had 0 availability -> MUST receive exactly 0 Special Shifts
    expect(mgr1SpecialCount).toBe(0);

    // Manager 2 had 1 availability -> MUST receive at most 1 Special Shift
    expect(mgr2SpecialCount).toBeLessThanOrEqual(1);

    // Manager 3 had 3 availability -> Receives at most 3 Special Shifts
    expect(mgr3SpecialCount).toBeLessThanOrEqual(3);

    // Verify Manager 1 is NEVER assigned to any shift without availability
    for (const a of result.assignments) {
      if (a.employeeIds.includes(mgr1Id)) {
        expect([regularM1A.id, regularM1B.id]).toContain(a.shiftId);
        expect(a.isSpecialShift).toBe(false);
      }
    }
  });

  it('strictly enforces Probation <= 4, Workshop <= 4, and daily cap <= 2 across all roles', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run scheduler
    const result = await schedulerService.runScheduler(weekId, managerId);

    // Fetch roles of all employees
    const employees = (await db.query<{ id: string; role: string; name: string }>(
      'SELECT e.id, u.role, e.name FROM employees e JOIN users u ON e.id = u.id'
    )).rows;
    const roleMap = new Map(employees.map(e => [e.id, e.role]));

    // Compute weekly shift counts and daily shift counts per employee
    const shiftsRes = (await db.query<{ id: string; day_of_week: number }>('SELECT id, day_of_week FROM shifts WHERE week_id = $1', [weekId])).rows;
    const shiftDayMap = new Map(shiftsRes.map(s => [s.id, s.day_of_week]));

    const weeklyCounts: Record<string, number> = {};
    const dailyCounts: Record<string, Record<number, number>> = {};

    employees.forEach(e => {
      weeklyCounts[e.id] = 0;
      dailyCounts[e.id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    });

    for (const a of result.assignments) {
      const day = shiftDayMap.get(a.shiftId)!;
      for (const empId of a.employeeIds) {
        weeklyCounts[empId] = (weeklyCounts[empId] || 0) + 1;
        dailyCounts[empId][day] = (dailyCounts[empId][day] || 0) + 1;
      }
    }

    for (const emp of employees) {
      const role = roleMap.get(emp.id);
      const count = weeklyCounts[emp.id];

      // 1. Probation target: at most 4
      if (role === 'PROBATION_STAFF') {
        expect(count).toBeLessThanOrEqual(4);
      }

      // 2. Workshop target: at most 4
      if (role === 'WORKSHOP') {
        expect(count).toBeLessThanOrEqual(4);
      }

      // 3. Official target: at most 6 under auto-scheduler
      if (role === 'OFFICIAL_STAFF') {
        expect(count).toBeLessThanOrEqual(6);
      }

      // 4. Daily cap: at most 2 shifts per day for ALL roles!
      for (let day = 1; day <= 7; day++) {
        expect(dailyCounts[emp.id][day]).toBeLessThanOrEqual(2);
      }
    }
  });

  it('rejects scheduler execution if runner is not a Manager and if unapproved explanations exist', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const staffId = userMap.get('0932101202')!; // Nguyễn Lan Ánh

    // 1. Runner is Staff -> FORBIDDEN
    await expect(schedulerService.runScheduler(weekId, staffId)).rejects.toThrow('FORBIDDEN');

    // 2. Runner is Admin -> FORBIDDEN (Admin MUST NOT operate Scheduler)
    await expect(schedulerService.runScheduler(weekId, adminId)).rejects.toThrow('FORBIDDEN');

    // 3. Runner is Manager, but explanation is still PENDING -> SCHEDULER_BLOCKED
    await expect(schedulerService.runScheduler(weekId, managerId)).rejects.toThrow('SCHEDULER_BLOCKED');

    // 4. Admin rejects explanation -> SCHEDULER_BLOCKED still
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'REJECTED', 'Lý do không hợp lý');
    await expect(schedulerService.runScheduler(weekId, managerId)).rejects.toThrow('SCHEDULER_BLOCKED');

    // 5. Admin approves explanation -> Manager CAN run scheduler
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đã bổ sung minh chứng');
    const successResult = await schedulerService.runScheduler(weekId, managerId);
    expect(successResult.versionLabel).toBe('V1');
  });
});
