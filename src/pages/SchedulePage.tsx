import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { ShiftDetailDrawer } from '../components/schedule/ShiftDetailDrawer';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { ShiftAssignment, Role } from '../types';
import {
  Calendar,
  Sparkles,
  FileCheck2,
  CalendarCheck,
  RotateCcw,
  Send,
  Filter,
  UserCheck,
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
  } = useApp();

  const navigate = useNavigate();

  const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // Filter shifts display if role filter applied
  const filteredEmployees =
    roleFilter === 'ALL'
      ? employees
      : employees.filter((e) => e.role === roleFilter);

  const canManage = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.schedule.title}
        subtitle={t.schedule.subtitle}
        breadcrumbs={[{ label: 'SmartShift' }, { label: t.schedule.title }]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {scheduleStatus === 'DRAFT' ? (
              <>
                <button
                  onClick={() => navigate('/scheduler/draft')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                  Xem xét bản nháp
                </button>
                {canManage && (
                  <button
                    onClick={() => setShowPublishConfirm(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Công bố lịch
                  </button>
                )}
              </>
            ) : (
              canManage && (
                <button
                  onClick={() => setShowReopenConfirm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Mở lại chỉnh sửa
                </button>
              )
            )}
          </div>
        }
      />

      {/* Status Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Trạng thái:</span>
            <StatusBadge status={scheduleStatus} size="sm" />
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="text-xs text-slate-600">
            Phiên bản hiện hành: <strong className="text-slate-900">{currentVersion.version}</strong>
          </div>
        </div>

        {/* Filter by Role */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Lọc theo vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white"
          >
            <option value="ALL">Tất cả nhân sự ({employees.length})</option>
            <option value="MANAGER">{t.roles.MANAGER}</option>
            <option value="OFFICIAL_STAFF">{t.roles.OFFICIAL_STAFF}</option>
            <option value="PROBATION_STAFF">{t.roles.PROBATION_STAFF}</option>
            <option value="WORKSHOP">{t.roles.WORKSHOP}</option>
          </select>
        </div>
      </div>

      {/* Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-slate-600">Quản lý</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-600">Chính thức</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Thử việc</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span className="text-slate-600">Workshop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Đặc biệt
            </span>
            <span className="text-slate-600">Ca đặc biệt (2 Chính thức + 1 Quản lý)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          💡 Click vào bất kỳ ca làm việc nào để xem chi tiết hoặc nhờ nhận ca / đổi ca.
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <ScheduleGrid
        shifts={shifts}
        employees={filteredEmployees}
        onSelectShift={(shift) => setSelectedShift(shift)}
        isDraft={scheduleStatus === 'DRAFT'}
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
        onConfirm={() => {
          publishSchedule();
          setShowPublishConfirm(false);
        }}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Confirm Reopen Draft Dialog */}
      <ConfirmDialog
        isOpen={showReopenConfirm}
        title={t.schedule.reopenConfirmTitle}
        description={t.schedule.reopenConfirmDesc}
        variant="warning"
        confirmText="Mở lại bản nháp"
        onConfirm={() => {
          reopenDraft();
          setShowReopenConfirm(false);
        }}
        onCancel={() => setShowReopenConfirm(false)}
      />
    </div>
  );
};
