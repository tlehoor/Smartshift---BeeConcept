import bcrypt from 'bcryptjs';
import type { PGlite } from '@electric-sql/pglite';

export interface SeedUserDef {
  phone: string;
  name: string;
  nickname?: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';
  targetShifts: number;
  dob?: string;
  avatarUrl?: string;
}

export const SEED_USERS: SeedUserDef[] = [
  // ADMIN
  {
    phone: '0901999888',
    name: 'Lê Tuấn Kiệt',
    nickname: 'Kiệt (Admin)',
    email: 'kiet.le@smartshift.vn',
    role: 'ADMIN',
    targetShifts: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  // MANAGERS
  {
    phone: '0912345678',
    name: 'Nguyễn Minh Anh',
    nickname: 'Minh Anh',
    email: 'minhanh.nguyen@smartshift.vn',
    role: 'MANAGER',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0903112233',
    name: 'Trần Thu Trang',
    nickname: 'Chị Trang',
    email: 'trang.tran@smartshift.vn',
    role: 'MANAGER',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0908445566',
    name: 'Lê Phương Thảo',
    nickname: 'Thảo',
    email: 'thao.le@smartshift.vn',
    role: 'MANAGER',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  // WORKSHOP
  {
    phone: '0918778899',
    name: 'Nguyễn Thái Linh',
    nickname: 'Thái Linh',
    email: 'thailinh.nguyen@smartshift.vn',
    role: 'WORKSHOP',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  // OFFICIAL STAFF (Target = 6)
  {
    phone: '0932101202',
    name: 'Phạm Ngọc Ánh',
    nickname: 'Ánh',
    email: 'anh.pham@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0933223344',
    name: 'Hoàng Kim Ngân',
    nickname: 'Ngân',
    email: 'ngan.hoang@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0934334455',
    name: 'Vũ Gia Hân',
    nickname: 'Hân',
    email: 'han.vu@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0935445566',
    name: 'Đỗ Thùy Trang',
    nickname: 'Thùy Trang',
    email: 'thuytrang.do@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0936556677',
    name: 'Bùi Hoài Thu',
    nickname: 'Thu',
    email: 'thu.bui@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0937667788',
    name: 'Đặng Hương Giang',
    nickname: 'Giang',
    email: 'giang.dang@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0938778899',
    name: 'Trịnh Tố Uyên',
    nickname: 'Uyên',
    email: 'uyen.trinh@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0939889900',
    name: 'Lý Quỳnh Trâm',
    nickname: 'Trâm',
    email: 'tram.ly@smartshift.vn',
    role: 'OFFICIAL_STAFF',
    targetShifts: 6,
    avatarUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80',
  },
  // PROBATION STAFF (Target = 4)
  {
    phone: '0971123456',
    name: 'Trần Quang Minh',
    nickname: 'Minh',
    email: 'minh.tran@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0972234567',
    name: 'Lê Mai Phương',
    nickname: 'Phương',
    email: 'phuong.le@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
  },
  {
    phone: '0973345678',
    name: 'Nguyễn Anh Đức',
    nickname: 'Đức',
    email: 'duc.nguyen@smartshift.vn',
    role: 'PROBATION_STAFF',
    targetShifts: 4,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
];

export async function seedDatabase(db: PGlite): Promise<{ weekId: string; userMap: Map<string, string> }> {
  const userMap = new Map<string, string>(); // phone -> user_id

  const rounds = process.env.NODE_ENV === 'test' ? 4 : 10;

  // 1. Seed Users and Employees
  for (const u of SEED_USERS) {
    const rawPhone = u.phone.replace(/\s+/g, '');
    const passwordHash = await bcrypt.hash(rawPhone, rounds); // default password = phone number

    // Check if already exists
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE phone = $1',
      [rawPhone]
    );

    let userId: string;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      const userRes = await db.query<{ id: string }>(
        `INSERT INTO users (phone, password_hash, role, account_status, is_first_login)
         VALUES ($1, $2, $3, 'ACTIVE', TRUE)
         RETURNING id`,
        [rawPhone, passwordHash, u.role]
      );
      userId = userRes.rows[0].id;

      await db.query(
        `INSERT INTO employees (id, name, nickname, email, avatar_url, target_shifts)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, u.name, u.nickname || null, u.email, u.avatarUrl || null, u.targetShifts]
      );
    }
    userMap.set(rawPhone, userId);
  }

  // 2. Seed Schedule Week 41 (12/10/2026 - 18/10/2026)
  const weekNumber = 41;
  const year = 2026;
  const startDate = '2026-10-12';
  const endDate = '2026-10-18';
  const regOpen = '2026-10-08T12:00:00Z'; // Thursday 12:00
  const regClose = '2026-10-09T21:00:00Z'; // Friday 21:00

  const weekRes = await db.query<{ id: string }>(
    `INSERT INTO schedule_weeks (week_number, year, start_date, end_date, current_status, registration_open, registration_close)
     VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6)
     ON CONFLICT (week_number, year) DO UPDATE SET current_status = EXCLUDED.current_status
     RETURNING id`,
    [weekNumber, year, startDate, endDate, regOpen, regClose]
  );
  const weekId = weekRes.rows[0].id;

  // 3. Seed 28 Shifts for this week
  for (let d = 1; d <= 7; d++) {
    for (let s = 1; s <= 4; s++) {
      await db.query(
        `INSERT INTO shifts (week_id, day_of_week, shift_index, is_special_shift, required_count)
         VALUES ($1, $2, $3, FALSE, 2)
         ON CONFLICT (week_id, day_of_week, shift_index) DO NOTHING`,
        [weekId, d, s]
      );
    }
  }

  // 4. Seed baseline Availabilities for active employees
  const shiftsRes = await db.query<{ id: string; day_of_week: number; shift_index: number }>(
    'SELECT id, day_of_week, shift_index FROM shifts WHERE week_id = $1 ORDER BY day_of_week, shift_index',
    [weekId]
  );
  const shifts = shiftsRes.rows;

  // For each employee, register realistic availability
  for (const u of SEED_USERS) {
    if (u.role === 'ADMIN') continue;
    const empId = userMap.get(u.phone.replace(/\s+/g, ''))!;

    // Distribute slots according to role target + surplus
    const slotsCount = u.targetShifts === 6 ? 8 : u.targetShifts === 4 ? 6 : 5;
    // Special case for explanation test: Bùi Hoài Thu registers 5 slots (< 6)
    const countToRegister = u.name === 'Bùi Hoài Thu' ? 5 : slotsCount;

    // Pick deterministic slots based on phone digits
    const seedOffset = parseInt(u.phone.slice(-2), 10) % 7;
    for (let i = 0; i < countToRegister; i++) {
      const shiftIdx = (i * 3 + seedOffset) % shifts.length;
      const targetShift = shifts[shiftIdx];

      await db.query(
        `INSERT INTO employee_availabilities (week_id, shift_id, employee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (week_id, shift_id, employee_id) DO NOTHING`,
        [weekId, targetShift.id, empId]
      );
    }

    // If Bùi Hoài Thu (5 < 6), insert required explanation
    if (u.name === 'Bùi Hoài Thu') {
      await db.query(
        `INSERT INTO availability_explanations (week_id, employee_id, submitted_count, target_count, reason, status)
         VALUES ($1, $2, 5, 6, 'Em có lịch thi chứng chỉ nghiệp vụ vào Thứ 7 và Chủ Nhật nên xin đăng ký 5 ca.', 'PENDING')`,
        [weekId, empId]
      );
    }
  }

  return { weekId, userMap };
}
