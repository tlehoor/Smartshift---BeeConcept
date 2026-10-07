import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import { getTestDb } from '../server/db/index.js';
import { seedDatabase } from '../server/db/seed.js';
import { createApp } from '../server/index.js';
import { AvailabilityService } from '../server/services/availabilityService.js';

describe('Phase 6: REST API Server Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const db = await getTestDb();
    const { weekId, userMap } = await seedDatabase(db);
    const availService = new AvailabilityService(db);

    // Approve Bùi Hoài Thu's explanation so scheduler can run
    const adminId = userMap.get('0901999888')!;
    const expRow = (await db.query<{ id: string }>('SELECT id FROM availability_explanations WHERE week_id = $1 LIMIT 1', [weekId])).rows[0];
    await availService.reviewExplanation(adminId, expRow.id, 'APPROVED', 'Đồng ý duyệt');

    const app = createApp(db);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Login Admin (0901999888)
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0901999888', password: '0901999888' }),
    });
    const adminLogin = await adminLoginRes.json() as any;
    adminToken = adminLogin.token;

    // Login Manager (0912345678)
    const mgrLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0912345678', password: '0912345678' }),
    });
    const mgrLogin = await mgrLoginRes.json() as any;
    managerToken = mgrLogin.token;

    // Login Staff (0932101202 - Nguyễn Lan Ánh)
    const staffLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0932101202', password: '0932101202' }),
    });
    const staffLogin = await staffLoginRes.json() as any;
    staffToken = staffLogin.token;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
  });

  it('authenticates and enforces RBAC on sensitive endpoints', async () => {
    // Staff trying to run scheduler -> 403 Forbidden
    const unauthScheduler = await fetch(`${baseUrl}/api/v1/scheduler/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(unauthScheduler.status).toBe(403);

    // Admin trying to run scheduler -> 403 Forbidden (Admin MUST NOT run scheduler)
    const adminScheduler = await fetch(`${baseUrl}/api/v1/scheduler/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminScheduler.status).toBe(403);

    // Manager CAN run scheduler
    const mgrScheduler = await fetch(`${baseUrl}/api/v1/scheduler/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(mgrScheduler.status).toBe(200);
    const runResult = await mgrScheduler.json() as any;
    expect(runResult.versionLabel).toBe('V1');
  });

  it('handles availability registration, readiness check and explanation lifecycle via API', async () => {
    // Check readiness
    const readyRes = await fetch(`${baseUrl}/api/v1/availability/readiness`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(readyRes.status).toBe(200);
    const readyData = await readyRes.json() as any;
    expect(readyData.canRun).toBe(true);

    // Get my availability
    const myAvailRes = await fetch(`${baseUrl}/api/v1/availability/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(myAvailRes.status).toBe(200);
    const myAvail = await myAvailRes.json() as any;
    expect(Array.isArray(myAvail.shiftIds)).toBe(true);
  });

  it('manages schedule versions, publishing and operational roster via API', async () => {
    // Get versions
    const versionsRes = await fetch(`${baseUrl}/api/v1/scheduler/versions`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(versionsRes.status).toBe(200);
    const versions = await versionsRes.json() as any;
    expect(versions.length).toBeGreaterThanOrEqual(1);

    const v1 = versions[0];

    // Manager publishes V1
    const pubRes = await fetch(`${baseUrl}/api/v1/scheduler/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ versionId: v1.id }),
    });
    expect(pubRes.status).toBe(200);
    const pubData = await pubRes.json() as any;
    expect(pubData.status).toBe('PUBLISHED');

    // Get operational roster
    const opRes = await fetch(`${baseUrl}/api/v1/schedules/operational`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(opRes.status).toBe(200);
    const opData = await opRes.json() as any;
    expect(opData.shifts.length).toBe(28);
    expect(opData.workload.length).toBeGreaterThan(0);
  });

  it('supports cover requests and query endpoints via API', async () => {
    // Get operational shifts
    const opRes = await fetch(`${baseUrl}/api/v1/schedules/operational`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const opData = await opRes.json() as any;
    const firstShift = opData.shifts[0];

    // Get candidates for cover
    const candRes = await fetch(`${baseUrl}/api/v1/covers/candidates?shiftId=${firstShift.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(candRes.status).toBe(200);
    const candidates = await candRes.json() as any;
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);

    // Get audit logs (Admin only)
    const auditRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(auditRes.status).toBe(200);
    const auditLogs = await auditRes.json() as any;
    expect(auditLogs.length).toBeGreaterThan(0);
  });
});
