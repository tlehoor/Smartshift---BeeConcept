import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { ShiftDetailDrawer } from '../components/schedule/ShiftDetailDrawer';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { ShiftAssignment } from '../types';
import { RotateCcw, CalendarCheck, CheckCircle2, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PublishedSchedulePage: React.FC = () => {
  const {
    shifts,
    employees,
    reopenDraft,
    currentVersion,
    scheduleStatus,
    currentUser,
  } = useApp();

  const navigate = useNavigate();

  const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);

  const canManage = currentUser.role === 'MANAGER';

  const handleConfirmReopen = () => {
    reopenDraft();
    setShowReopenModal(false);
    navigate('/scheduler/draft');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch đã công bố"
        subtitle="Lịch làm việc chính thức tuần 41 (12/10 - 18/10) đang được áp dụng"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Lịch phân ca', href: '/schedule' },
          { label: 'Đã công bố' },
        ]}
        actions={
          canManage && (
            <button
              onClick={() => setShowReopenModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Mở lại chỉnh sửa
            </button>
          )
        }
      />

      {/* Published Meta Info */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                Phiên bản {currentVersion.version}
              </span>
              <StatusBadge status="PUBLISHED" size="sm" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Hiệu lực: 12/10 – 18/10/2026</div>
          </div>
        </div>

        <div className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block mb-0.5">Người công bố</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {currentVersion.publishedBy || 'Nguyễn Minh Anh (Quản lý)'}
          </span>
        </div>

        <div className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block mb-0.5">Thời điểm công bố</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {currentVersion.publishedAt || '11/10/2026 17:00'}
          </span>
        </div>

        <div className="text-xs p-3 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block mb-0.5">Thông báo</span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã gửi thông báo đến 14 nhân sự
          </span>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Lưới phân ca chính thức</h3>
          <span className="text-xs text-slate-500">
            Click vào bất kỳ ca nào để yêu cầu Nhờ nhận ca (Cover) hoặc Đổi ca (Swap)
          </span>
        </div>
        <ScheduleGrid
          shifts={shifts}
          employees={employees}
          onSelectShift={(s) => setSelectedShift(s)}
          isDraft={false}
        />
      </div>

      {/* Shift Drawer */}
      <ShiftDetailDrawer
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
      />

      {/* Confirm Reopen Modal */}
      <ConfirmDialog
        isOpen={showReopenModal}
        title="Mở lại chỉnh sửa bản nháp?"
        description="Bạn có chắc chắn muốn đưa lịch đã công bố về trạng thái Bản nháp? Các thay đổi sẽ chỉ có hiệu lực sau khi bạn công bố lại."
        variant="warning"
        confirmText="Đưa về Bản nháp"
        onConfirm={handleConfirmReopen}
        onCancel={() => setShowReopenModal(false)}
      />
    </div>
  );
};
