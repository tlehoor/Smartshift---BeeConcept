import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { ShiftDetailDrawer } from '../components/schedule/ShiftDetailDrawer';
import { WorkloadPanel } from '../components/schedule/WorkloadPanel';
import { ConstraintAlerts } from '../components/schedule/ConstraintAlerts';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { ShiftAssignment } from '../types';
import { INITIAL_CONSTRAINTS } from '../mock/data';
import {
  RotateCcw,
  GitBranch,
  CalendarCheck,
  Sparkles,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DraftReviewPage: React.FC = () => {
  const {
    t,
    shifts,
    employees,
    currentVersion,
    runSchedulerSim,
    publishSchedule,
    scheduleStatus,
    showToast,
  } = useApp();

  const navigate = useNavigate();

  const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isReRunning, setIsReRunning] = useState(false);

  const handleReRun = async () => {
    setIsReRunning(true);
    await new Promise((r) => setTimeout(r, 800));
    await runSchedulerSim();
    setIsReRunning(false);
    showToast('Đã chạy lại thuật toán phân ca thành công!', 'success');
  };

  const handleConfirmPublish = () => {
    publishSchedule();
    setShowPublishModal(false);
    navigate('/schedule/published');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.scheduler.draftTitle}
        subtitle="Kiểm tra chi tiết lịch phân ca nháp V3 trước khi công bố cho nhân viên"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: t.scheduler.title, href: '/scheduler' },
          { label: t.scheduler.draftTitle },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleReRun}
              disabled={isReRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin' : ''}`} />
              {t.scheduler.reRunButton}
            </button>

            <button
              onClick={() => navigate('/scheduler/versions')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              <GitBranch className="w-3.5 h-3.5" />
              {t.scheduler.compareButton}
            </button>

            <button
              onClick={() => setShowPublishModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              {t.scheduler.publishButton}
            </button>
          </div>
        }
      />

      {/* Draft Meta Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                Phiên bản lịch: {currentVersion.version}
              </span>
              <StatusBadge status={currentVersion.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo lúc: {currentVersion.createdAt} • Người tạo: {currentVersion.createdBy}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span className="text-slate-600 font-medium">Ghi chú tối ưu:</span>
          <span className="text-slate-900 font-semibold">{currentVersion.notes}</span>
        </div>
      </div>

      {/* Constraint Alerts */}
      <ConstraintAlerts
        violations={INITIAL_CONSTRAINTS}
        onSelectViolation={(v) => {
          if (v.shiftId) {
            const match = shifts.find((s) => s.id === v.shiftId);
            if (match) setSelectedShift(match);
          }
        }}
      />

      {/* Weekly Schedule Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Lưới phân ca chi tiết (28 ca)</h3>
          <span className="text-xs text-slate-500">
            Click vào ca để điều chỉnh hoặc xem nhân sự
          </span>
        </div>
        <ScheduleGrid
          shifts={shifts}
          employees={employees}
          onSelectShift={(s) => setSelectedShift(s)}
          isDraft={true}
        />
      </div>

      {/* Workload Panel */}
      <WorkloadPanel />

      {/* Shift Detail Drawer */}
      <ShiftDetailDrawer
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
      />

      {/* Confirm Publish Dialog */}
      <ConfirmDialog
        isOpen={showPublishModal}
        title={t.scheduler.publishConfirmTitle}
        description={t.scheduler.publishConfirmDesc}
        confirmText="Xác nhận công bố"
        onConfirm={handleConfirmPublish}
        onCancel={() => setShowPublishModal(false)}
      />
    </div>
  );
};
