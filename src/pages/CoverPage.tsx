import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { RoleBadge } from '../components/common/RoleBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { coverService } from '../services/coverService';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import {
  UserPlus,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  Check,
  Inbox,
  X,
  RotateCcw,
} from 'lucide-react';

export const CoverPage: React.FC = () => {
  const {
    shifts,
    employees,
    currentUser,
    coverRequests,
    createCoverRequest,
    acceptCoverRequest,
    cancelCoverRequest,
    showToast,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active tab: 'CREATE' or 'REQUESTS'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'CREATE' | 'REQUESTS'>(
    tabParam === 'requests' ? 'REQUESTS' : 'CREATE'
  );

  // My assigned shifts ONLY (CRITICAL OWNERSHIP RULE)
  const myAssignedShifts = useMemo(() => {
    return shifts.filter((s) => s.assignedEmployeeIds.includes(currentUser.id));
  }, [shifts, currentUser.id]);

  const initialShiftId = searchParams.get('shiftId');
  const validInitialShift =
    myAssignedShifts.find((s) => s.id === initialShiftId)?.id ||
    myAssignedShifts[0]?.id ||
    '';

  const [selectedShiftId, setSelectedShiftId] = useState(validInitialShift);
  const [note, setNote] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialShiftId && myAssignedShifts.some((s) => s.id === initialShiftId)) {
      setSelectedShiftId(initialShiftId);
      setActiveTab('CREATE');
    }
  }, [initialShiftId, myAssignedShifts]);

  const selectedShift = myAssignedShifts.find((s) => s.id === selectedShiftId);
  const dayInfo = selectedShift ? DAYS_OF_WEEK.find((d) => d.day === selectedShift.dayOfWeek) : null;
  const shiftDef = selectedShift ? SHIFT_DEFINITIONS.find((s) => s.index === selectedShift.shiftIndex) : null;

  // Group candidates using coverService
  const { suitable, support, unavailable } = useMemo(() => {
    if (!selectedShift) return { suitable: [], support: [], unavailable: [] };
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
    if (!selectedShift) {
      showToast('Vui lòng chọn ca làm việc của bạn cần nhờ nhận.', 'error');
      return;
    }
    if (selectedCandidateIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ứng viên để gửi lời mời nhận ca.', 'warning');
      return;
    }
    createCoverRequest(selectedShift.id, selectedCandidateIds, note);
    setActiveTab('REQUESTS');
    setSearchParams({ tab: 'requests' });
    setNote('');
    setSelectedCandidateIds([]);
  };

  // Filter requests for requests tab
  const incomingRequests = coverRequests.filter(
    (r) => r.status === 'PENDING' && r.invitedCandidateIds.includes(currentUser.id)
  );
  const mySentRequests = coverRequests.filter((r) => r.requesterId === currentUser.id);
  const otherCompletedRequests = coverRequests.filter(
    (r) => r.status !== 'PENDING' || (!r.invitedCandidateIds.includes(currentUser.id) && r.requesterId !== currentUser.id)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhờ nhận ca (Cover)"
        subtitle="Mời đồng nghiệp nhận thay ca làm việc của bạn • Hoạt động này tạo 1 công nợ ca"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: 'Nhờ nhận ca' },
        ]}
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab('CREATE');
            setSearchParams({});
          }}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'CREATE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Tạo yêu cầu nhờ nhận ca</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('REQUESTS');
            setSearchParams({ tab: 'requests' });
          }}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'REQUESTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Yêu cầu & Lời mời nhận ca</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'CREATE' ? (
        /* TAB 1: Create Cover Request */
        myAssignedShifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
            <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Bạn chưa có ca làm việc nào trong tuần này
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bạn chỉ có thể nhờ người khác nhận những ca mà bạn đã được phân bổ chính thức.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Select MY Shift & Note */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  1. Chọn ca của bạn muốn nhờ nhận
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ca của bạn ({myAssignedShifts.length} ca khả dụng)
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => {
                      setSelectedShiftId(e.target.value);
                      setSelectedCandidateIds([]);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {myAssignedShifts.map((s) => {
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
                {selectedShift && (
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
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ghi chú / Lý do nhờ nhận ca
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Ví dụ: Em có việc cá nhân bận vào khung giờ này..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
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

            {/* Right: Candidate Groups */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      2. Đề xuất danh sách ứng viên nhận ca
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chỉ hiển thị đồng nghiệp không bị trùng lịch và chưa quá 2 ca/ngày
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

                {/* Group 1: Recommended */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Nhóm phù hợp nhất ({suitable.length})
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Không trùng lịch, đã đăng ký cam kết ca này và chưa quá 2 ca/ngày.
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
                                  {c.dailyShiftsCount} ca/ngày
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

                {/* Group 2: Available to ask */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Nhóm có thể hỗ trợ ({support.length})
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Lịch trống trong giờ này nhưng chưa cam kết Availability. Vẫn có thể mời hỗ trợ.
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

                {/* Group 3: Unavailable with Reason */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Không thể nhận ca ({unavailable.length})
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Đã có lịch làm việc trong khung giờ này hoặc đã đạt giới hạn 2 ca/ngày.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {unavailable.slice(0, 4).map((c) => (
                      <div
                        key={c.employee.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs opacity-70 flex items-start gap-2.5"
                      >
                        <img
                          src={c.employee.avatar}
                          alt={c.employee.name}
                          className="w-8 h-8 rounded-full object-cover grayscale"
                        />
                        <div>
                          <div className="font-medium text-slate-700">{c.employee.name}</div>
                          <div className="text-[11px] text-rose-600 mt-0.5 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{c.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* TAB 2: Cover Requests list */
        <div className="space-y-6">
          {/* Incoming invitations for me */}
          {incomingRequests.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Lời mời nhận ca gửi đến bạn ({incomingRequests.length})
              </h3>
              <div className="space-y-2.5">
                {incomingRequests.map((req) => {
                  const requester = employees.find((e) => e.id === req.requesterId);
                  const day = DAYS_OF_WEEK.find((d) => d.day === req.dayOfWeek);
                  const sDef = SHIFT_DEFINITIONS.find((s) => s.index === req.shiftIndex);

                  return (
                    <div
                      key={req.id}
                      className="p-3.5 bg-white rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={requester?.avatar}
                          alt={requester?.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            {requester?.name} nhờ nhận ca:
                          </div>
                          <div className="text-slate-700 font-medium">
                            {day?.name} ({day?.dateStr}) — {sDef?.label} ({sDef?.timeRange})
                          </div>
                          {req.note && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              "{req.note}"
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => acceptCoverRequest(req.id, currentUser.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 self-end sm:self-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Chấp nhận nhận ca
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Cover Requests Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Lịch sử và tiến độ nhờ nhận ca tuần này</h3>
              <span className="text-xs text-slate-500">Người đầu tiên chấp nhận sẽ được nhận ca</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Người yêu cầu</th>
                    <th className="px-4 py-3">Ca nhờ nhận</th>
                    <th className="px-4 py-3">Được mời</th>
                    <th className="px-4 py-3">Người nhận ca</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coverRequests.map((req) => {
                    const requester = employees.find((e) => e.id === req.requesterId);
                    const day = DAYS_OF_WEEK.find((d) => d.day === req.dayOfWeek);
                    const sDef = SHIFT_DEFINITIONS.find((s) => s.index === req.shiftIndex);
                    const acceptedBy = employees.find((e) => e.id === req.acceptedByEmployeeId);

                    const isMyRequest = req.requesterId === currentUser.id;
                    const isInvited = req.invitedCandidateIds.includes(currentUser.id);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <img
                              src={requester?.avatar}
                              alt={requester?.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div>{requester?.name}</div>
                              {isMyRequest && (
                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 py-0.2 rounded">
                                  Bạn
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {day?.name} ({day?.dateStr})
                          </div>
                          <div className="text-[11px] text-blue-600 font-medium font-mono">
                            {sDef?.label} • {sDef?.timeRange}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {req.invitedCandidateIds.length} nhân sự
                        </td>

                        <td className="px-4 py-3">
                          {acceptedBy ? (
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{acceptedBy.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chờ phản hồi</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={req.status} size="sm" />
                        </td>

                        <td className="px-4 py-3 text-right">
                          {isMyRequest && req.status === 'PENDING' ? (
                            <button
                              onClick={() => cancelCoverRequest(req.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                            >
                              Hủy yêu cầu
                            </button>
                          ) : req.status === 'PENDING' && isInvited ? (
                            <button
                              onClick={() => acceptCoverRequest(req.id, currentUser.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs"
                            >
                              Nhận ca
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverPage;
