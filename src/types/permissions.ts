import { Role } from './index';

export type Permission =
  | 'schedule.view'
  | 'schedule.manage'
  | 'scheduler.run'
  | 'scheduler.publish'
  | 'availability.manage'
  | 'availability.view_team'
  | 'cover.create'
  | 'cover.respond'
  | 'swap.create'
  | 'swap.respond'
  | 'debt.view'
  | 'employees.manage'
  | 'approvals.manage'
  | 'audit.view'
  | 'settings.system';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'schedule.view',
    'employees.manage',
    'approvals.manage',
    'audit.view',
    'settings.system',
    'availability.view_team',
  ],
  MANAGER: [
    'schedule.view',
    'schedule.manage',
    'scheduler.run',
    'scheduler.publish',
    'availability.manage',
    'availability.view_team',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
  ],
  OFFICIAL_STAFF: [
    'schedule.view',
    'availability.manage',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
  ],
  PROBATION_STAFF: [
    'schedule.view',
    'availability.manage',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
  ],
  WORKSHOP: [
    'schedule.view',
    'availability.manage',
    'cover.create',
    'cover.respond',
    'swap.create',
    'swap.respond',
    'debt.view',
  ],
};

export const hasPermission = (role: Role, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export const canAccessRoute = (role: Role, path: string): boolean => {
  if (path === '/' || path === '/dashboard' || path === '/settings') {
    return true;
  }

  if (path.startsWith('/schedule')) {
    return hasPermission(role, 'schedule.view');
  }

  if (path.startsWith('/availability')) {
    return hasPermission(role, 'availability.manage') || hasPermission(role, 'availability.view_team');
  }

  if (path.startsWith('/scheduler')) {
    return hasPermission(role, 'scheduler.run');
  }

  if (path.startsWith('/cover')) {
    return hasPermission(role, 'cover.create') || hasPermission(role, 'cover.respond');
  }

  if (path.startsWith('/swap')) {
    return hasPermission(role, 'swap.create') || hasPermission(role, 'swap.respond');
  }

  if (path.startsWith('/debt')) {
    return hasPermission(role, 'debt.view');
  }

  if (path.startsWith('/employees')) {
    return hasPermission(role, 'employees.manage');
  }

  if (path.startsWith('/approvals')) {
    return hasPermission(role, 'approvals.manage');
  }

  if (path.startsWith('/audit-logs')) {
    return hasPermission(role, 'audit.view');
  }

  return true;
};
