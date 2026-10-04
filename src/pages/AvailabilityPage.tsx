import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK, Employee } from '../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Send,
  HelpCircle,
  Info,
} from 'lucide-react';

export const AvailabilityPage: React.FC = () => {
  const { t, employees, currentUser, showToast } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(currentUser.id);

  // Availability matrix for the selected user (represented as set of 'd{day}-s{shift}')
  // Seed with realistic slots for current user
  const [userAvailability, setUserAvailability] = useState<Record<string, Set<string>>>({
    'emp-mgr-01': new Set(['d1-s3', 'd2-s2', 'd3-s1', 'd4-s3', 'd5-s4', 'd6-s1', 'd7-s2', 'd7-s4']),
    'emp-off-01': new Set(['d1-s1', 'd1-s2', 'd2-s2', 'd3-s4', 'd4-s1', 'd5-s2', 'd6-s4', 'd7-s1', 'd7-s3']),
    'emp-off-05': new Set(['d1-s3', 'd2-s1', 'd3-s1', 'd4-s3', 'd5-s1']), // 5 shifts -> needs explanation!
  });

  const [explanationText, setExplanationText] = useState(
    'Em có việc cá nhân đột xuất nên đăng ký ít hơn chỉ tiêu tuần này.'
  );

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId) || currentUser;
  const currentSlots = userAvailability[selectedEmpId] || new Set(['d1-s1', 'd2-s2', 'd3-s3', 'd4-s4']);

  const registeredCount = currentSlots.size;
  const target = selectedEmployee.targetShifts;
  const needsExplanation = registeredCount <= target;

  const toggleSlot = (slotKey: string) => {
    setUserAvailability((prev) => {
      const nextSet = new Set(prev[selectedEmpId] || []);
      if (nextSet.has(slotKey)) {
        nextSet.delete(slotKey);
      } else {
        nextSet.add(slotKey);
      }
      return {
        ...prev,
        [selectedEmpId]: nextSet,
      };
    });
  };

  const handleSave = () => {
    showToast(
      `Đã lưu đăng ký khả năng làm việc cho ${selectedEmployee.name} (${registeredCount} ca).`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.nav.availability}
        subtitle="Đăng ký cam kết khả năng làm việc cho tuần 41 (12/10 - 18/10)"
        breadcrumbs={[{ label: 'SmartShift' }, { label: t.nav.availability }]}
        actions={
          <div className="flex items-center gap-3">
            {/* Employee Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Xem đăng ký của:</span>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-medium shadow-2xs"
              >
                {employees
                  .filter((e) => e.role !== 'ADMIN')
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({t.roles[emp.role]})
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Lưu đăng ký
            </button>
          </div>
        }
      />

      {/* Deadline Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong>Thời hạn đăng ký:</strong> Mở lúc{' '}
            <span className="font-semibold">Thứ Năm 12:00</span> — Kết thúc vào{' '}
            <span className="font-semibold text-rose-700">Thứ Sáu 21:00</span>
          </div>
        </div>
        <div className="text-xs bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-300 font-medium">
          Cổng đăng ký đang mở (có thể chỉnh sửa)
        </div>
      </div>

      {/* Staff Status Summary Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="flex items-center gap-3">
          <img
            src={selectedEmployee.avatar}
            alt={selectedEmployee.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200"
          />
          <div>
            <div className="font-bold text-slate-900 text-sm">{selectedEmployee.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <RoleBadge role={selectedEmployee.role} size="sm" />
              {selectedEmployee.nickname && (
                <span className="text-xs text-slate-500">({selectedEmployee.nickname})</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Mục tiêu quy định</div>
          <div className="text-xl font-bold text-slate-800 mt-0.5">{target} ca / tuần</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Đã đăng ký</div>
          <div className="text-xl font-bold text-blue-600 mt-0.5">{registeredCount} ca</div>
        </div>

        <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Trạng thái đăng ký</div>
          <div className="mt-1">
            {needsExplanation ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Cần giải trình (&le; {target} ca)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Đã hoàn tất (&gt; {target} ca)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Explanation Box if registered <= target */}
      {needsExplanation && (
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Yêu cầu giải trình lý do đăng ký số ca thấp hơn hoặc bằng định mức:</span>
          </div>
          <textarea
            value={explanationText}
            onChange={(e) => setExplanationText(e.target.value)}
            rows={2}
            className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Nhập lý do cụ thể để Quản lý và Admin xem xét duyệt..."
          />
          <div className="flex justify-end">
            <button
              onClick={() => showToast('Đơn giải trình đã được gửi tới Quản lý & Admin!', 'info')}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi giải trình
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600" />
            <span className="text-slate-700">🟢 Có thể làm (Đã chọn)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-300" />
            <span className="text-slate-700">⚪ Chưa đăng ký</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500" />
            <span className="text-slate-700">🟡 Cần giải trình</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          💡 Click vào từng ô để bật/tắt ca bạn có thể làm. Scheduler chỉ phân vào ca bạn cam kết.
        </div>
      </div>

      {/* Availability 7x4 Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Header Days */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-xs">
              <div className="p-3 font-semibold text-slate-500 border-r border-slate-200 text-center">
                Khung giờ
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.day}
                  className="p-3 text-center border-r border-slate-200 last:border-r-0 font-medium"
                >
                  <div className="text-slate-900 font-bold">{day.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{day.dateStr}</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            {SHIFT_DEFINITIONS.map((def) => (
              <div
                key={def.index}
                className="grid grid-cols-8 border-b border-slate-200 last:border-b-0"
              >
                {/* Shift time info */}
                <div className="p-3 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-center items-center text-center">
                  <span className="font-bold text-slate-800 text-xs">{def.label}</span>
                  <span className="text-[11px] text-slate-500 mt-1 font-mono">{def.timeRange}</span>
                </div>

                {/* 7 Days slots */}
                {DAYS_OF_WEEK.map((day) => {
                  const slotKey = `d${day.day}-s${def.index}`;
                  const isAvailable = currentSlots.has(slotKey);

                  return (
                    <div
                      key={day.day}
                      onClick={() => toggleSlot(slotKey)}
                      className={`p-3 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[90px] select-none ${
                        isAvailable
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-400'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mb-1" />
                          <span className="text-[11px] font-bold">Có thể làm</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">Bận</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
