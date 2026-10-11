import { describe, it, expect } from 'vitest';
import { getTestDb } from '../server/db/index';
import { seedDatabase } from '../server/db/seed';
import { AuthService, getJwtSecret } from '../server/services/authService';
import { ROLE_PERMISSIONS } from '../server/middleware/auth';

describe('Phase 2: Authentication & Authoritative Server RBAC', () => {
  it('supports initial login with phone number as default password and enforces first-login flag', async () => {
    const db = await getTestDb();
    await seedDatabase(db);
    const authService = new AuthService(db);

    // Login as Manager Nguyễn Minh Anh
    const loginRes = await authService.login('0912345678', '0912345678');
    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.name).toBe('Nguyễn Minh Anh');
    expect(loginRes.user.role).toBe('MANAGER');
    expect(loginRes.mustChangePassword).toBe(true);

    // Change password with < 6 chars fails
    await expect(authService.changePassword(loginRes.user.id, '12345')).rejects.toThrow('PASSWORD_TOO_SHORT');

    // Change password with >= 6 chars succeeds
    await authService.changePassword(loginRes.user.id, 'securePass2026');

    // Login with old password fails
    await expect(authService.login('0912345678', '0912345678')).rejects.toThrow('INVALID_CREDENTIALS');

    // Login with new password succeeds and mustChangePassword is false
    const newLoginRes = await authService.login('0912345678', 'securePass2026');
    expect(newLoginRes.mustChangePassword).toBe(false);
  });

  it('rejects invalid credentials and banned accounts', async () => {
    const db = await getTestDb();
    const { userMap } = await seedDatabase(db);
    const authService = new AuthService(db);

    // Non-existent phone
    await expect(authService.login('0999999999', 'anyPassword')).rejects.toThrow('INVALID_CREDENTIALS');

    // Ban official staff Ánh
    const adminId = userMap.get('0901999888')!;
    const anhId = userMap.get('0932101202')!;
    await authService.updateAccountStatus(adminId, anhId, 'BAN');

    // Banned user cannot log in
    await expect(authService.login('0932101202', '0932101202')).rejects.toThrow('ACCOUNT_BANNED');

    // Unban and log in succeeds
    await authService.updateAccountStatus(adminId, anhId, 'ACTIVE');
    const unbannedRes = await authService.login('0932101202', '0932101202');
    expect(unbannedRes.user.accountStatus).toBe('ACTIVE');
  });

  it('allows Admin to create employee accounts with default password = phone', async () => {
    const db = await getTestDb();
    const { userMap } = await seedDatabase(db);
    const authService = new AuthService(db);

    const adminId = userMap.get('0901999888')!;
    const newEmp = await authService.createEmployeeAccount(adminId, {
      phone: '0988 111 222',
      name: 'Ngô Thanh Vân',
      nickname: 'Vân',
      email: 'van.ngo@smartshift.vn',
      role: 'OFFICIAL_STAFF',
    });

    expect(newEmp.name).toBe('Ngô Thanh Vân');
    expect(newEmp.targetShifts).toBe(6);
    expect(newEmp.role).toBe('OFFICIAL_STAFF');

    // Verify login with initial phone password
    const loginRes = await authService.login('0988111222', '0988111222');
    expect(loginRes.user.name).toBe('Ngô Thanh Vân');
    expect(loginRes.mustChangePassword).toBe(true);
  });

  it('strictly enforces role permission boundaries: Admin cannot run scheduler, Workshop cannot act as Manager', () => {
    // ADMIN MUST NOT: run scheduler, review draft, override, publish
    expect(ROLE_PERMISSIONS.ADMIN.includes('scheduler.run')).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.includes('scheduler.review')).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.includes('scheduler.publish')).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.includes('scheduler.override')).toBe(false);

    // ADMIN can approve availability and manage employees
    expect(ROLE_PERMISSIONS.ADMIN.includes('availability.approve')).toBe(true);
    expect(ROLE_PERMISSIONS.ADMIN.includes('employees.manage')).toBe(true);

    // MANAGER is primary operator
    expect(ROLE_PERMISSIONS.MANAGER.includes('scheduler.run')).toBe(true);
    expect(ROLE_PERMISSIONS.MANAGER.includes('scheduler.publish')).toBe(true);
    expect(ROLE_PERMISSIONS.MANAGER.includes('schedule.manage')).toBe(true);

    // WORKSHOP is NOT Manager and cannot run scheduler
    expect(ROLE_PERMISSIONS.WORKSHOP.includes('scheduler.run')).toBe(false);
    expect(ROLE_PERMISSIONS.WORKSHOP.includes('scheduler.publish')).toBe(false);
    expect(ROLE_PERMISSIONS.WORKSHOP.includes('schedule.manage')).toBe(false);
  });

  describe('JWT Secret Security & Production Guard (getJwtSecret)', () => {
    it('strictly rejects missing or empty JWT_SECRET in production mode', () => {
      expect(() => getJwtSecret({ NODE_ENV: 'production' })).toThrow('JWT_SECRET_REQUIRED');
      expect(() => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '' })).toThrow('JWT_SECRET_REQUIRED');
      expect(() => getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '   ' })).toThrow('JWT_SECRET_REQUIRED');
    });

    it('accepts valid JWT_SECRET in production mode without leakage', () => {
      const prodSecret = 'prod_secret_random_strong_key_32_chars_long';
      expect(getJwtSecret({ NODE_ENV: 'production', JWT_SECRET: prodSecret })).toBe(prodSecret);
    });

    it('allows non-production environment (development / test) to use development fallback', () => {
      expect(getJwtSecret({ NODE_ENV: 'development' })).toBe('smartshift_development_secret_insecure_dev_only');
      expect(getJwtSecret({ NODE_ENV: 'test' })).toBe('smartshift_development_secret_insecure_dev_only');
      expect(getJwtSecret({})).toBe('smartshift_development_secret_insecure_dev_only');
    });

    it('uses custom JWT_SECRET in development/test if provided', () => {
      expect(getJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'custom_dev_key' })).toBe('custom_dev_key');
    });

    it('ensures signed tokens can be verified with the configured secret', async () => {
      const db = await getTestDb();
      await seedDatabase(db);
      const authService = new AuthService(db);

      const loginRes = await authService.login('0912345678', '0912345678');
      const { JWT_SECRET } = await import('../server/services/authService');
      const jwt = (await import('jsonwebtoken')).default;

      const decoded = jwt.verify(loginRes.token, JWT_SECRET) as any;
      expect(decoded.phone).toBe('0912345678');
      expect(decoded.role).toBe('MANAGER');
    });
  });
});
