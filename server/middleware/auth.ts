import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../services/authService';
import type { PGlite } from '@electric-sql/pglite';

export type Role = 'ADMIN' | 'MANAGER' | 'OFFICIAL_STAFF' | 'PROBATION_STAFF' | 'WORKSHOP';

export type Permission =
  | 'dashboard.view'
  | 'schedule.view'
  | 'schedule.manage'
  | 'availability.manage_own'
  | 'availability.view_team'
  | 'scheduler.run'
  | 'scheduler.review'
  | 'scheduler.override'
  | 'scheduler.publish'
  | 'scheduler.reopen'
  | 'cover.create'
  | 'cover.respond'
  | 'swap.create'
  | 'swap.respond'
  | 'debt.view'
  | 'debt.settle'
  | 'employees.view'
  | 'employees.manage'
  | 'availability.approve'
  | 'audit.view'
  | 'system.settings';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'dashboard.view',
    'schedule.view',
    'employees.view',
    'employees.manage',
    'availability.approve',
    'audit.view',
    'system.settings',
  ],
  MANAGER: [
    'dashboard.view',
    'schedule.view',
    'schedule.manage',
    'availability.manage_own',
    'availability.view_team',
    'scheduler.run',
    'scheduler.review',
    'scheduler.override',
    'scheduler.publish',
    'scheduler.reopen',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
    'debt.settle',
    'employees.view',
    'system.settings',
  ],
  OFFICIAL_STAFF: [
    'dashboard.view',
    'schedule.view',
    'availability.manage_own',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
    'debt.settle',
    'system.settings',
  ],
  PROBATION_STAFF: [
    'dashboard.view',
    'schedule.view',
    'availability.manage_own',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
    'debt.settle',
    'system.settings',
  ],
  WORKSHOP: [
    'dashboard.view',
    'schedule.view',
    'availability.manage_own',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
    'debt.settle',
    'system.settings',
  ],
};

export interface AuthenticatedUser {
  id: string;
  userId: string;
  phone: string;
  role: Role;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(db: PGlite) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Missing or invalid token.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const targetUserId = decoded.userId || decoded.id;
      
      // Check active account status in DB
      const userCheck = await db.query<{ account_status: string }>(
        'SELECT account_status FROM users WHERE id = $1',
        [targetUserId]
      );
      if (userCheck.rows.length === 0 || userCheck.rows[0].account_status === 'BAN') {
        return res.status(403).json({ error: 'ACCOUNT_BANNED: Tài khoản đã bị khóa.' });
      }

      req.user = {
        id: targetUserId,
        userId: targetUserId,
        phone: decoded.phone,
        role: decoded.role,
        name: decoded.name,
      };
      next();
    } catch {
      return res.status(401).json({ error: 'UNAUTHORIZED: Token expired or invalid.' });
    }
  };
}

export const authenticate = authMiddleware;

export function requireRole(...allowedRoles: (Role | Role[])[]) {
  const flatRoles = allowedRoles.flat();
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `FORBIDDEN: Vai trò ${req.user.role} không có quyền thực hiện hành động này.` 
      });
    }
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const permissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: `FORBIDDEN: Không có quyền ${permission} để truy cập tài nguyên này.`
      });
    }
    next();
  };
}
