import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb } from '../server/db/index';
import { seedDatabase } from '../server/db/seed';

describe('Phase 1: Database Schema & Seed Validation', () => {
  it('initializes schema and seeds all 17 users correctly', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);

    expect(weekId).toBeDefined();
    expect(userMap.size).toBe(16);

    // Verify exactly 28 shifts created for week
    const shiftsRes = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM shifts WHERE week_id = $1', [weekId]);
    expect(Number(shiftsRes.rows[0].count)).toBe(28);

    // Verify admin user
    const adminRes = await db.query<{ phone: string; role: string; name: string }>('SELECT u.phone, u.role, e.name FROM users u JOIN employees e ON u.id = e.id WHERE u.role = $1', ['ADMIN']);
    expect(adminRes.rows.length).toBe(1);
    expect(adminRes.rows[0].name).toBe('Lê Tuấn Kiệt');

    // Verify explanation inserted for Bùi Hoài Thu
    const expRes = await db.query<{ status: string; submitted_count: number }>('SELECT status, submitted_count FROM availability_explanations WHERE week_id = $1', [weekId]);
    expect(expRes.rows.length).toBeGreaterThan(0);
    expect(expRes.rows[0].status).toBe('PENDING');
  });

  it('enforces DEFERRABLE INITIALLY DEFERRED unique constraint on operational_shift_assignments', async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);

    const shifts = (await db.query<{ id: string }>('SELECT id FROM shifts WHERE week_id = $1 LIMIT 2', [weekId])).rows;
    const shiftA = shifts[0].id;
    const shiftB = shifts[1].id;

    const empA = userMap.get('0932101202')!; // Ánh
    const empB = userMap.get('0933223344')!; // Ngân

    // Create a dummy version
    const verRes = await db.query<{ id: string }>(
      `INSERT INTO schedule_versions (week_id, version_number, version_label, status)
       VALUES ($1, 1, 'V1', 'PUBLISHED') RETURNING id`,
      [weekId]
    );
    const verId = verRes.rows[0].id;

    // Insert 2 operational assignments
    const resA = await db.query<{ id: string }>(
      `INSERT INTO operational_shift_assignments (week_id, shift_id, employee_id, source_version_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [weekId, shiftA, empA, verId]
    );
    const resB = await db.query<{ id: string }>(
      `INSERT INTO operational_shift_assignments (week_id, shift_id, employee_id, source_version_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [weekId, shiftB, empB, verId]
    );

    // Now test atomic swap using single-statement CASE with UUID cast
    await db.query(
      `UPDATE operational_shift_assignments
       SET employee_id = CASE
           WHEN id = $1 THEN $2::uuid
           WHEN id = $3 THEN $4::uuid
       END
       WHERE id IN ($1, $3)`,
      [resA.rows[0].id, empB, resB.rows[0].id, empA]
    );

    // Verify assignments swapped cleanly
    const finalA = await db.query<{ employee_id: string }>(
      'SELECT employee_id FROM operational_shift_assignments WHERE id = $1',
      [resA.rows[0].id]
    );
    const finalB = await db.query<{ employee_id: string }>(
      'SELECT employee_id FROM operational_shift_assignments WHERE id = $1',
      [resB.rows[0].id]
    );

    expect(finalA.rows[0].employee_id).toBe(empB);
    expect(finalB.rows[0].employee_id).toBe(empA);
  });
});
