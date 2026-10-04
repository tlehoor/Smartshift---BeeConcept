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
  Users,
  User,
  ArrowRight,
  ShieldAlert,
  ClipboardCheck,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const AvailabilityPage: React.FC = () => {
  const {
    t,
    employees,
    currentUser,
    showToast,
    updateEmployeeAvailability,
    submitExplanation,
  } = useApp();
  const navigate = useNavigate();

  const isManager = currentUser.role === 'MANAGER';
  const isStaff = !isManager && currentUser.role !== 'ADMIN';

  // Manager tab state: My Availability vs Team Availability (READ ONLY)
  const [managerTab, setManagerTab] = useState<'MY_AVAILABILITY' | 'TEAM_OVERVIEW'>('MY_AVAILABILITY');

  // Registration portal deadline simulation:
  // OPEN: Thursday 12:00 — CLOSE: Friday 21:00
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  // Availability matrix for currentUser
  const [userAvailability, setUserAvailability] = useState<Record<string, Set<string>>>({
    'emp-mgr-01': new Set(['d1-s3', 'd2-s2', 'd3-s1', 'd4-s3', 'd5-s4', 'd6-s1', 'd7-s2', 'd7-s4']),
    'emp-off-01': new Set(['d1-s1', 'd1-s2', 'd2-s2', 'd3-s4', 'd4-s1', 'd5-s2', 'd6-s4', 'd7-s1', 'd7-s3']),
    'emp-off-05': new Set(['d1-s3', 'd2-s1', 'd3-s1', 'd4-s3', 'd5-s1']), // 5 shifts -> needs explanation
    'emp-prob-01': new Set(['d1-s2', 'd2-s4', 'd3-s4', 'd4-s2', 'd5-s4', 'd7-s1']),
    'emp-ws-01': new Set(['d1-s4', 'd2-s1', 'd3-s2', 'd5-s2', 'd6-s4']),
  });

  const [explanationText, setExplanationText] = useState(
    currentUser.explanationText || 'Em xin phép đăng ký số ca tuần này do có việc cá nhân bận.'
  );

  // Staff and Manager edit ONLY their own availability
  const mySlots = userAvailability[currentUser.id] || new Set(['d1-s1', 'd2-s2', 'd3-s3', 'd4-s4', 'd5-s1']);
  const registeredCount = mySlots.size;
  const target = currentUser.targetShifts;
  const needsExplanation = registeredCount <= target;

  const toggleSlot = (slotKey: string) => {
    if (isPastDeadline) {
      showToast('Cổng đăng ký đã đóng (sau Thứ Sáu 21:00). Không thể chỉnh sửa ca trực!', 'warning');
      return;
    }

    setUserAvailability((prev) => {
      const nextSet = new Set(prev[currentUser.id] || []);
      if (nextSet.has(slotKey)) {
        nextSet.delete(slotKey);
      } else {
        nextSet.add(slotKey);
      }
      return {
        ...prev,
        [currentUser.id]: nextSet,
      };
    });
  };

  const handleSave = () => {
    if (isPastDeadline) {
      showToast('Cổng đăng ký đã đóng. Không thể lưu thay đổi mới.', 'error');
      return;
    }
    updateEmployeeAvailability(currentUser.id, registeredCount);
    showToast(
      `Đã lưu đăng ký cam kết khả năng làm việc (${registeredCount} ca) thành công!`,
      'success'
    );
  };

  const handleSendExplanation = () => {
    if (!explanationText.trim()) {
      showToast('Vui lòng nhập lý do giải trình cụ thể.', 'warning');
      return;
    }
    submitExplanation(currentUser.id, registeredCount, target, explanationText);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'Đăng ký ca của tôi' : 'Đăng ký khả năng làm việc (Availability)'}
        subtitle="Đăng ký cam kết khả năng làm việc cho tuần 41 (12/10 – 18/10)"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: isStaff ? 'Đăng ký ca của tôi' : 'Đăng ký ca' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Simulation toggle for deadline */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
              <span className="text-[11px] text-slate-500 font-medium px-1">Mô phỏng hạn chót:</span>
              <button
                onClick={() => setIsPastDeadline(false)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  !isPastDeadline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Unlock className="w-3 h-3 text-emerald-600" />
                Trước Thứ 6 21:00
              </button>
              <button
                onClick={() => setIsPastDeadline(true)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  isPastDeadline
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3 h-3 text-rose-600" />
                Sau Thứ 6 21:00
              </button>
            </div>

            {/* Manager view tabs */}
            {isManager && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setManagerTab('MY_AVAILABILITY')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    managerTab === 'MY_AVAILABILITY'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng ký ca của tôi
                </button>
                <button
                  onClick={() => setManagerTab('TEAM_OVERVIEW')}
                  className={`px-3 py-1 rounded font-semibold transition-all ${
                    managerTab === 'TEAM_OVERVIEW'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tiến độ đội ngũ (Xem)
                </button>
              </div>
            )}

            {/* Save Button */}
            {(!isManager || managerTab === 'MY_AVAILABILITY') && (
              <button
                onClick={handleSave}
                disabled={isPastDeadline}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu cam kết
              </button>
            )}
          </div>
        }
      />

      {/* Deadline Notice Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          isPastDeadline
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 flex-shrink-0 ${isPastDeadline ? 'text-rose-600' : 'text-amber-600'}`} />
          <div className="text-xs sm:text-sm">
            <strong>Thời hạn đăng ký ca:</strong> Mở lúc{' '}
            <span className="font-semibold">Thứ Năm 12:00</span> — Đóng cổng lúc{' '}
            <span className="font-semibold text-rose-700">Thứ Sáu 21:00</span>
          </div>
        </div>
        <div
          className={`text-xs px-2.5 py-1 rounded-md border font-semibold ${
            isPastDeadline
              ? 'bg-rose-100 border-rose-300 text-rose-950 flex items-center gap-1'
              : 'bg-amber-100 border-amber-300 text-amber-950'
          }`}
        >
          {isPastDeadline ? (
            <>
              <Lock className="w-3 h-3 text-rose-600" />
              Cổng đã khóa (Chỉ nộp giải trình nếu thiếu ca)
            </>
          ) : (
            'Cổng đang mở (Có thể chỉnh sửa)'
          )}
        </div>
      </div>

      {/* Manager Team Overview Tab View (READ ONLY) */}
      {isManager && managerTab === 'TEAM_OVERVIEW' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tổng quan đăng ký toàn đội ngũ (Chỉ xem)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu phục vụ kiểm tra điều kiện trước khi chạy Scheduler
              </p>
            </div>
            <span className="text-xs text-slate-500">14 nhân sự cần hoàn tất</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Nhân sự</th>
                  <th className="px-4 py-3">Chức danh</th>
                  <th className="px-4 py-3 text-center">Mục tiêu</th>
                  <th className="px-4 py-3 text-center">Đã đăng ký</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees
                  .filter((e) => e.role !== 'ADMIN')
                  .map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <span>{emp.name}</span>
                        {emp.id === currentUser.id && (
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            Bạn
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={emp.role} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {emp.targetShifts} ca
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700">
                        {emp.availabilityCount} ca
                      </td>
                      <td className="px-4 py-3">
                        {emp.availabilityCount > emp.targetShifts ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Hoàn tất
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Cần giải trình
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* My Availability Editing (For Staff & Manager) */
        <div className="space-y-6">
          {/* User Status Summary Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div>
                <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleBadge role={currentUser.role} size="sm" />
                </div>
              </div>
            </div>

            <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Mục tiêu quy định</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{target} ca / tuần</div>
            </div>

            <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Đã chọn cam kết</div>
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

          {/* Explanation Requirement if registered <= target */}
          {needsExplanation && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>
                  Bạn đang đăng ký {registeredCount} ca (chỉ tiêu là {target} ca). Vui lòng nhập giải trình lý do:
                </span>
              </div>
              <textarea
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="Nhập lý do cụ thể để Admin xem xét duyệt..."
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSendExplanation}
                  className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi giải trình cho Admin
                </button>
              </div>
            </div>
          )}

          {/* Interactive 7x4 Grid for user's own availability */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Lưới 28 khung giờ làm việc trong tuần (09:00 - 21:00)
              </span>
              <span className="text-[11px] text-slate-500">
                {isPastDeadline
                  ? '🔒 Lưới đã khóa sau hạn chót'
                  : 'Nhấn vào ô để bật/tắt cam kết có thể làm ca này'}
              </span>
            </div>

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
                      const isAvailable = mySlots.has(slotKey);

                      return (
                        <div
                          key={day.day}
                          onClick={() => toggleSlot(slotKey)}
                          className={`p-3 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center transition-all min-h-[85px] select-none ${
                            isPastDeadline ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                          } ${
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
      )}
    </div>
  );
};

export default AvailabilityPage;
