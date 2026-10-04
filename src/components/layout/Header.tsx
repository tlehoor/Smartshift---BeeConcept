import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Search,
  Globe,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Role } from '../../types';

export const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const {
    t,
    language,
    setLanguage,
    currentUser,
    switchRole,
    notifications,
    markNotificationAsRead,
    setIsAuthenticated,
  } = useApp();

  const navigate = useNavigate();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: Role[] = [
    'ADMIN',
    'MANAGER',
    'OFFICIAL_STAFF',
    'PROBATION_STAFF',
    'WORKSHOP',
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder={t.common.search}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-700 placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Switcher Demo Tool */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
            title="Công cụ chuyển đổi vai trò dùng thử (DEMO MODE)"
          >
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-1 py-0.5 rounded">
              🧪 DEMO MODE
            </span>
            <span className="hidden sm:inline text-amber-800 text-[11px]">Vai trò:</span>
            <span className="font-bold text-amber-950">{t.roles[currentUser.role]}</span>
            <ChevronDown className="w-3 h-3 text-amber-700" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <span>🧪 Chuyển vai trò Demo Prototype</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Chỉ dùng để thử nghiệm các phân quyền UI/UX khác nhau trong bản prototype này.
                </p>
              </div>

              <div className="py-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      currentUser.role === r ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{t.roles[r]}</div>
                      <div className="text-[10px] text-slate-400">
                        {r === 'ADMIN'
                          ? 'Duyệt giải trình, quản lý nhân sự, nhật ký'
                          : r === 'MANAGER'
                          ? 'Vận hành Scheduler, công bố lịch tuần'
                          : 'Xem ca cá nhân, đăng ký ca, đổi ca'}
                      </div>
                    </div>
                    {currentUser.role === r && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
          <button
            onClick={() => setLanguage('vi')}
            className={`px-2 py-1 rounded font-medium transition-all ${
              language === 'vi'
                ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🇻🇳 VN
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded font-medium transition-all ${
              language === 'en'
                ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🇬🇧 EN
          </button>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Thông báo hệ thống</span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} mới
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      if (notif.link) {
                        navigate(notif.link);
                        setShowNotifMenu(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                      !notif.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      {notif.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-900">{notif.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{notif.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500">{t.roles[currentUser.role]}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500">{currentUser.email}</div>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  {currentUser.role === 'ADMIN' ? 'Cài đặt hệ thống' : 'Tài khoản của tôi'}
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  {t.nav.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
