import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index.js';
import { seedDatabase } from '../server/db/seed.js';
import { AvailabilityService } from '../server/services/availabilityService.js';
import { SchedulerService } from '../server/services/schedulerService.js';
import { CoordinationService } from '../server/services/coordinationService.js';

describe('Concurrency Stress & Point-In-Time Revalidation Suite', () => {
  it('handles race conditions in Cover requests: First Valid Accept Wins and prevents duplicate debt', async () => {
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

    const empA = userMap.get('0932101202')!; // Nguyễn Lan Ánh (requester)
    const empB = userMap.get('0933223344')!; // Hoàng Kim Ngân (candidate 1)
    const empC = userMap.get('0934334455')!; // Vũ Gia Hân (candidate 2)

    // Find 1 assignment of Ánh
    const assignA = (await db.query<{ id: string; shift_id: string }>(
      'SELECT id, shift_id FROM operational_shift_assignments WHERE week_id = $1 AND employee_id = $2 LIMIT 1',
      [weekId, empA]
    )).rows[0];

    // Ensure candidates B and C have availability and are free
    await db.query(
      'INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [weekId, assignA.shift_id, empB]
    );
    await db.query(
      'INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [weekId, assignA.shift_id, empC]
    );
    await db.query(
      'DELETE FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id IN ($3, $4)',
      [weekId, assignA.shift_id, empB, empC]
    );

    // Ánh creates Cover request inviting both B and C
    const coverId = await coordService.createCoverRequest(empA, assignA.id, [empB, empC], 'Nhờ ca gấp');

    // Candidate B and Candidate C race to accept the SAME cover request concurrently:
    const results = await Promise.allSettled([
      coordService.acceptCoverRequest(empB, coverId),
      coordService.acceptCoverRequest(empC, coverId),
    ]);

    // Exactly ONE promise must be fulfilled, and ONE must be rejected!
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Exactly ONE debt transaction must be created in the ledger!
    const debtsRes = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM debt_transactions WHERE cover_request_id = $1',
      [coverId]
    );
    expect(Number(debtsRes.rows[0].count)).toBe(1);

    // Verify request is COMPLETED and assigned to the winner
    const reqRes = (await db.query<{ status: string; accepted_by: string }>(
      'SELECT status, accepted_by FROM cover_requests WHERE id = $1',
      [coverId]
    )).rows[0];
    expect(reqRes.status).toBe('COMPLETED');
    expect([empB, empC]).toContain(reqRes.accepted_by);
  });

  it('prevents daily overload race: when candidate reaches 2 shifts/day, subsequent cover accepts are rejected', async () => {
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

    const empCandidate = userMap.get('0933223344')!; // Hoàng Kim Ngân

    // Pick day 1 (Thứ Hai): Ca 1, Ca 2, Ca 3
    const day1Shifts = (await db.query<{ id: string; shift_index: number }>(
      'SELECT id, shift_index FROM shifts WHERE week_id = $1 AND day_of_week = 1 ORDER BY shift_index',
      [weekId]
    )).rows;

    const s1 = day1Shifts[0].id;
    const s2 = day1Shifts[1].id;
    const s3 = day1Shifts[2].id;

    // Remove candidate from all day 1 shifts initially
    await db.query('DELETE FROM operational_shift_assignments WHERE week_id = $1 AND shift_id IN ($2, $3, $4) AND employee_id = $5', [weekId, s1, s2, s3, empCandidate]);

    // Give candidate availability for s1, s2, s3
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [weekId, s1, empCandidate]);
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [weekId, s2, empCandidate]);
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [weekId, s3, empCandidate]);

    // Find assignments and owners for s1, s2, s3
    const assign1 = (await db.query<{ id: string; employee_id: string }>('SELECT id, employee_id FROM operational_shift_assignments WHERE shift_id = $1 LIMIT 1', [s1])).rows[0];
    const assign2 = (await db.query<{ id: string; employee_id: string }>('SELECT id, employee_id FROM operational_shift_assignments WHERE shift_id = $1 LIMIT 1', [s2])).rows[0];
    const assign3 = (await db.query<{ id: string; employee_id: string }>('SELECT id, employee_id FROM operational_shift_assignments WHERE shift_id = $1 LIMIT 1', [s3])).rows[0];

    const req1 = await coordService.createCoverRequest(assign1.employee_id, assign1.id, [empCandidate], 'Ca 1');
    const req2 = await coordService.createCoverRequest(assign2.employee_id, assign2.id, [empCandidate], 'Ca 2');
    const req3 = await coordService.createCoverRequest(assign3.employee_id, assign3.id, [empCandidate], 'Ca 3');

    // Accept 1 -> success (1/2 shifts on Day 1)
    await coordService.acceptCoverRequest(empCandidate, req1);

    // Accept 2 -> success (2/2 shifts on Day 1 - CAP REACHED!)
    await coordService.acceptCoverRequest(empCandidate, req2);

    // Accept 3 -> MUST BE REJECTED! (Would be 3/2 shifts on Day 1)
    await expect(coordService.acceptCoverRequest(empCandidate, req3)).rejects.toThrow('DAILY_CAP_EXCEEDED');

    // Verify candidate is assigned to exactly 2 shifts on Day 1
    const finalDay1Count = (await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM operational_shift_assignments osa
       JOIN shifts s ON osa.shift_id = s.id
       WHERE osa.week_id = $1 AND s.day_of_week = 1 AND osa.employee_id = $2`,
      [weekId, empCandidate]
    )).rows[0].count;
    expect(Number(finalDay1Count)).toBe(2);
  });

  it('rejects Cover acceptance if candidate availability is revoked or requester no longer owns shift', async () => {
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

    const empRequester = userMap.get('0932101202')!; // Ánh
    const empCandidate = userMap.get('0933223344')!; // Ngân
    const otherEmployee = userMap.get('0934334455')!; // Hân

    const assign = (await db.query<{ id: string; shift_id: string }>(
      'SELECT id, shift_id FROM operational_shift_assignments WHERE week_id = $1 AND employee_id = $2 LIMIT 1',
      [weekId, empRequester]
    )).rows[0];

    // Create Cover request
    const coverId = await coordService.createCoverRequest(empRequester, assign.id, [empCandidate], 'Nhờ ca');

    // 1. Candidate does not have availability for shift -> REJECTED
    await db.query('DELETE FROM employee_availabilities WHERE employee_id = $1 AND shift_id = $2', [empCandidate, assign.shift_id]);
    await expect(coordService.acceptCoverRequest(empCandidate, coverId)).rejects.toThrow('CANDIDATE_NO_LONGER_AVAILABLE');

    // Restore candidate availability
    await db.query('INSERT INTO employee_availabilities (week_id, shift_id, employee_id) VALUES ($1, $2, $3)', [weekId, assign.shift_id, empCandidate]);

    // 2. Requester no longer owns shift (e.g. was reassigned or swapped to another employee) -> REJECTED
    await db.query('UPDATE operational_shift_assignments SET employee_id = $1 WHERE id = $2', [otherEmployee, assign.id]);
    await expect(coordService.acceptCoverRequest(empCandidate, coverId)).rejects.toThrow('STALE_ASSIGNMENT');
  });

  it('prevents duplicate debt offsets and ensures debt ledger never becomes negative', async () => {
    const db = await getTestDb();
    const { userMap } = await seedDatabase(db);
    const coordService = new CoordinationService(db);

    const empA = userMap.get('0932101202')!; // Ánh
    const empB = userMap.get('0933223344')!; // Ngân

    // Seed reciprocal debts
    const d1Res = await db.query<{ id: string }>(
      `INSERT INTO debt_transactions (debtor_id, creditor_id, shifts_count, status, action_description)
       VALUES ($1, $2, 1, 'ACTIVE', 'Ánh nợ Ngân ca 1') RETURNING id`,
      [empA, empB]
    );
    const d2Res = await db.query<{ id: string }>(
      `INSERT INTO debt_transactions (debtor_id, creditor_id, shifts_count, status, action_description)
       VALUES ($1, $2, 1, 'ACTIVE', 'Ngân nợ Ánh ca 2') RETURNING id`,
      [empB, empA]
    );

    const d1Id = d1Res.rows[0].id;
    const d2Id = d2Res.rows[0].id;

    // First offset succeeds
    await coordService.offsetDebts(empA, d1Id, d2Id);

    // Duplicate offset attempt on already-offset debts MUST fail!
    await expect(coordService.offsetDebts(empA, d1Id, d2Id)).rejects.toThrow('ACTIVE');

    // Verify both debts remain in status OFFSET with remaining non-negative balance
    const d1Check = (await db.query<{ status: string; shifts_count: number }>('SELECT status, shifts_count FROM debt_transactions WHERE id = $1', [d1Id])).rows[0];
    const d2Check = (await db.query<{ status: string; shifts_count: number }>('SELECT status, shifts_count FROM debt_transactions WHERE id = $1', [d2Id])).rows[0];

    expect(d1Check.status).toBe('OFFSET');
    expect(d2Check.status).toBe('OFFSET');
    expect(d1Check.shifts_count).toBeGreaterThanOrEqual(0);
    expect(d2Check.shifts_count).toBeGreaterThanOrEqual(0);
  });
});
