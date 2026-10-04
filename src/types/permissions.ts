import { Role } from './index';

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

export const hasPermission = (role: Role, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export const canAccessRoute = (role: Role, path: string): boolean => {
  if (path === '/' || path === '/dashboard') {
    return hasPermission(role, 'dashboard.view');
  }

  if (path === '/settings') {
    return hasPermission(role, 'system.settings');
  }

  if (path === '/schedule' || path.startsWith('/schedule/published')) {
    return hasPermission(role, 'schedule.view');
  }

  if (path.startsWith('/availability')) {
    // Staff & Manager edit own; Admin has approvals
    return hasPermission(role, 'availability.manage_own') || hasPermission(role, 'availability.approve');
  }

  if (path === '/scheduler') {
    return hasPermission(role, 'scheduler.run');
  }

  if (path === '/scheduler/draft' || path === '/scheduler/versions') {
    return hasPermission(role, 'scheduler.review');
  }

  if (path === '/cover') {
    return hasPermission(role, 'cover.create');
  }

  if (path.startsWith('/cover/requests')) {
    return hasPermission(role, 'cover.respond');
  }

  if (path === '/swap') {
    return hasPermission(role, 'swap.create');
  }

  if (path.startsWith('/swap/requests')) {
    return hasPermission(role, 'swap.respond');
  }

  if (path.startsWith('/debt')) {
    return hasPermission(role, 'debt.view');
  }

  if (path.startsWith('/employees')) {
    return hasPermission(role, 'employees.manage') || hasPermission(role, 'employees.view');
  }

  if (path.startsWith('/approvals')) {
    return hasPermission(role, 'availability.approve');
  }

  if (path.startsWith('/audit-logs')) {
    return hasPermission(role, 'audit.view');
  }

  return true;
};

export interface NavigationItemConfig {
  path: string;
  label: string;
  iconName:
    | 'LayoutDashboard'
    | 'Calendar'
    | 'UserCheck'
    | 'Cpu'
    | 'UserPlus'
    | 'ArrowLeftRight'
    | 'Receipt'
    | 'Users'
    | 'ClipboardCheck'
    | 'History'
    | 'User'
    | 'Settings';
  badgeType?: 'schedulerStatus' | 'pendingCovers' | 'pendingSwaps' | 'pendingApprovals';
}

export interface NavigationSectionConfig {
  title: string;
  items: NavigationItemConfig[];
}

export const getNavigationForRole = (role: Role): NavigationSectionConfig[] => {
  if (role === 'ADMIN') {
    return [
      {
        title: 'OVERVIEW',
        items: [
          {
            path: '/dashboard',
            label: 'Dashboard',
            iconName: 'LayoutDashboard',
          },
        ],
      },
      {
        title: 'ADMINISTRATION',
        items: [
          {
            path: '/employees',
            label: 'Employees',
            iconName: 'Users',
          },
          {
            path: '/approvals',
            label: 'Availability Approvals',
            iconName: 'ClipboardCheck',
            badgeType: 'pendingApprovals',
          },
        ],
      },
      {
        title: 'SYSTEM',
        items: [
          {
            path: '/audit-logs',
            label: 'Audit Logs',
            iconName: 'History',
          },
          {
            path: '/settings',
            label: 'My Account',
            iconName: 'User',
          },
        ],
      },
    ];
  }

  if (role === 'MANAGER') {
    return [
      {
        title: 'OVERVIEW',
        items: [
          {
            path: '/dashboard',
            label: 'Dashboard',
            iconName: 'LayoutDashboard',
          },
        ],
      },
      {
        title: 'SCHEDULING',
        items: [
          {
            path: '/schedule',
            label: 'Schedule',
            iconName: 'Calendar',
          },
          {
            path: '/availability',
            label: 'Availability',
            iconName: 'UserCheck',
          },
          {
            path: '/scheduler',
            label: 'Scheduler',
            iconName: 'Cpu',
            badgeType: 'schedulerStatus',
          },
        ],
      },
      {
        title: 'COORDINATION',
        items: [
          {
            path: '/cover',
            label: 'Cover',
            iconName: 'UserPlus',
            badgeType: 'pendingCovers',
          },
          {
            path: '/swap',
            label: 'Swap',
            iconName: 'ArrowLeftRight',
            badgeType: 'pendingSwaps',
          },
          {
            path: '/debt',
            label: 'Debt',
            iconName: 'Receipt',
          },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          {
            path: '/settings',
            label: 'My Account',
            iconName: 'User',
          },
        ],
      },
    ];
  }

  // OFFICIAL_STAFF, PROBATION_STAFF, WORKSHOP
  return [
    {
      title: 'OVERVIEW',
      items: [
        {
          path: '/dashboard',
          label: 'Dashboard',
          iconName: 'LayoutDashboard',
        },
      ],
    },
    {
      title: 'MY WORK',
      items: [
        {
          path: '/schedule',
          label: 'My Schedule',
          iconName: 'Calendar',
        },
        {
          path: '/availability',
          label: 'My Availability',
          iconName: 'UserCheck',
        },
      ],
    },
    {
      title: 'COORDINATION',
      items: [
        {
          path: '/cover',
          label: 'Cover',
          iconName: 'UserPlus',
          badgeType: 'pendingCovers',
        },
        {
          path: '/swap',
          label: 'Swap',
          iconName: 'ArrowLeftRight',
          badgeType: 'pendingSwaps',
        },
        {
          path: '/debt',
          label: 'Debt',
          iconName: 'Receipt',
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          path: '/settings',
          label: 'My Account',
          iconName: 'User',
        },
      ],
    },
  ];
};
