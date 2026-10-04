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
import { getNavigationForRole, NavigationItemConfig } from '../../types/permissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP = {
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
  User,
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t, currentUser, scheduleStatus, coverRequests, swapRequests, explanations, language } = useApp();
  const location = useLocation();

  const role = currentUser.role;

  // Coordination and admin badges
  const pendingCovers = coverRequests.filter(
    (c) => c.status === 'PENDING' && c.invitedCandidateIds.includes(currentUser.id)
  ).length;

  const pendingSwaps = swapRequests.filter(
    (s) => s.status === 'PENDING' && s.targetEmployeeId === currentUser.id
  ).length;

  const pendingApprovals = explanations.filter((e) => e.status === 'PENDING').length;

  // Retrieve centralized navigation structure for the user's role
  const sections = getNavigationForRole(role);

  // Label localization mapper
  const getDisplayLabel = (item: NavigationItemConfig): string => {
    if (language === 'en') {
      return item.label;
    }

    // Vietnamese localized labels
    switch (item.path) {
      case '/dashboard':
        return 'Tổng quan';
      case '/schedule':
        return item.label === 'My Schedule' ? 'Lịch của tôi' : 'Lịch phân ca';
      case '/availability':
        return item.label === 'My Availability' ? 'Đăng ký ca của tôi' : 'Đăng ký ca';
      case '/scheduler':
        return 'Tự động phân ca';
      case '/cover':
        return 'Nhờ nhận ca';
      case '/swap':
        return 'Đổi ca';
      case '/debt':
        return 'Sổ nợ ca';
      case '/employees':
        return 'Nhân sự';
      case '/approvals':
        return 'Phê duyệt giải trình';
      case '/audit-logs':
        return 'Nhật ký hệ thống';
      case '/settings':
        return 'Tài khoản của tôi';
      default:
        return item.label;
    }
  };

  const getSectionTitle = (title: string): string => {
    if (language === 'en') return title;
    switch (title) {
      case 'OVERVIEW':
        return 'TỔNG QUAN';
      case 'ADMINISTRATION':
        return 'QUẢN TRỊ NHÂN SỰ';
      case 'SYSTEM':
        return 'HỆ THỐNG';
      case 'SCHEDULING':
        return 'LẬP LỊCH & PHÂN CA';
      case 'COORDINATION':
        return 'ĐIỀU PHỐI CA';
      case 'MY WORK':
        return 'CÔNG VIỆC CỦA TÔI';
      case 'ACCOUNT':
        return 'TÀI KHOẢN';
      default:
        return title;
    }
  };

  const getBadgeValue = (badgeType?: string): string | undefined => {
    if (!badgeType) return undefined;
    if (badgeType === 'schedulerStatus' && scheduleStatus === 'DRAFT') {
      return language === 'vi' ? 'Bản nháp' : 'Draft';
    }
    if (badgeType === 'pendingCovers' && pendingCovers > 0) {
      return `${pendingCovers}`;
    }
    if (badgeType === 'pendingSwaps' && pendingSwaps > 0) {
      return `${pendingSwaps}`;
    }
    if (badgeType === 'pendingApprovals' && pendingApprovals > 0) {
      return `${pendingApprovals}`;
    }
    return undefined;
  };

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
                {language === 'vi' ? 'Điều phối ca thông minh' : 'Smart Scheduling'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Role Banner */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {language === 'vi' ? 'Vai trò hiện tại:' : 'Current Role:'}
          </span>
          <span className="font-semibold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 text-[11px]">
            {t.roles[role]}
          </span>
        </div>

        {/* Centralized Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((sec, idx) => (
            <div key={idx}>
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {getSectionTitle(sec.title)}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = ICON_MAP[item.iconName] || LayoutDashboard;
                  const isActive =
                    item.path === '/dashboard'
                      ? location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.path);

                  const badge = getBadgeValue(item.badgeType);

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
                        <span>{getDisplayLabel(item)}</span>
                      </div>
                      {badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {badge}
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
            {language === 'vi' ? 'Trực tuyến' : 'Online'}
          </span>
        </div>
      </aside>
    </>
  );
};
