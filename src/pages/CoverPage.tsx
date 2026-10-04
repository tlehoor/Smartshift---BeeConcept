import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { RoleBadge } from '../components/common/RoleBadge';
import { coverService } from '../services/coverService';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import {
  UserPlus,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Calendar,
  Clock,
  Check,
} from 'lucide-react';

export const CoverPage: React.FC = () => {
  const { shifts, employees, currentUser, createCoverRequest, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected shift to cover
  const initialShiftId = searchParams.get('shiftId') || 'd1-s3';
  const [selectedShiftId, setSelectedShiftId] = useState(initialShiftId);
  const [note, setNote] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  const selectedShift = shifts.find((s) => s.id === selectedShiftId) || shifts[0];
  const dayInfo = DAYS_OF_WEEK.find((d) => d.day === selectedShift.dayOfWeek);
  const shiftDef = SHIFT_DEFINITIONS.find((s) => s.index === selectedShift.shiftIndex);

  // Group candidates using coverService
  const { suitable, support, unavailable } = useMemo(() => {
    return coverService.getCandidatesForShift(
      selectedShift,
      currentUser.id,
      employees,
      shifts
    );
  }, [selectedShift, currentUser.id, employees, shifts]);

  const toggleCandidate = (empId: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllSuitable = () => {
    const ids = suitable.map((c) => c.employee.id);
    setSelectedCandidateIds(ids);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCandidateIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ứng viên để gửi lời mời nhận ca.', 'warning');
      return;
    }
    createCoverRequest(selectedShift.id, selectedCandidateIds, note);
    navigate('/cover/requests');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhờ nhận ca (Cover)"
        subtitle="Mời đồng nghiệp nhận thay ca làm việc của bạn (hoạt động này tạo 1 công nợ ca)."
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: 'Nhờ nhận ca' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Shift & Note */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              1. Chọn ca muốn nhờ nhận
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Ca làm việc trong tuần
              </label>
              <select
                value={selectedShiftId}
                onChange={(e) => {
                  setSelectedShiftId(e.target.value);
                  setSelectedCandidateIds([]);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
              >
                {shifts.map((s) => {
                  const d = DAYS_OF_WEEK.find((day) => day.day === s.dayOfWeek);
                  const sd = SHIFT_DEFINITIONS.find((def) => def.index === s.shiftIndex);
                  return (
                    <option key={s.id} value={s.id}>
                      {d?.name} ({d?.dateStr}) — {sd?.label} ({sd?.timeRange})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Shift Highlight Box */}
            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs space-y-2">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <span>{dayInfo?.name}</span>
                <span>•</span>
                <span>{shiftDef?.label}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 font-mono">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{shiftDef?.timeRange}</span>
              </div>
              <div className="text-slate-600 text-[11px] pt-1 border-t border-blue-200/60">
                Nhân sự hiện tại trong ca:{' '}
                <strong>
                  {selectedShift.assignedEmployeeIds
                    .map((id) => employees.find((e) => e.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Ghi chú / Lý do nhờ nhận ca
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Em có việc gia đình đột xuất, nhờ mọi người nhận giúp em ạ..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              <strong>💡 Quy tắc công nợ:</strong> Sau khi có đồng nghiệp nhận ca thành công, bạn sẽ
              ghi nhận nợ họ 1 ca. Không có hạn dùng và có thể làm bù sau.
            </div>

            <button
              onClick={handleSubmit}
              disabled={selectedCandidateIds.length === 0}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi lời mời ({selectedCandidateIds.length} người)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Candidate Groups */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  2. Đề xuất danh sách ứng viên nhận ca
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân nhóm theo mức độ tương thích và ràng buộc thời gian làm việc
                </p>
              </div>

              {suitable.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllSuitable}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Chọn tất cả nhóm phù hợp
                </button>
              )}
            </div>

            {/* Group 1: Suitable */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Nhóm phù hợp nhất ({suitable.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Không trùng lịch, có đăng ký khả năng làm việc ca này và chưa quá 2 ca/ngày.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suitable.map((c) => {
                  const isChecked = selectedCandidateIds.includes(c.employee.id);
                  return (
                    <div
                      key={c.employee.id}
                      onClick={() => toggleCandidate(c.employee.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.employee.avatar}
                          alt={c.employee.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{c.employee.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <RoleBadge role={c.employee.role} size="sm" />
                            <span className="text-[10px] text-slate-500">
                              Đã có {c.dailyShiftsCount} ca/ngày
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-2" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Support */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Nhóm có thể hỗ trợ ({support.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Lịch trống trong giờ này nhưng chưa đăng ký Availability. Vẫn có thể gửi lời mời nhờ nhận ca.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {support.map((c) => {
                  const isChecked = selectedCandidateIds.includes(c.employee.id);
                  return (
                    <div
                      key={c.employee.id}
                      onClick={() => toggleCandidate(c.employee.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.employee.avatar}
                          alt={c.employee.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{c.employee.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <RoleBadge role={c.employee.role} size="sm" />
                            <span className="text-[10px] text-slate-500">Chưa cam kết ca này</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-2" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 3: Unavailable */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Không thể nhận ca ({unavailable.length})
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Trùng lịch hoặc sẽ vi phạm giới hạn tối đa 2 ca/ngày.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {unavailable.slice(0, 4).map((c) => (
                  <div
                    key={c.employee.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs opacity-75 flex items-start gap-2.5"
                  >
                    <img
                      src={c.employee.avatar}
                      alt={c.employee.name}
                      className="w-8 h-8 rounded-full object-cover grayscale"
                    />
                    <div>
                      <div className="font-medium text-slate-700">{c.employee.name}</div>
                      <div className="text-[11px] text-rose-600 mt-0.5 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {c.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
