import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { ShiftDetailDrawer } from '../components/schedule/ShiftDetailDrawer';
import { WorkloadPanel } from '../components/schedule/WorkloadPanel';
import { ConstraintAlerts } from '../components/schedule/ConstraintAlerts';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { ShiftAssignment, Role } from '../types';
import { INITIAL_CONSTRAINTS } from '../mock/data';
import {
  Calendar,
  CalendarCheck,
  RotateCcw,
  Filter,
  User,
  Users,
  Sparkles,
  GitBranch,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SchedulePage: React.FC = () => {
  const {
    t,
    shifts,
    employees,
    scheduleStatus,
    publishSchedule,
    reopenDraft,
    currentVersion,
    currentUser,
    runSchedulerSim,
    showToast,
  } = useApp();

  const navigate = useNavigate();

  const isManager = currentUser.role === 'MANAGER';
  const isAdmin = currentUser.role === 'ADMIN';
  const isStaff = !isManager && !isAdmin;

  // Selected shift for detail drawer
  const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);

  // Role filter (for managers/admins)
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  // Staff view mode: 'MY_SHIFTS' or 'ALL_STAFF'
  const [staffScope, setStaffScope] = useState<'MY_SHIFTS' | 'ALL_STAFF'>(
    isStaff ? 'MY_SHIFTS' : 'ALL_STAFF'
  );

  // Manager schedule state view: 'PUBLISHED' or 'DRAFT'
  const [managerScheduleView, setManagerScheduleView] = useState<'PUBLISHED' | 'DRAFT'>(
    scheduleStatus === 'DRAFT' ? 'DRAFT' : 'PUBLISHED'
  );

  // Manager bottom panel tab: 'GRID_ONLY' | 'WORKLOAD' | 'CONSTRAINTS'
  const [managerPanelTab, setManagerPanelTab] = useState<'NONE' | 'WORKLOAD' | 'CONSTRAINTS'>('NONE');

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReRunning, setIsReRunning] = useState(false);

  // Selected week simulation
  const [selectedWeek, setSelectedWeek] = useState(41);

  // Filtered employees for display
  const filteredEmployees = employees.filter((emp) => {
    if (isStaff && staffScope === 'MY_SHIFTS') {
      return emp.id === currentUser.id;
    }
    if (roleFilter !== 'ALL') {
      return emp.role === roleFilter;
    }
    return true;
  });

  const myShiftsCount = shifts.filter((s) => s.assignedEmployeeIds.includes(currentUser.id)).length;

  const handleReRun = async () => {
    setIsReRunning(true);
    await new Promise((r) => setTimeout(r, 700));
    await runSchedulerSim();
    setIsReRunning(false);
    showToast('Đã chạy lại phân ca và cập nhật bản nháp V3.', 'success');
  };

  const handleConfirmPublish = () => {
    publishSchedule();
    setShowPublishConfirm(false);
    setManagerScheduleView('PUBLISHED');
  };

  const handleConfirmReopen = () => {
    reopenDraft();
    setShowReopenConfirm(false);
    setManagerScheduleView('DRAFT');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'Lịch làm việc của tôi' : t.schedule.title}
        subtitle={`Kế hoạch phân bổ 28 ca làm việc • Tuần ${selectedWeek} (12/10 – 18/10/2026)`}
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: isStaff ? 'Lịch của tôi' : t.schedule.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Week Switcher */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <button
                onClick={() => setSelectedWeek((w) => Math.max(40, w - 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
                title="Tuần trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-800 px-1.5">
                Tuần {selectedWeek} {selectedWeek === 41 && '(Hiện tại)'}
              </span>
              <button
                onClick={() => setSelectedWeek((w) => Math.min(42, w + 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-500"
                title="Tuần sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Manager Actions */}
            {isManager && (
              <>
                {managerScheduleView === 'DRAFT' ? (
                  <>
                    <button
                      onClick={handleReRun}
                      disabled={isReRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin' : ''}`} />
                      <span>Chạy lại</span>
                    </button>
                    <button
                      onClick={() => navigate('/scheduler/versions')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>So sánh V2/V3</span>
                    </button>
                    <button
                      onClick={() => setShowPublishConfirm(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Công bố lịch</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowReopenConfirm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg shadow-2xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mở lại chỉnh sửa</span>
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Control Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View selector for Manager OR Staff */}
        <div className="flex items-center gap-3">
          {isManager ? (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setManagerScheduleView('PUBLISHED')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  managerScheduleView === 'PUBLISHED'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lịch đã công bố
              </button>
              <button
                onClick={() => setManagerScheduleView('DRAFT')}
                className={`px-3 py-1 rounded font-semibold transition-all flex items-center gap-1 ${
                  managerScheduleView === 'DRAFT'
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Bản nháp ({currentVersion.version})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </button>
            </div>
          ) : isStaff ? (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setStaffScope('MY_SHIFTS')}
                className={`px-3 py-1 rounded font-semibold transition-all flex items-center gap-1.5 ${
                  staffScope === 'MY_SHIFTS'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Ca làm của tôi ({myShiftsCount})</span>
              </button>
              <button
                onClick={() => setStaffScope('ALL_STAFF')}
                className={`px-3 py-1 rounded font-semibold transition-all flex items-center gap-1.5 ${
                  staffScope === 'ALL_STAFF'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Toàn bộ đội ngũ</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="font-semibold">Trạng thái:</span>
              <StatusBadge status={scheduleStatus} size="sm" />
            </div>
          )}

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="text-xs text-slate-500 hidden sm:block">
            {isManager && managerScheduleView === 'DRAFT' ? (
              <span className="text-amber-800 font-medium">
                ⚠️ Đang xem bản nháp phân ca V3. Bạn có thể điều chỉnh và công bố khi sẵn sàng.
              </span>
            ) : (
              <span>Lịch chính thức tuần 41 (Có hiệu lực)</span>
            )}
          </div>
        </div>

        {/* Right: Filters / Panels toggle */}
        <div className="flex items-center gap-2.5">
          {isManager && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() =>
                  setManagerPanelTab((prev) => (prev === 'WORKLOAD' ? 'NONE' : 'WORKLOAD'))
                }
                className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                  managerPanelTab === 'WORKLOAD'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Khối lượng (Workload)
              </button>
              <button
                onClick={() =>
                  setManagerPanelTab((prev) => (prev === 'CONSTRAINTS' ? 'NONE' : 'CONSTRAINTS'))
                }
                className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                  managerPanelTab === 'CONSTRAINTS'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cảnh báo ({INITIAL_CONSTRAINTS.length})
              </button>
            </div>
          )}

          {(!isStaff || staffScope === 'ALL_STAFF') && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả chức danh</option>
                <option value="MANAGER">{t.roles.MANAGER}</option>
                <option value="OFFICIAL_STAFF">{t.roles.OFFICIAL_STAFF}</option>
                <option value="PROBATION_STAFF">{t.roles.PROBATION_STAFF}</option>
                <option value="WORKSHOP">{t.roles.WORKSHOP}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Manager Drawer Panels */}
      {isManager && managerPanelTab === 'CONSTRAINTS' && (
        <ConstraintAlerts
          violations={INITIAL_CONSTRAINTS}
          onSelectViolation={(v) => {
            if (v.shiftId) {
              const target = shifts.find((s) => s.id === v.shiftId);
              if (target) setSelectedShift(target);
            }
          }}
        />
      )}

      {isManager && managerPanelTab === 'WORKLOAD' && <WorkloadPanel />}

      {/* Main Schedule Grid */}
      <ScheduleGrid
        shifts={shifts}
        employees={filteredEmployees}
        onSelectShift={(shift) => setSelectedShift(shift)}
        isDraft={isManager && managerScheduleView === 'DRAFT'}
      />

      {/* Shift Detail Drawer */}
      <ShiftDetailDrawer
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
      />

      {/* Confirm Publish Dialog */}
      <ConfirmDialog
        isOpen={showPublishConfirm}
        title={t.scheduler.publishConfirmTitle}
        description={t.scheduler.publishConfirmDesc}
        confirmText="Xác nhận công bố"
        onConfirm={handleConfirmPublish}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Confirm Reopen Draft Dialog */}
      <ConfirmDialog
        isOpen={showReopenConfirm}
        title={t.schedule.reopenConfirmTitle}
        description={t.schedule.reopenConfirmDesc}
        variant="warning"
        confirmText="Mở lại bản nháp"
        onConfirm={handleConfirmReopen}
        onCancel={() => setShowReopenConfirm(false)}
      />
    </div>
  );
};

export default SchedulePage;
