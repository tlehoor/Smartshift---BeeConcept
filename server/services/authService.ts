import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { PGlite } from '@electric-sql/pglite';

export const JWT_SECRET = process.env.JWT_SECRET || 'smartshift_production_secret_key_2026';

export interface UserSession {
  id: string;
  phone: string;
  name: string;
  nickname?: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';
  targetShifts: number;
  avatarUrl?: string;
  isFirstLogin: boolean;
  accountStatus: 'ACTIVE' | 'BAN';
}

export class AuthService {
  constructor(private db: PGlite) {}

  normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  }

  async login(phone: string, password: string): Promise<{ token: string; user: UserSession; mustChangePassword: boolean }> {
    const cleanPhone = this.normalizePhone(phone);
    
    const userRes = await this.db.query<{
      id: string;
      phone: string;
      password_hash: string;
      role: string;
      account_status: string;
      is_first_login: boolean;
      name: string;
      nickname?: string;
      email: string;
      avatar_url?: string;
      target_shifts: number;
    }>(
      `SELECT u.id, u.phone, u.password_hash, u.role, u.account_status, u.is_first_login,
              e.name, e.nickname, e.email, e.avatar_url, e.target_shifts
       FROM users u
       JOIN employees e ON u.id = e.id
       WHERE u.phone = $1`,
      [cleanPhone]
    );

    if (userRes.rows.length === 0) {
      throw new Error('INVALID_CREDENTIALS: Số điện thoại không tồn tại trên hệ thống.');
    }

    const row = userRes.rows[0];

    if (row.account_status === 'BAN') {
      throw new Error('ACCOUNT_BANNED: Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS: Mật khẩu không chính xác.');
    }

    const user: UserSession = {
      id: row.id,
      phone: row.phone,
      name: row.name,
      nickname: row.nickname,
      email: row.email,
      role: row.role as any,
      targetShifts: row.target_shifts,
      avatarUrl: row.avatar_url,
      isFirstLogin: row.is_first_login,
      accountStatus: row.account_status as any,
    };

    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user,
      mustChangePassword: row.is_first_login,
    };
  }

  async changePassword(userId: string, newPassword: string, oldPassword?: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT: Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    if (oldPassword) {
      const userRes = await this.db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const isMatch = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
        if (!isMatch) {
          throw new Error('INVALID_OLD_PASSWORD: Mật khẩu hiện tại không chính xác.');
        }
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.db.query(
      `UPDATE users 
       SET password_hash = $1, is_first_login = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId]
    );
  }

  async getUserById(userId: string): Promise<UserSession | null> {
    const res = await this.db.query<{
      id: string;
      phone: string;
      role: string;
      account_status: string;
      is_first_login: boolean;
      name: string;
      nickname?: string;
      email: string;
      avatar_url?: string;
      target_shifts: number;
    }>(
      `SELECT u.id, u.phone, u.role, u.account_status, u.is_first_login,
              e.name, e.nickname, e.email, e.avatar_url, e.target_shifts
       FROM users u
       JOIN employees e ON u.id = e.id
       WHERE u.id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    return {
      id: r.id,
      phone: r.phone,
      name: r.name,
      nickname: r.nickname,
      email: r.email,
      role: r.role as any,
      targetShifts: r.target_shifts,
      avatarUrl: r.avatar_url,
      isFirstLogin: r.is_first_login,
      accountStatus: r.account_status as any,
    };
  }

  async createEmployeeAccount(adminUserId: string, data: {
    phone: string;
    name: string;
    nickname?: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';
    dob?: string;
    avatarUrl?: string;
  }): Promise<UserSession> {
    const cleanPhone = this.normalizePhone(data.phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('INVALID_PHONE: Số điện thoại không hợp lệ.');
    }

    const existing = await this.db.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
    if (existing.rows.length > 0) {
      throw new Error('PHONE_EXISTS: Số điện thoại này đã được đăng ký.');
    }

    // Default password = phone number
    const passwordHash = await bcrypt.hash(cleanPhone, 10);
    const targetShifts = data.role === 'OFFICIAL_STAFF' ? 6 : data.role === 'ADMIN' ? 0 : 4;

    const userRes = await this.db.query<{ id: string }>(
      `INSERT INTO users (phone, password_hash, role, account_status, is_first_login)
       VALUES ($1, $2, $3, 'ACTIVE', TRUE)
       RETURNING id`,
      [cleanPhone, passwordHash, data.role]
    );
    const newId = userRes.rows[0].id;

    await this.db.query(
      `INSERT INTO employees (id, name, nickname, email, dob, avatar_url, target_shifts)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, data.name, data.nickname || null, data.email, data.dob || null, data.avatarUrl || null, targetShifts]
    );

    // Audit log
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, (SELECT name FROM employees WHERE id = $1), 'Tạo tài khoản nhân viên', 'EMPLOYEE', $2, $3, 'SUCCESS')`,
      [adminUserId, data.name, `Tạo tài khoản với vai trò ${data.role}`]
    );

    return (await this.getUserById(newId))!;
  }

  async updateAccountStatus(adminUserId: string, targetUserId: string, newStatus: 'ACTIVE' | 'BAN'): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new Error('CANNOT_BAN_SELF: Quản trị viên không thể tự khóa tài khoản của chính mình.');
    }

    await this.db.query(
      `UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, targetUserId]
    );

    const targetEmp = await this.getUserById(targetUserId);
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, action, category, target_object, detail, result)
       VALUES ($1, (SELECT name FROM employees WHERE id = $1), $2, 'EMPLOYEE', $3, $4, 'SUCCESS')`,
      [
        adminUserId,
        newStatus === 'BAN' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
        targetEmp?.name || targetUserId,
        `Trạng thái tài khoản chuyển thành ${newStatus}`,
      ]
    );
  }

  async updateProfile(userId: string, data: { name?: string; nickname?: string; email?: string; dob?: string; avatarUrl?: string }): Promise<UserSession> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.nickname !== undefined) {
      fields.push(`nickname = $${idx++}`);
      values.push(data.nickname);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.dob !== undefined) {
      fields.push(`dob = $${idx++}`);
      values.push(data.dob);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(data.avatarUrl);
    }

    if (fields.length > 0) {
      values.push(userId);
      await this.db.query(
        `UPDATE employees SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        values
      );
    }

    return (await this.getUserById(userId))!;
  }
}
