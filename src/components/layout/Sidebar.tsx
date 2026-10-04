import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Calendar,
  UserCheck,
  Cpu,
  UserPlus,
  ArrowLeftRight,
  Receipt,
  Users,
  ClipboardCheck,
  History,
  Settings,
  X,
  User,
} from 'lucide-react';
import { Role } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t, currentUser, scheduleStatus, coverRequests, swapRequests } = useApp();
  const location = useLocation();

  const role = currentUser.role;

  // Unread or pending coordination items for badge
  const pendingCovers = coverRequests.filter(
    (c) => c.status === 'PENDING' && c.invitedCandidateIds.includes(currentUser.id)
  ).length;

  const pendingSwaps = swapRequests.filter(
    (s) => s.status === 'PENDING' && s.targetEmployeeId === currentUser.id
  ).length;

  const getNavSections = (userRole: Role): NavSection[] => {
    if (userRole === 'ADMIN') {
      return [
        {
          title: 'Tổng quan',
          items: [
            { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          ],
        },
        {
          title: 'Quản trị nhân sự',
          items: [
            { path: '/employees', label: t.nav.employees, icon: Users },
            {
              path: '/approvals',
              label: 'Phê duyệt giải trình',
              icon: ClipboardCheck,
            },
          ],
        },
        {
          title: 'Hệ thống',
          items: [
            { path: '/audit-logs', label: t.nav.auditLogs, icon: History },
            { path: '/settings', label: 'Cài đặt hệ thống', icon: Settings },
          ],
        },
      ];
    }

    if (userRole === 'MANAGER') {
      return [
        {
          title: 'Tổng quan',
          items: [
            { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
          ],
        },
        {
          title: 'Phân ca',
          items: [
            { path: '/schedule', label: t.nav.schedule, icon: Calendar },
            { path: '/availability', label: 'Đăng ký ca', icon: UserCheck },
            {
              path: '/scheduler',
              label: t.nav.scheduler,
              icon: Cpu,
              badge: scheduleStatus === 'DRAFT' ? 'Bản nháp' : undefined,
            },
          ],
        },
        {
          title: 'Điều phối',
          items: [
            {
              path: '/cover',
              label: t.nav.cover,
              icon: UserPlus,
              badge: pendingCovers > 0 ? `${pendingCovers}` : undefined,
            },
            {
              path: '/swap',
              label: t.nav.swap,
              icon: ArrowLeftRight,
              badge: pendingSwaps > 0 ? `${pendingSwaps}` : undefined,
            },
            { path: '/debt', label: t.nav.debt, icon: Receipt },
          ],
        },
        {
          title: 'Tài khoản',
          items: [
            { path: '/settings', label: 'Tài khoản của tôi', icon: User },
          ],
        },
      ];
    }

    // OFFICIAL_STAFF, PROBATION_STAFF, WORKSHOP
    return [
      {
        title: 'Tổng quan',
        items: [
          { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        ],
      },
      {
        title: 'Công việc của tôi',
        items: [
          { path: '/schedule', label: 'Lịch làm việc của tôi', icon: Calendar },
          { path: '/availability', label: 'Đăng ký ca của tôi', icon: UserCheck },
        ],
      },
      {
        title: 'Điều phối ca',
        items: [
          {
            path: '/cover',
            label: t.nav.cover,
            icon: UserPlus,
            badge: pendingCovers > 0 ? `${pendingCovers}` : undefined,
          },
          {
            path: '/swap',
            label: t.nav.swap,
            icon: ArrowLeftRight,
            badge: pendingSwaps > 0 ? `${pendingSwaps}` : undefined,
          },
          { path: '/debt', label: t.nav.debt, icon: Receipt },
        ],
      },
      {
        title: 'Tài khoản',
        items: [
          { path: '/settings', label: 'Tài khoản của tôi', icon: User },
        ],
      },
    ];
  };

  const sections = getNavSections(role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
              S
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                SmartShift
                <span className="text-[10px] font-medium bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                Điều phối ca thông minh
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Role Banner */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Vai trò hiện tại:</span>
          <span className="font-semibold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 text-[11px]">
            {t.roles[role]}
          </span>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((sec, idx) => (
            <div key={idx}>
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/dashboard'
                      ? location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tuần 41 (12/10 - 18/10)</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Trực tuyến
          </span>
        </div>
      </aside>
    </>
  );
};
