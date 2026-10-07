import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index';
import { seedDatabase } from '../server/db/seed';
import { AvailabilityService } from '../server/services/availabilityService';

describe('Phase 3: Availability Window, Commitments & Low-Availability Approvals', () => {
  it('enforces weekly registration window boundary (rejects updates after window close)', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const service = new AvailabilityService(db);

    const empId = userMap.get('0932101202')!; // Ánh
    const shifts = (await db.query<{ id: string }>('SELECT id FROM shifts WHERE week_id = $1 LIMIT 5', [weekId])).rows.map(r => r.id);

    // Within window: Friday 14:00 (Open: Thursday 12:00, Close: Friday 21:00)
    const validTime = new Date('2026-10-09T14:00:00Z');
    const updateRes = await service.updateAvailability(weekId, empId, shifts, validTime);
    expect(updateRes.registeredCount).toBe(5);

    // After window: Saturday 09:00
    const pastDeadline = new Date('2026-10-10T09:00:00Z');
    await expect(
      service.updateAvailability(weekId, empId, shifts, pastDeadline)
    ).rejects.toThrow('REGISTRATION_WINDOW_CLOSED');
  });

  it('correctly flags low-availability explanation rules (Official <= 6, Probation <= 4)', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const service = new AvailabilityService(db);

    const validTime = new Date('2026-10-09T14:00:00Z');
    const shifts = (await db.query<{ id: string }>('SELECT id FROM shifts WHERE week_id = $1', [weekId])).rows.map(r => r.id);

    // Official staff registering exactly 6 shifts -> STILL REQUIRES EXPLANATION!
    const officialId = userMap.get('0933223344')!; // Ngân
    const res6 = await service.updateAvailability(weekId, officialId, shifts.slice(0, 6), validTime);
    expect(res6.needsExplanation).toBe(true);

    // Official staff registering 7 shifts -> NO EXPLANATION
    const res7 = await service.updateAvailability(weekId, officialId, shifts.slice(0, 7), validTime);
    expect(res7.needsExplanation).toBe(false);

    // Probation staff registering 4 shifts -> REQUIRES EXPLANATION
    const probationId = userMap.get('0971123456')!; // Minh
    const resProb4 = await service.updateAvailability(weekId, probationId, shifts.slice(0, 4), validTime);
    expect(resProb4.needsExplanation).toBe(true);

    // Probation staff registering 5 shifts -> NO EXPLANATION
    const resProb5 = await service.updateAvailability(weekId, probationId, shifts.slice(0, 5), validTime);
    expect(resProb5.needsExplanation).toBe(false);
  });

  it('blocks Scheduler from running until Admin approves pending low-availability explanations', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const service = new AvailabilityService(db);

    const adminId = userMap.get('0901999888')!;
    const managerId = userMap.get('0912345678')!;

    // In seed, Bùi Hoài Thu has 5 shifts (< 6) and a PENDING explanation
    const readinessBefore = await service.checkSchedulerReadiness(weekId);
    expect(readinessBefore.canRun).toBe(false);
    expect(readinessBefore.pendingCount).toBeGreaterThan(0);
    expect(readinessBefore.blockingReasons.some(r => r.includes('Bùi Hoài Thu'))).toBe(true);

    // Non-Admin cannot approve explanation
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await expect(
      service.reviewExplanation(managerId, expRow.id, 'APPROVED', 'Manager cannot approve')
    ).rejects.toThrow('FORBIDDEN');

    // Admin approves explanation
    await service.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Lý do chính đáng');

    // Now verify readiness is cleared
    const readinessAfter = await service.checkSchedulerReadiness(weekId);
    expect(readinessAfter.canRun).toBe(true);
    expect(readinessAfter.pendingCount).toBe(0);
  });
});
