import express, { Request, Response } from 'express';
import cors from 'cors';
import { PGlite } from '@electric-sql/pglite';
import { getDb } from './db/index.js';
import { seedDatabase } from './db/seed.js';
import { AuthService } from './services/authService.js';
import { AvailabilityService } from './services/availabilityService.js';
import { SchedulerService } from './services/schedulerService.js';
import { CoordinationService } from './services/coordinationService.js';
import { authenticate, requireRole, requirePermission, AuthenticatedRequest } from './middleware/auth.js';

export function createApp(db: PGlite) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const authService = new AuthService(db);
  const availService = new AvailabilityService(db);
  const schedulerService = new SchedulerService(db);
  const coordService = new CoordinationService(db);

  // Helper to format employee for frontend
  const formatEmployee = (row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    nickname: row.nickname || undefined,
    email: row.email,
    role: row.role,
    targetShifts: Number(row.target_shifts || 0),
    accountStatus: row.account_status,
    avatar: row.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    availabilityCount: Number(row.availability_count || 0),
    registrationCompleted: Boolean(row.registration_completed),
    needsExplanation: Boolean(row.needs_explanation),
    explanationText: row.explanation_text || undefined,
    explanationStatus: row.explanation_status || undefined,
  });

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // ==========================================
  // AUTH ROUTES
  // ==========================================
  app.post('/api/v1/auth/login', async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập số điện thoại và mật khẩu' });
      }
      const result = await authService.login(phone, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  app.post('/api/v1/auth/change-password', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu cũ và mới' });
      }
      await authService.changePassword(req.user!.id, newPassword, oldPassword);
      const user = await authService.getUserById(req.user!.id);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/auth/me', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const userRes = await db.query(
        `SELECT u.id, u.phone, u.role, u.account_status, u.is_first_login,
                e.name, e.nickname, e.email, e.avatar_url, e.target_shifts
         FROM users u
         JOIN employees e ON u.id = e.id
         WHERE u.id = $1`,
        [req.user!.id]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(formatEmployee(userRes.rows[0]));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // EMPLOYEES & ADMIN RBAC
  // ==========================================
  app.get('/api/v1/employees', authenticate(db), async (_req, res) => {
    try {
      const currentWeek = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const weekId = currentWeek?.id;

      const rows = (await db.query(
        `SELECT u.id, u.phone, u.role, u.account_status, u.is_first_login,
                e.name, e.nickname, e.email, e.avatar_url, e.target_shifts,
                (SELECT COUNT(*) FROM employee_availabilities ea WHERE ea.employee_id = u.id AND ea.week_id = $1) as availability_count,
                (SELECT reason FROM availability_explanations ax WHERE ax.employee_id = u.id AND ax.week_id = $1 ORDER BY ax.created_at DESC LIMIT 1) as explanation_text,
                (SELECT status FROM availability_explanations ax WHERE ax.employee_id = u.id AND ax.week_id = $1 ORDER BY ax.created_at DESC LIMIT 1) as explanation_status
         FROM users u
         JOIN employees e ON u.id = e.id
         ORDER BY 
           CASE u.role 
             WHEN 'ADMIN' THEN 1 
             WHEN 'MANAGER' THEN 2 
             WHEN 'WORKSHOP' THEN 3 
             WHEN 'OFFICIAL_STAFF' THEN 4 
             WHEN 'PROBATION_STAFF' THEN 5 
           END, e.name ASC`,
        [weekId]
      )).rows;

      const list = rows.map((r: any) => {
        const count = Number(r.availability_count || 0);
        let needsExp = false;
        if (r.role === 'OFFICIAL_STAFF') needsExp = count <= 6;
        else if (r.role === 'PROBATION_STAFF' || r.role === 'WORKSHOP') needsExp = count <= 4;

        const regComplete = !needsExp || r.explanation_status === 'APPROVED';

        return formatEmployee({
          ...r,
          availability_count: count,
          needs_explanation: needsExp,
          registration_completed: regComplete,
        });
      });

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/employees', authenticate(db), requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const { phone, name, email, role, nickname, dob, avatarUrl } = req.body;
      const created = await authService.createEmployeeAccount(req.user!.id, {
        phone,
        name,
        email,
        role,
        nickname,
        dob,
        avatarUrl,
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/v1/employees/:id/toggle-ban', authenticate(db), requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const empId = req.params.id;
      const userRes = (await db.query<{ account_status: string }>('SELECT account_status FROM users WHERE id = $1', [empId])).rows[0];
      if (!userRes) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });

      const newStatus = userRes.account_status === 'ACTIVE' ? 'BAN' : 'ACTIVE';
      await authService.updateAccountStatus(req.user!.id, empId, newStatus);
      res.json({ id: empId, accountStatus: newStatus });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // AVAILABILITY & EXPLANATION ROUTES
  // ==========================================
  app.get('/api/v1/availability/current-week', authenticate(db), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string; week_number: number; year: number; start_date: string; end_date: string; registration_open: string; registration_close: string; current_status: string }>(
        `SELECT id, week_number, year, start_date, end_date, registration_open, registration_close, current_status
         FROM schedule_weeks ORDER BY week_number DESC LIMIT 1`
      )).rows[0];

      const shifts = (await db.query(
        `SELECT id, day_of_week, shift_index, standard_required_count, special_required_count
         FROM shifts WHERE week_id = $1 ORDER BY day_of_week ASC, shift_index ASC`,
        [week.id]
      )).rows;

      res.json({ week, shifts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/availability/my', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const availabilities = (await db.query<{ shift_id: string }>(
        'SELECT shift_id FROM employee_availabilities WHERE week_id = $1 AND employee_id = $2',
        [week.id, req.user!.id]
      )).rows.map((r) => r.shift_id);

      const explanation = (await db.query(
        `SELECT id, submitted_count, target_count, reason, status, admin_note
         FROM availability_explanations WHERE week_id = $1 AND employee_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [week.id, req.user!.id]
      )).rows[0];

      res.json({ shiftIds: availabilities, explanation });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/availability/my', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const { shiftIds, explanation } = req.body;
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const result = await availService.updateAvailability(week.id, req.user!.id, shiftIds || []);
      if (explanation && result.needsExplanation) {
        await availService.submitExplanation(week.id, req.user!.id, explanation);
      }
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/availability/team', authenticate(db), requirePermission('availability.view_team'), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const avails = (await db.query(
        `SELECT ea.shift_id, ea.employee_id, u.role, e.name
         FROM employee_availabilities ea
         JOIN users u ON ea.employee_id = u.id
         JOIN employees e ON ea.employee_id = e.id
         WHERE ea.week_id = $1`,
        [week.id]
      )).rows;

      res.json(avails);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/availability/explanations', authenticate(db), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const rows = (await db.query(
        `SELECT ax.id, ax.employee_id as "employeeId", ax.submitted_count as "availabilityCount",
                ax.target_count as "targetShifts", ax.reason, ax.created_at as "submittedAt",
                ax.status, ax.admin_note as "adminNote", ax.reviewed_by as "reviewedBy", ax.reviewed_at as "reviewedAt"
         FROM availability_explanations ax
         WHERE ax.week_id = $1
         ORDER BY ax.created_at DESC`,
        [week.id]
      )).rows;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/v1/availability/explanations/:id', authenticate(db), requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const { status, note } = req.body;
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Trạng thái xét duyệt phải là APPROVED hoặc REJECTED' });
      }
      await availService.reviewExplanation(req.user!.id, req.params.id, status, note);
      res.json({ success: true, id: req.params.id, status });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/availability/readiness', authenticate(db), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const readiness = await availService.checkSchedulerReadiness(week.id);
      res.json(readiness);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // SCHEDULER & VERSIONING
  // ==========================================
  app.post('/api/v1/scheduler/run', authenticate(db), requirePermission('scheduler.run'), async (req: AuthenticatedRequest, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const result = await schedulerService.runScheduler(week.id, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/scheduler/versions', authenticate(db), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const rows = (await db.query(
        `SELECT v.id, v.version_label as version, v.status, v.created_at as "createdAt",
                v.published_at as "publishedAt", v.violations_summary as "violationsSummary",
                e.name as "createdBy"
         FROM schedule_versions v
         JOIN employees e ON v.created_by = e.id
         WHERE v.week_id = $1
         ORDER BY v.created_at DESC`,
        [week.id]
      )).rows;

      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/scheduler/versions/:id', authenticate(db), async (req, res) => {
    try {
      const ver = (await db.query<any>(
        `SELECT v.id, v.version_label as version, v.status, v.created_at as "createdAt",
                v.published_at as "publishedAt", v.violations_summary as "violationsSummary",
                e.name as "createdBy"
         FROM schedule_versions v
         JOIN employees e ON v.created_by = e.id
         WHERE v.id = $1`,
        [req.params.id]
      )).rows[0];

      if (!ver) return res.status(404).json({ error: 'Version not found' });

      // Get shifts with assigned employees
      const shiftsRes = (await db.query<any>(
        `SELECT ss.id, ss.day_of_week as "dayOfWeek", ss.shift_index as "shiftIndex",
                ss.required_count as "requiredCount",
                COALESCE(bool_or(sva.is_special_shift_assignment), false) as "isSpecialShift",
                COALESCE(bool_or(sva.is_fallback_assignment), false) as "specialShiftFallback",
                COALESCE(
                  json_agg(sva.employee_id) FILTER (WHERE sva.employee_id IS NOT NULL),
                  '[]'::json
                ) as "assignedEmployeeIds"
         FROM shifts ss
         LEFT JOIN schedule_version_assignments sva ON ss.id = sva.shift_id AND sva.version_id = $1
         WHERE ss.week_id = (SELECT week_id FROM schedule_versions WHERE id = $1)
         GROUP BY ss.id, ss.day_of_week, ss.shift_index, ss.required_count
         ORDER BY ss.day_of_week ASC, ss.shift_index ASC`,
        [req.params.id]
      )).rows;

      res.json({
        ...ver,
        shifts: shiftsRes.map((s: any) => ({
          ...s,
          requiredCount: s.isSpecialShift ? 3 : 2,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/scheduler/publish', authenticate(db), requirePermission('scheduler.publish'), async (req: AuthenticatedRequest, res) => {
    try {
      const { versionId } = req.body;
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      await coordService.publishSchedule(week.id, versionId, req.user!.id);
      res.json({ success: true, versionId, status: 'PUBLISHED' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/v1/scheduler/reopen', authenticate(db), requirePermission('scheduler.reopen'), async (req: AuthenticatedRequest, res) => {
    try {
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];
      const newVersionId = await coordService.reopenSchedule(week.id, req.user!.id);
      res.json({ success: true, newVersionId, status: 'DRAFT' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // OPERATIONAL ROSTER
  // ==========================================
  app.get('/api/v1/schedules/operational', authenticate(db), async (_req, res) => {
    try {
      const week = (await db.query<{ id: string; week_number: number; current_status: string }>(
        `SELECT id, week_number, current_status FROM schedule_weeks ORDER BY week_number DESC LIMIT 1`
      )).rows[0];

      // Operational shifts with current assigned employees
      const shiftsRes = (await db.query<any>(
        `SELECT ss.id, ss.day_of_week as "dayOfWeek", ss.shift_index as "shiftIndex",
                ss.required_count as "requiredCount",
                ss.is_special_shift as "isSpecialShift",
                COALESCE(
                  json_agg(osa.employee_id) FILTER (WHERE osa.employee_id IS NOT NULL),
                  '[]'::json
                ) as "assignedEmployeeIds"
         FROM shifts ss
         LEFT JOIN operational_shift_assignments osa ON ss.id = osa.shift_id
         WHERE ss.week_id = $1
         GROUP BY ss.id, ss.day_of_week, ss.shift_index, ss.required_count, ss.is_special_shift
         ORDER BY ss.day_of_week ASC, ss.shift_index ASC`,
        [week.id]
      )).rows;

      // Workload calculation
      const workloadRes = (await db.query<any>(
        `SELECT e.id as "employeeId", e.name as "employeeName", u.role, e.target_shifts as "target",
                COUNT(osa.id) as "actual"
         FROM users u
         JOIN employees e ON u.id = e.id
         LEFT JOIN operational_shift_assignments osa ON e.id = osa.employee_id AND osa.week_id = $1
         WHERE u.role <> 'ADMIN'
         GROUP BY e.id, e.name, u.role, e.target_shifts
         ORDER BY e.name ASC`,
        [week.id]
      )).rows;

      const workload = workloadRes.map((w: any) => {
        const actual = Number(w.actual);
        const target = Number(w.target);
        let status = 'OK';
        let note = '';
        if (actual < target) {
          status = 'WARNING';
          note = `Thiếu ${target - actual} ca`;
        } else if (actual > target) {
          status = actual > target + 1 ? 'OVERLOAD' : 'SURPLUS';
          note = `Vượt ${actual - target} ca`;
        }
        return {
          employeeId: w.employeeId,
          employeeName: w.employeeName,
          role: w.role,
          target,
          planned: actual,
          actual,
          status,
          note,
        };
      });

      res.json({
        week,
        shifts: shiftsRes.map((s: any) => ({
          ...s,
          requiredCount: s.isSpecialShift ? 3 : 2,
        })),
        workload,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // COORDINATION: COVER, SWAP, DEBT
  // ==========================================
  app.get('/api/v1/covers/candidates', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const shiftId = req.query.shiftId as string;
      if (!shiftId) return res.status(400).json({ error: 'Cần cung cấp shiftId' });

      const shift = (await db.query<{ day_of_week: number; week_id: string }>(
        'SELECT day_of_week, week_id FROM shifts WHERE id = $1',
        [shiftId]
      )).rows[0];

      // Get all active non-admin employees
      const employees = (await db.query<any>(
        `SELECT u.id, u.role, e.name, e.target_shifts,
                (SELECT COUNT(*) FROM employee_availabilities ea WHERE ea.employee_id = u.id AND ea.shift_id = $1) > 0 as has_avail,
                (SELECT COUNT(*) FROM operational_shift_assignments osa WHERE osa.employee_id = u.id AND osa.shift_id = $1) > 0 as is_assigned,
                (SELECT COUNT(*) FROM operational_shift_assignments osa 
                 JOIN shifts ss ON osa.shift_id = ss.id 
                 WHERE osa.employee_id = u.id AND ss.week_id = $2 AND ss.day_of_week = $3) as daily_count,
                (SELECT COUNT(*) FROM operational_shift_assignments osa WHERE osa.employee_id = u.id AND osa.week_id = $2) as total_workload
         FROM users u
         JOIN employees e ON u.id = e.id
         WHERE u.role <> 'ADMIN' AND u.account_status = 'ACTIVE' AND u.id <> $4`,
        [shiftId, shift.week_id, shift.day_of_week, req.user!.id]
      )).rows;

      const candidates = employees.map((e: any) => {
        const hasAvail = Boolean(e.has_avail);
        const isAssigned = Boolean(e.is_assigned);
        const dailyCount = Number(e.daily_count);
        const isMaxDaily = dailyCount >= 2;

        let category = 'UNAVAILABLE';
        let reason = '';

        if (isAssigned) {
          reason = 'Đang làm ca này (trùng ca)';
        } else if (isMaxDaily) {
          reason = 'Đã đạt giới hạn 2 ca/ngày';
        } else if (hasAvail) {
          category = 'SUITABLE';
          reason = 'Rảnh và đã đăng ký khả dụng';
        } else {
          category = 'SUPPORT';
          reason = 'Rảnh trong ngày, có thể gửi lời mời nhờ hỗ trợ';
        }

        return {
          employee: {
            id: e.id,
            name: e.name,
            role: e.role,
            targetShifts: Number(e.target_shifts),
          },
          category,
          reason,
          currentWorkload: Number(e.total_workload),
          hasAvailability: hasAvail,
          hasConflict: isAssigned || isMaxDaily,
          dailyShiftsCount: dailyCount,
        };
      });

      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/covers', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const { shiftId, invitedEmployeeIds, note } = req.body;
      const id = await coordService.createCoverRequest(req.user!.id, shiftId, invitedEmployeeIds || [], note);
      res.status(201).json({ id, status: 'PENDING' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/covers', authenticate(db), async (_req, res) => {
    try {
      const rows = (await db.query(
        `SELECT cr.id, cr.requester_id as "requesterId", cr.shift_id as "shiftId",
                ss.day_of_week as "dayOfWeek", ss.shift_index as "shiftIndex",
                cr.invited_candidate_ids as "invitedCandidateIds",
                cr.accepted_by_employee_id as "acceptedByEmployeeId",
                cr.accepted_at as "acceptedAt", cr.status, cr.created_at as "createdAt",
                cr.note
         FROM cover_requests cr
         JOIN shifts ss ON cr.shift_id = ss.id
         ORDER BY cr.created_at DESC`
      )).rows;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/covers/:id/accept', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      await coordService.acceptCoverRequest(req.user!.id, req.params.id);
      res.json({ success: true, id: req.params.id, status: 'COMPLETED' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/v1/covers/:id/cancel', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      await db.query(
        `UPDATE cover_requests SET status = 'CANCELLED' WHERE id = $1 AND requester_id = $2 AND status = 'PENDING'`,
        [req.params.id, req.user!.id]
      );
      res.json({ success: true, id: req.params.id, status: 'CANCELLED' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // SWAPS
  app.get('/api/v1/swaps/candidates', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const shiftId = req.query.shiftId as string;
      if (!shiftId) return res.status(400).json({ error: 'Cần shiftId' });

      const myId = req.user!.id;
      const assignments = (await db.query<any>(
        `SELECT osa.id as assignment_id, osa.employee_id, osa.shift_id,
                ss.day_of_week, ss.shift_index,
                e.name, u.role,
                (SELECT COUNT(*) FROM employee_availabilities ea WHERE ea.employee_id = $1 AND ea.shift_id = osa.shift_id) > 0 as requester_available,
                (SELECT COUNT(*) FROM employee_availabilities ea WHERE ea.employee_id = osa.employee_id AND ea.shift_id = $2) > 0 as candidate_available
         FROM operational_shift_assignments osa
         JOIN shifts ss ON osa.shift_id = ss.id
         JOIN users u ON osa.employee_id = u.id
         JOIN employees e ON osa.employee_id = e.id
         WHERE osa.employee_id <> $1 AND osa.shift_id <> $2`,
        [myId, shiftId]
      )).rows;

      const candidates = assignments.map((a: any) => {
        const reqAvail = Boolean(a.requester_available);
        const candAvail = Boolean(a.candidate_available);
        return {
          employee: {
            id: a.employee_id,
            name: a.name,
            role: a.role,
          },
          candidateShiftId: a.shift_id,
          candidateAssignmentId: a.assignment_id,
          candidateDayOfWeek: a.day_of_week,
          candidateShiftIndex: a.shift_index,
          isEligible: reqAvail && candAvail,
          checks: {
            noConflict: true,
            maxTwoPerDay: true,
            availabilityMatch: reqAvail && candAvail,
          },
        };
      });

      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/swaps', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const { myShiftId, targetShiftId, note } = req.body;
      const week = (await db.query<{ id: string }>('SELECT id FROM schedule_weeks ORDER BY week_number DESC LIMIT 1')).rows[0];

      const myAssign = (await db.query<{ id: string }>(
        'SELECT id FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2 AND employee_id = $3',
        [week.id, myShiftId, req.user!.id]
      )).rows[0];

      const targetAssign = (await db.query<{ id: string }>(
        'SELECT id FROM operational_shift_assignments WHERE week_id = $1 AND shift_id = $2',
        [week.id, targetShiftId]
      )).rows[0];

      if (!myAssign || !targetAssign) {
        return res.status(400).json({ error: 'Không tìm thấy phân ca hợp lệ để đổi' });
      }

      const id = await coordService.createSwapRequest(req.user!.id, myAssign.id, targetAssign.id, note);
      res.status(201).json({ id, status: 'PENDING' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/swaps', authenticate(db), async (_req, res) => {
    try {
      const rows = (await db.query(
        `SELECT sr.id, sr.requester_id as "requesterId", sr.target_employee_id as "targetEmployeeId",
                sr.requester_assignment_id as "requesterAssignmentId",
                sr.target_assignment_id as "targetAssignmentId",
                sr.status, sr.created_at as "createdAt", sr.note
         FROM swap_requests sr
         ORDER BY sr.created_at DESC`
      )).rows;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/swaps/:id/accept', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      await coordService.acceptSwapRequest(req.user!.id, req.params.id);
      res.json({ success: true, id: req.params.id, status: 'COMPLETED' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // DEBT
  app.get('/api/v1/debts/summary', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await coordService.getDebtSummary(req.user!.id);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/debts', authenticate(db), async (_req, res) => {
    try {
      const rows = (await db.query(
        `SELECT dt.id, dt.debtor_id as "debtorId", dt.creditor_id as "creditorId",
                dt.shifts_count as "shiftsCount", dt.action_description as "relatedAction",
                dt.status, dt.created_at as "createdAt", dt.settled_at as "settledAt",
                dt.offset_with_debt_id as "offsetWithDebtId"
         FROM debt_transactions dt
         ORDER BY dt.created_at DESC`
      )).rows;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/v1/debts/offset', authenticate(db), async (req: AuthenticatedRequest, res) => {
    try {
      const { debtIdA, debtIdB } = req.body;
      if (!debtIdA || !debtIdB) {
        return res.status(400).json({ error: 'Vui lòng cung cấp 2 mã khoản nợ đối ứng' });
      }
      await coordService.offsetDebts(req.user!.id, debtIdA, debtIdB);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // AUDIT LOGS
  app.get('/api/v1/audit-logs', authenticate(db), requirePermission('audit.view'), async (_req, res) => {
    try {
      const rows = (await db.query(
        `SELECT al.id, al.created_at as "timestamp", al.actor_id as "actorId",
                al.actor_name as "actorName", al.action, al.category,
                al.target_object as "targetObject", al.detail,
                al.result
         FROM audit_logs al
         ORDER BY al.created_at DESC LIMIT 100`
      )).rows;
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

// Start standalone server when run directly
if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT || 5000);
  getDb().then(async (db) => {
    await seedDatabase(db);
    const app = createApp(db);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SmartShift Backend Server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
