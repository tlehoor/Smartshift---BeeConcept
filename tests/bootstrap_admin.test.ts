import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index.js';
import { bootstrapAdmin, checkAdminExists } from '../server/db/bootstrapAdmin.js';
import { AuthService } from '../server/services/authService.js';

describe('Initial Admin Bootstrap Mechanism (bootstrapAdmin)', () => {
  it('successfully creates the first ADMIN account on an empty database', async () => {
    const db = await getTestDb();

    // Verify initially no admin exists
    expect(await checkAdminExists(db)).toBe(false);

    // Bootstrap first admin
    const result = await bootstrapAdmin({
      client: db,
      phone: '0901999888',
      name: 'Nguyễn Văn Quản Trị',
      email: 'admin@smartshift.vn',
      password: 'AdminPassword2026!',
    });

    expect(result.success).toBe(true);
    expect(result.phone).toBe('0901999888');
    expect(result.name).toBe('Nguyễn Văn Quản Trị');
    expect(result.email).toBe('admin@smartshift.vn');
    expect(result.adminId).toBeDefined();

    // Verify admin now exists in DB
    expect(await checkAdminExists(db)).toBe(true);

    // Verify created admin can authenticate via AuthService.login
    const authService = new AuthService(db);
    const loginRes = await authService.login('0901999888', 'AdminPassword2026!');

    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.role).toBe('ADMIN');
    expect(loginRes.user.name).toBe('Nguyễn Văn Quản Trị');
    expect(loginRes.user.phone).toBe('0901999888');
    expect(loginRes.user.accountStatus).toBe('ACTIVE');
    expect(loginRes.mustChangePassword).toBe(false);

    // Verify audit log record was created
    const auditRes = await db.query('SELECT * FROM audit_logs WHERE actor_id = $1', [result.adminId]);
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].category).toBe('SYSTEM');
  });

  it('strictly aborts and refuses to create a second admin when an ADMIN already exists', async () => {
    const db = await getTestDb();

    // Create first admin
    await bootstrapAdmin({
      client: db,
      phone: '0901111222',
      name: 'Admin Ban Đầu',
      email: 'initial.admin@smartshift.vn',
      password: 'AdminInitialPass123!',
    });

    // Attempting to bootstrap a second admin MUST throw BOOTSTRAP_ADMIN_ABORTED
    await expect(
      bootstrapAdmin({
        client: db,
        phone: '0903333444',
        name: 'Admin Thứ Hai',
        email: 'second.admin@smartshift.vn',
        password: 'SecondAdminPass123!',
      })
    ).rejects.toThrow('BOOTSTRAP_ADMIN_ABORTED');

    // Verify the second admin was NOT created
    const countRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'");
    expect(Number(countRes.rows[0].count)).toBe(1);
  });

  describe('Input validation checks', () => {
    it('rejects invalid or too short phone numbers', async () => {
      const db = await getTestDb();

      await expect(
        bootstrapAdmin({
          client: db,
          phone: '1234',
          name: 'Admin Test',
          email: 'admin@test.vn',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('VALIDATION_FAILED: Số điện thoại không hợp lệ');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const db = await getTestDb();

      await expect(
        bootstrapAdmin({
          client: db,
          phone: '0901234567',
          name: 'Admin Test',
          email: 'admin@test.vn',
          password: 'short',
        })
      ).rejects.toThrow('VALIDATION_FAILED: Mật khẩu quản trị viên phải có tối thiểu 8 ký tự.');
    });

    it('rejects invalid email formats', async () => {
      const db = await getTestDb();

      await expect(
        bootstrapAdmin({
          client: db,
          phone: '0901234567',
          name: 'Admin Test',
          email: 'not-an-email',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('VALIDATION_FAILED: Email không hợp lệ.');
    });

    it('rejects empty or whitespace-only name', async () => {
      const db = await getTestDb();

      await expect(
        bootstrapAdmin({
          client: db,
          phone: '0901234567',
          name: '   ',
          email: 'admin@test.vn',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('VALIDATION_FAILED: Tên quản trị viên không hợp lệ');
    });

    it('ensures rollback on failure and preserves data integrity', async () => {
      const db = await getTestDb();

      // Attempt bootstrap with an invalid email but valid phone
      await expect(
        bootstrapAdmin({
          client: db,
          phone: '0909888777',
          name: 'Rollback Test Admin',
          email: 'invalid-email',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('VALIDATION_FAILED: Email không hợp lệ.');

      // Verify no records inserted
      const usersRes = await db.query('SELECT COUNT(*) as count FROM users');
      expect(Number(usersRes.rows[0].count)).toBe(0);
      const empRes = await db.query('SELECT COUNT(*) as count FROM employees');
      expect(Number(empRes.rows[0].count)).toBe(0);
    });

    it('rolls back completely if existing admin is discovered after advisory lock acquisition', async () => {
      const db = await getTestDb();

      // Bootstrap initial admin
      await bootstrapAdmin({
        client: db,
        phone: '0901111222',
        name: 'Initial Admin',
        email: 'initial@smartshift.vn',
        password: 'ValidPassword123!',
      });

      // Second attempt
      await expect(
        bootstrapAdmin({
          client: db,
          phone: '0902222333',
          name: 'Second Admin',
          email: 'second@smartshift.vn',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow('BOOTSTRAP_ADMIN_ABORTED');

      // Verify no second user or employee was created
      const countRes = await db.query('SELECT COUNT(*) as count FROM users');
      expect(Number(countRes.rows[0].count)).toBe(1);
      const auditRes = await db.query('SELECT COUNT(*) as count FROM audit_logs');
      expect(Number(auditRes.rows[0].count)).toBe(1);
    });
  });
});
