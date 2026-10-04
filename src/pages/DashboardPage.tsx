import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { KpiCard } from '../components/common/KpiCard';
import { RoleBadge } from '../components/common/RoleBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkloadPanel } from '../components/schedule/WorkloadPanel';
import { ConstraintAlerts } from '../components/schedule/ConstraintAlerts';
import { schedulerService } from '../services/schedulerService';
import { INITIAL_CONSTRAINTS } from '../mock/data';
import {
  Users,
  Calendar,
  CheckCircle2,
  AlertOctagon,
  UserPlus,
  ArrowLeftRight,
  Cpu,
  ChevronRight,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const {
    t,
    employees,
    shifts,
    coverRequests,
    swapRequests,
    scheduleStatus,
    explanations,
    auditLogs,
    currentVersion,
  } = useApp();

  const navigate = useNavigate();

  // Readiness check
  const readiness = schedulerService.checkReadiness(employees, explanations);

  // Pending cover/swap
  const pendingCovers = coverRequests.filter((c) => c.status === 'PENDING').length;
  const pendingSwaps = swapRequests.filter((s) => s.status === 'PENDING').length;

  // Missing staff shifts count
  const understaffedShiftsCount = shifts.filter(
    (s) => s.assignedEmployeeIds.length < s.requiredCount
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        actions={
          <div className="flex items-center gap-2.5">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 bg-white border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Trạng thái: <StatusBadge status={scheduleStatus} size="sm" />
            </span>
            <button
              onClick={() => navigate('/scheduler')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{t.scheduler.title}</span>
            </button>
          </div>
        }
      />

      {/* Scheduler CTA Banner */}
      {scheduleStatus === 'DRAFT' && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xs flex-shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Bản nháp phân ca V3 đang chờ xem xét & công bố
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Thuật toán đã tối ưu 28 ca làm việc. Bạn có thể kiểm tra ràng buộc, xem khối lượng hoặc công bố ngay.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/scheduler/draft"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-blue-900 hover:bg-blue-50 transition-colors shadow-xs"
            >
              Xem xét lịch nháp
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          title={t.dashboard.totalStaff}
          value={employees.length}
          subtext="100% hoạt động"
          icon={<Users className="w-4 h-4 text-blue-600" />}
          onClick={() => navigate('/employees')}
        />
        <KpiCard
          title={t.dashboard.totalShifts}
          value={shifts.length}
          subtext="4 ca / ngày x 7 ngày"
          icon={<Calendar className="w-4 h-4 text-indigo-600" />}
          onClick={() => navigate('/schedule')}
        />
        <KpiCard
          title={t.dashboard.targetCompletion}
          value="96%"
          trend={{ value: '+4% vs tuần trước', isPositive: true }}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title={t.dashboard.understaffedShifts}
          value={understaffedShiftsCount}
          subtext={understaffedShiftsCount === 0 ? 'Đã đủ nhân lực' : 'Cần phân bổ thêm'}
          badge={understaffedShiftsCount > 0 ? 'Cảnh báo' : undefined}
          icon={<AlertOctagon className="w-4 h-4 text-rose-600" />}
          highlight={understaffedShiftsCount > 0}
        />
        <KpiCard
          title={t.dashboard.coverRequests}
          value={pendingCovers}
          subtext={`${pendingCovers} ca chờ hỗ trợ`}
          badge={pendingCovers > 0 ? 'Chờ duyệt' : undefined}
          icon={<UserPlus className="w-4 h-4 text-sky-600" />}
          onClick={() => navigate('/cover/requests')}
        />
        <KpiCard
          title={t.dashboard.swapRequests}
          value={pendingSwaps}
          subtext={`${pendingSwaps} yêu cầu đổi ca`}
          icon={<ArrowLeftRight className="w-4 h-4 text-purple-600" />}
          onClick={() => navigate('/swap/requests')}
        />
      </div>

      {/* Constraint Alerts */}
      <ConstraintAlerts
        violations={INITIAL_CONSTRAINTS}
        onSelectViolation={(v) => {
          if (v.shiftId) navigate(`/schedule`);
          else if (v.employeeId) navigate(`/employees`);
        }}
      />

      {/* Grid 2 Columns: Availability Status & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability Registration Status by Role */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {t.dashboard.registrationStatus}
              </h3>
              <Link
                to="/availability"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Chi tiết &rarr;
              </Link>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Hạn đăng ký: Thứ Sáu 21:00. Nhân sự đạt định mức số ca mới đủ điều kiện chạy Scheduler.
            </p>

            <div className="space-y-3.5">
              {/* Official */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-700">Nhân viên chính thức</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.official.count}/{readiness.stats.official.total} hoàn tất
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{
                      width: `${(readiness.stats.official.count / readiness.stats.official.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Probation */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-700">Nhân viên thử việc</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.probation.count}/{readiness.stats.probation.total} hoàn tất
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${(readiness.stats.probation.count / readiness.stats.probation.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Workshop */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-700">Nhân viên Workshop</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.workshop.count}/{readiness.stats.workshop.total} hoàn tất
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{
                      width: `${(readiness.stats.workshop.count / readiness.stats.workshop.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Manager */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-700">Quản lý</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.manager.count}/{readiness.stats.manager.total} hoàn tất
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${(readiness.stats.manager.count / readiness.stats.manager.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            {readiness.canRun ? (
              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Đủ điều kiện phân ca tự động
                </span>
                <Link
                  to="/scheduler"
                  className="font-bold text-emerald-900 underline hover:no-underline"
                >
                  Chạy ngay
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-amber-50 text-amber-800 p-3 rounded-lg text-xs">
                <span className="font-medium">{readiness.reason}</span>
                <Link
                  to="/approvals"
                  className="font-bold text-amber-900 underline hover:no-underline flex-shrink-0 ml-2"
                >
                  Duyệt ngay
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities (Audit Log Preview) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.dashboard.recentActivity}</h3>
            <Link
              to="/audit-logs"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Xem toàn bộ nhật ký &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 text-slate-700">
                      {log.category}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1 leading-relaxed">{log.detail}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>{log.actorName}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>

                <StatusBadge status={log.result === 'SUCCESS' ? 'OK' : 'WARNING'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload Overview Table */}
      <WorkloadPanel />
    </div>
  );
};
