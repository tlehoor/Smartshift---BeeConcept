import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { RoleBadge } from '../common/RoleBadge';
import {
  Users,
  ShieldCheck,
  ClipboardCheck,
  History,
  AlertTriangle,
  ArrowRight,
  Lock,
  Unlock,
  CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { employees, explanations, auditLogs, t } = useApp();
  const navigate = useNavigate();

  const activeEmployees = employees.filter((e) => e.accountStatus === 'ACTIVE').length;
  const bannedEmployees = employees.filter((e) => e.accountStatus === 'BAN').length;
  const pendingApprovals = explanations.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan quản trị hệ thống"
        subtitle="Quản lý tài khoản nhân sự, phê duyệt giải trình và giám sát nhật ký hoạt động"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 bg-purple-50 border-purple-200 text-purple-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Quyền Quản trị viên (Admin)
            </span>
          </div>
        }
      />

      {/* Action Required Banner if pending explanations */}
      {pendingApprovals > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-xs sm:text-sm">
                Có {pendingApprovals} đơn giải trình đăng ký ca thấp hơn định mức đang chờ duyệt
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Nhân viên có availability &le; target cần được Admin phê duyệt trước khi Quản lý có thể chạy Scheduler.
              </p>
            </div>
          </div>
          <Link
            to="/approvals"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Xem & Phê duyệt ngay
          </Link>
        </div>
      )}

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Tổng nhân sự"
          value={employees.length}
          subtext="14 nhân viên + 1 Admin"
          icon={<Users className="w-4 h-4 text-blue-600" />}
          onClick={() => navigate('/employees')}
        />
        <KpiCard
          title="Tài khoản hoạt động"
          value={`${activeEmployees} / ${employees.length}`}
          subtext={bannedEmployees > 0 ? `${bannedEmployees} tài khoản bị khóa` : 'Tất cả bình thường'}
          badge={bannedEmployees > 0 ? `${bannedEmployees} Khóa` : '100%'}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          onClick={() => navigate('/employees')}
        />
        <KpiCard
          title="Giải trình chờ duyệt"
          value={pendingApprovals}
          subtext={pendingApprovals > 0 ? 'Cần Admin xử lý' : 'Đã duyệt toàn bộ'}
          badge={pendingApprovals > 0 ? 'Cần duyệt' : undefined}
          highlight={pendingApprovals > 0}
          icon={<ClipboardCheck className="w-4 h-4 text-amber-600" />}
          onClick={() => navigate('/approvals')}
        />
        <KpiCard
          title="Nhật ký hệ thống (Audit)"
          value={auditLogs.length}
          subtext="Ghi nhận hoạt động tuần"
          icon={<History className="w-4 h-4 text-purple-600" />}
          onClick={() => navigate('/audit-logs')}
        />
      </div>

      {/* 2-Column: Quick Staff Directory & Recent Audit Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personnel Roster Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Tình trạng nhân sự & Tài khoản
            </h3>
            <Link
              to="/employees"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>Xem danh sách ({employees.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {employees.slice(0, 6).map((emp) => (
              <div
                key={emp.id}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/60 rounded px-1.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{emp.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RoleBadge role={emp.role} size="sm" />
                  <StatusBadge status={emp.accountStatus} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Stream */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              Nhật ký thao tác hệ thống gần nhất
            </h3>
            <Link
              to="/audit-logs"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <span>Toàn bộ nhật ký</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <div className="text-slate-600 leading-relaxed text-[11px]">{log.detail}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <span className="font-semibold text-slate-700">{log.actorName}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                    {log.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
