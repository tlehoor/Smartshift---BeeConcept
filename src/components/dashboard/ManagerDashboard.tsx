import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { WorkloadPanel } from '../schedule/WorkloadPanel';
import { ConstraintAlerts } from '../schedule/ConstraintAlerts';
import { schedulerService } from '../../services/schedulerService';
import { INITIAL_CONSTRAINTS } from '../../mock/data';
import {
  Calendar,
  CheckCircle2,
  AlertOctagon,
  UserPlus,
  ArrowLeftRight,
  Cpu,
  Clock,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ManagerDashboard: React.FC = () => {
  const {
    t,
    employees,
    shifts,
    coverRequests,
    swapRequests,
    scheduleStatus,
    explanations,
    currentVersion,
    publishSchedule,
    reopenDraft,
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
        title="Tổng quan điều phối ca"
        subtitle="Trung tâm vận hành phân ca và điều phối nhân sự tuần 41 (12/10 – 18/10)"
        actions={
          <div className="flex items-center gap-2.5">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 bg-white border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Lịch tuần: <StatusBadge status={scheduleStatus} size="sm" />
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

      {/* Dynamic Operational CTA Banner */}
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/schedule"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
            >
              Kiểm tra lưới lịch
            </Link>
            <button
              onClick={() => publishSchedule()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-blue-900 hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-blue-700" />
              Công bố lịch ngay
            </button>
          </div>
        </div>
      )}

      {scheduleStatus === 'PUBLISHED' && (
        <div className="p-4 sm:p-5 rounded-xl bg-emerald-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 flex-shrink-0">
              <CalendarCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Lịch phân ca tuần đã công bố chính thức (Phiên bản {currentVersion.version})
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Toàn bộ nhân sự đang theo dõi và thực hiện lịch này. Mọi thay đổi ca phát sinh qua Cover / Swap sẽ tự động đồng bộ.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/schedule"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
            >
              Xem lưới ca
            </Link>
            <button
              onClick={() => reopenDraft()}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              Mở lại bản nháp
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title={t.dashboard.totalShifts}
          value="28 / 28"
          subtext="7 ngày x 4 ca/ngày"
          icon={<Calendar className="w-4 h-4 text-indigo-600" />}
          onClick={() => navigate('/schedule')}
        />
        <KpiCard
          title={t.dashboard.targetCompletion}
          value="96%"
          trend={{ value: '14 / 14 đạt target', isPositive: true }}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title={t.dashboard.coverRequests}
          value={pendingCovers}
          subtext={`${pendingCovers} ca chờ hỗ trợ`}
          badge={pendingCovers > 0 ? 'Cần chú ý' : undefined}
          icon={<UserPlus className="w-4 h-4 text-sky-600" />}
          onClick={() => navigate('/cover')}
        />
        <KpiCard
          title={t.dashboard.swapRequests}
          value={pendingSwaps}
          subtext={`${pendingSwaps} yêu cầu đổi ca`}
          icon={<ArrowLeftRight className="w-4 h-4 text-purple-600" />}
          onClick={() => navigate('/swap')}
        />
      </div>

      {/* Important Constraint Alerts */}
      <ConstraintAlerts
        violations={INITIAL_CONSTRAINTS}
        onSelectViolation={(v) => {
          navigate('/schedule');
        }}
      />

      {/* 2-Column: Team Availability Progress & Operational Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability Registration Status by Role */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Tiến độ đăng ký Availability
              </h3>
              <Link
                to="/availability"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Đăng ký ca &rarr;
              </Link>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Hạn chót: Thứ Sáu 21:00. Nhân sự đăng ký cam kết ca làm để Scheduler phân bổ.
            </p>

            <div className="space-y-3.5">
              {/* Official */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-medium">
                  <span className="text-slate-700">Chính thức (Target 6)</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.official.count}/{readiness.stats.official.total}
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
                  <span className="text-slate-700">Thử việc (Target 4)</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.probation.count}/{readiness.stats.probation.total}
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
                  <span className="text-slate-700">Workshop (Target 4)</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.workshop.count}/{readiness.stats.workshop.total}
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
                  <span className="text-slate-700">Quản lý (Target 4)</span>
                  <span className="font-bold text-slate-900">
                    {readiness.stats.manager.count}/{readiness.stats.manager.total}
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

          <div className="mt-5 pt-4 border-t border-slate-100">
            {readiness.canRun ? (
              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Đủ điều kiện chạy Scheduler
                </span>
                <Link
                  to="/scheduler"
                  className="font-bold text-emerald-900 underline hover:no-underline"
                >
                  Mở Scheduler
                </Link>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Chờ Admin phê duyệt giải trình
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">{readiness.reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Workload Summary Table */}
        <div className="lg:col-span-2">
          <WorkloadPanel />
        </div>
      </div>
    </div>
  );
};
