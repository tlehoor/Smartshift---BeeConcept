import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index';
import { seedDatabase } from '../server/db/seed';
import { AvailabilityService } from '../server/services/availabilityService';
import { SchedulerService } from '../server/services/schedulerService';
import { CoordinationService } from '../server/services/coordinationService';

describe('Phase 5: Operational Roster, Cover, Swap, Debt & Concurrency Protection', () => {
  it('publishes schedule into operational roster without mutating immutable version snapshot', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);
    const coordService = new CoordinationService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run scheduler
    const v1 = await schedulerService.runScheduler(weekId, managerId);
    expect(v1.versionLabel).toBe('V1');

    // Publish schedule
    await coordService.publishSchedule(weekId, v1.versionId, managerId);

    // Verify operational_shift_assignments populated
    const ops = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM operational_shift_assignments WHERE week_id = $1', [weekId]);
    const expectedCount = v1.assignments.reduce((sum, a) => sum + a.employeeIds.length, 0);
    expect(Number(ops.rows[0].count)).toBe(expectedCount);

    // Verify week and version status are PUBLISHED
    const verRes = (await db.query<{ status: string }>('SELECT status FROM schedule_versions WHERE id = $1', [v1.versionId])).rows[0];
    const weekRes = (await db.query<{ current_status: string }>('SELECT current_status FROM schedule_weeks WHERE id = $1', [weekId])).rows[0];
    expect(verRes.status).toBe('PUBLISHED');
    expect(weekRes.current_status).toBe('PUBLISHED');

    // Reopen schedule: spawns V2 DRAFT seeded from operational state while V1 remains immutable and PUBLISHED
    const v2Id = await coordService.reopenSchedule(weekId, managerId);
    const v1Check = (await db.query<{ status: string }>('SELECT status FROM schedule_versions WHERE id = $1', [v1.versionId])).rows[0];
    const v2Check = (await db.query<{ status: string; version_label: string }>('SELECT status, version_label FROM schedule_versions WHERE id = $1', [v2Id])).rows[0];
    expect(v1Check.status).toBe('PUBLISHED'); // Untouched!
    expect(v2Check.status).toBe('DRAFT');
    expect(v2Check.version_label).toBe('V2');
  });

  it('enforces First Valid Accept Wins and concurrency safety for Cover requests', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);
    const coordService = new CoordinationService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run & publish
    const v1 = await schedulerService.runScheduler(weekId, managerId);
    await coordService.publishSchedule(weekId, v1.versionId, managerId);

    // Pick an operational assignment held by Ánh
    const anhId = userMap.get('0932101202')!;

    const anhAssign = (await db.query<{ id: string; shift_id: string }>(
      'SELECT id, shift_id FROM operational_shift_assignments WHERE week_id = $1 AND employee_id = $2 LIMIT 1',
      [weekId, anhId]
    )).rows[0];

    // Find 2 candidates who are NOT already assigned to this shift
    const candidateRows = (await db.query<{ employee_id: string }>(
      `SELECT e.id as employee_id 
       FROM employees e JOIN users u ON e.id = u.id
       WHERE u.role <> 'ADMIN' AND e.id <> $1
         AND e.id NOT IN (
           SELECT employee_id FROM operational_shift_assignments WHERE week_id = $2 AND shift_id = $3
         )
       LIMIT 2`,
      [anhId, weekId, anhAssign.shift_id]
    )).rows;

    const cand1Id = candidateRows[0].employee_id;
    const cand2Id = candidateRows[1].employee_id;

    // Ensure candidates have registered availability for this shift
    await db.query(
      `INSERT INTO employee_availabilities (week_id, shift_id, employee_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [weekId, anhAssign.shift_id, cand1Id]
    );

    await db.query(
      `INSERT INTO employee_availabilities (week_id, shift_id, employee_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [weekId, anhAssign.shift_id, cand2Id]
    );

    // Ánh creates Cover request inviting candidates
    const coverId = await coordService.createCoverRequest(anhId, anhAssign.id, [cand1Id, cand2Id], 'Nhờ hỗ trợ ca này');

    // Candidate 1 accepts first (First Valid Accept Wins)
    const acceptRes = await coordService.acceptCoverRequest(cand1Id, coverId);
    expect(acceptRes.success).toBe(true);
    expect(acceptRes.debtId).toBeDefined();

    // Verify operational assignment was transferred to Candidate 1
    const updatedAssign = (await db.query<{ employee_id: string }>(
      'SELECT employee_id FROM operational_shift_assignments WHERE id = $1',
      [anhAssign.id]
    )).rows[0];
    expect(updatedAssign.employee_id).toBe(cand1Id);

    // Verify immutable version snapshot was NOT mutated!
    const snapCheck = await db.query(
      'SELECT employee_id FROM schedule_version_assignments WHERE version_id = $1 AND shift_id = $2 AND employee_id = $3',
      [v1.versionId, anhAssign.shift_id, anhId]
    );
    expect(snapCheck.rows.length).toBe(1); // Ánh is STILL in V1 snapshot history!

    // Verify exactly ONE debt created: Ánh (debtor) owes Candidate 1 (creditor) 1 shift
    const debtRes = (await db.query<{ debtor_id: string; creditor_id: string; shifts_count: number; status: string }>(
      'SELECT debtor_id, creditor_id, shifts_count, status FROM debt_transactions WHERE id = $1',
      [acceptRes.debtId]
    )).rows[0];
    expect(debtRes.debtor_id).toBe(anhId);
    expect(debtRes.creditor_id).toBe(cand1Id);
    expect(debtRes.shifts_count).toBe(1);
    expect(debtRes.status).toBe('ACTIVE');

    // Candidate 2 tries to accept the same Cover request second -> FAILS with COVER_ALREADY_RESOLVED
    await expect(coordService.acceptCoverRequest(cand2Id, coverId)).rejects.toThrow('COVER_ALREADY_RESOLVED');
  });

  it('executes atomic two-way Swap without producing debt and validates point-in-time mutual availability', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);
    const schedulerService = new SchedulerService(db);
    const coordService = new CoordinationService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đủ điều kiện');

    // Run & publish
    const v1 = await schedulerService.runScheduler(weekId, managerId);
    await coordService.publishSchedule(weekId, v1.versionId, managerId);

    const anhId = userMap.get('0932101202')!;
    const nganId = userMap.get('0933223344')!;

    // Find 1 assignment for Ánh where Ngân is NOT in that shift
    const anhAssign = (await db.query<{ id: string; shift_id: string }>(
      `SELECT a.id, a.shift_id FROM operational_shift_assignments a
       WHERE a.week_id = $1 AND a.employee_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM operational_shift_assignments b
           WHERE b.shift_id = a.shift_id AND b.employee_id = $3
         )
       LIMIT 1`,
      [weekId, anhId, nganId]
    )).rows[0];

    // Find 1 assignment for Ngân where Ánh is NOT in that shift
    const nganAssign = (await db.query<{ id: string; shift_id: string }>(
      `SELECT a.id, a.shift_id FROM operational_shift_assignments a
       WHERE a.week_id = $1 AND a.employee_id = $2 AND a.shift_id <> $3
         AND NOT EXISTS (
           SELECT 1 FROM operational_shift_assignments b
           WHERE b.shift_id = a.shift_id AND b.employee_id = $4
         )
       LIMIT 1`,
      [weekId, nganId, anhAssign.shift_id, anhId]
    )).rows[0];

    // Register mutual availabilities
    await db.query(
      'INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [weekId, nganAssign.shift_id, anhId]
    );
    await db.query(
      'INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [weekId, anhAssign.shift_id, nganId]
    );

    // Count debts before swap
    const debtsBefore = Number((await db.query<{ count: string }>('SELECT COUNT(*) as count FROM debt_transactions')).rows[0].count);

    // Ánh creates Swap request proposing exchange with Ngân
    const swapId = await coordService.createSwapRequest(anhId, anhAssign.id, nganAssign.id, 'Đổi ca nhé Ngân');

    // Ngân accepts
    await coordService.acceptSwapRequest(nganId, swapId);

    // Verify swapped assignments in operational table
    const checkAnh = (await db.query<{ employee_id: string }>('SELECT employee_id FROM operational_shift_assignments WHERE id = $1', [anhAssign.id])).rows[0];
    const checkNgan = (await db.query<{ employee_id: string }>('SELECT employee_id FROM operational_shift_assignments WHERE id = $1', [nganAssign.id])).rows[0];

    expect(checkAnh.employee_id).toBe(nganId);
    expect(checkNgan.employee_id).toBe(anhId);

    // ZERO DEBT CREATED BY SWAP!
    const debtsAfter = Number((await db.query<{ count: string }>('SELECT COUNT(*) as count FROM debt_transactions')).rows[0].count);
    expect(debtsAfter).toBe(debtsBefore);
  });

  it('manages debt ledger, enforces non-negative debt and performs atomic 1:1 mutual offset', async () => {
    const db = await getTestDb();
    const { userMap } = await seedDatabase(db);
    const coordService = new CoordinationService(db);

    const empA = userMap.get('0932101202')!; // Ánh
    const empB = userMap.get('0933223344')!; // Ngân

    // Seed 2 reciprocal debts:
    // Debt 1: Ánh owes Ngân 1 shift
    const d1Res = await db.query<{ id: string }>(
      `INSERT INTO debt_transactions (debtor_id, creditor_id, shifts_count, status, action_description)
       VALUES ($1, $2, 1, 'ACTIVE', 'Ánh nợ Ngân ca T2') RETURNING id`,
      [empA, empB]
    );
    // Debt 2: Ngân owes Ánh 1 shift
    const d2Res = await db.query<{ id: string }>(
      `INSERT INTO debt_transactions (debtor_id, creditor_id, shifts_count, status, action_description)
       VALUES ($1, $2, 1, 'ACTIVE', 'Ngân nợ Ánh ca T4') RETURNING id`,
      [empB, empA]
    );

    const d1Id = d1Res.rows[0].id;
    const d2Id = d2Res.rows[0].id;

    // Check debt summary for Ánh
    const summary = await coordService.getDebtSummary(empA);
    expect(summary.iOwe.length).toBe(1);
    expect(summary.owedToMe.length).toBe(1);
    expect(summary.potentialOffsets.length).toBe(1);
    expect(summary.potentialOffsets[0].myDebtId).toBe(d1Id);
    expect(summary.potentialOffsets[0].counterDebtId).toBe(d2Id);

    // Perform atomic 1:1 reciprocal offset
    await coordService.offsetDebts(empA, d1Id, d2Id);

    // Verify both debts are OFFSET and linked
    const d1Check = (await db.query<{ status: string; offset_with_debt_id: string }>('SELECT status, offset_with_debt_id FROM debt_transactions WHERE id = $1', [d1Id])).rows[0];
    const d2Check = (await db.query<{ status: string; offset_with_debt_id: string }>('SELECT status, offset_with_debt_id FROM debt_transactions WHERE id = $1', [d2Id])).rows[0];

    expect(d1Check.status).toBe('OFFSET');
    expect(d1Check.offset_with_debt_id).toBe(d2Id);
    expect(d2Check.status).toBe('OFFSET');
    expect(d2Check.offset_with_debt_id).toBe(d1Id);

    // Active debts for Ánh is now 0
    const summaryAfter = await coordService.getDebtSummary(empA);
    expect(summaryAfter.iOwe.length).toBe(0);
    expect(summaryAfter.owedToMe.length).toBe(0);
    expect(summaryAfter.history.length).toBe(2);
  });
});
