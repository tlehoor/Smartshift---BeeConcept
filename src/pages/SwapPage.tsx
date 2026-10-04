import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { RoleBadge } from '../components/common/RoleBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { swapService } from '../services/swapService';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import {
  ArrowLeftRight,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  Check,
  X,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export const SwapPage: React.FC = () => {
  const {
    shifts,
    employees,
    currentUser,
    swapRequests,
    createSwapRequest,
    acceptSwapRequest,
    rejectSwapRequest,
    showToast,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();

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

  const [myShiftId, setMyShiftId] = useState(validInitialShift);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialShiftId && myAssignedShifts.some((s) => s.id === initialShiftId)) {
      setMyShiftId(initialShiftId);
      setActiveTab('CREATE');
    }
  }, [initialShiftId, myAssignedShifts]);

  const myShift = myAssignedShifts.find((s) => s.id === myShiftId);
  const myDay = myShift ? DAYS_OF_WEEK.find((d) => d.day === myShift.dayOfWeek) : null;
  const myDef = myShift ? SHIFT_DEFINITIONS.find((s) => s.index === myShift.shiftIndex) : null;

  // Propose eligible candidates
  const candidates = useMemo(() => {
    if (!myShift) return [];
    return swapService.getEligibleSwapCandidates(
      myShift,
      currentUser.id,
      shifts,
      employees
    );
  }, [myShift, currentUser.id, shifts, employees]);

  const handleSendSwap = () => {
    if (!myShift) {
      showToast('Vui lòng chọn ca làm việc của bạn cần đổi.', 'error');
      return;
    }
    if (selectedCandidateIndex === null || !candidates[selectedCandidateIndex]) {
      showToast('Vui lòng chọn 1 đề xuất hoán đổi ca từ đồng nghiệp.', 'warning');
      return;
    }
    const cand = candidates[selectedCandidateIndex];
    createSwapRequest(myShift.id, cand.employee.id, cand.candidateShiftId, note);
    setActiveTab('REQUESTS');
    setSearchParams({ tab: 'requests' });
    setNote('');
    setSelectedCandidateIndex(null);
  };

  // Pending swap requests targeting me
  const incomingSwaps = swapRequests.filter(
    (s) => s.status === 'PENDING' && s.targetEmployeeId === currentUser.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đổi ca làm việc (Swap)"
        subtitle="Hoán đổi trực tiếp 2 ca giữa bạn và đồng nghiệp • Hoạt động này KHÔNG tạo công nợ ca"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: 'Đổi ca' },
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
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Đề nghị đổi ca mới</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('REQUESTS');
            setSearchParams({ tab: 'requests' });
          }}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'REQUESTS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Yêu cầu đổi ca của bạn & đồng nghiệp</span>
          {incomingSwaps.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {incomingSwaps.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'CREATE' ? (
        /* TAB 1: Create Swap Request */
        myAssignedShifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
            <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Bạn chưa có ca làm việc nào trong tuần này
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bạn chỉ có thể thực hiện đổi ca khi đã có ít nhất một ca trực được phân bổ chính thức.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Select MY Shift & Note */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  1. Chọn ca của bạn cần đổi
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ca hiện tại của bạn ({myAssignedShifts.length} ca khả dụng)
                  </label>
                  <select
                    value={myShiftId}
                    onChange={(e) => {
                      setMyShiftId(e.target.value);
                      setSelectedCandidateIndex(null);
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

                {myShift && (
                  <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs space-y-1.5">
                    <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>{myDay?.name}</span>
                      <span>•</span>
                      <span>{myDef?.label}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 font-mono">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{myDef?.timeRange}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Lời nhắn trao đổi
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Ví dụ: Đổi ca tối Thứ 3 lấy sáng Thứ 5 để tiện lịch học nhé..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  <strong>💡 Nguyên tắc Đổi ca:</strong> Hoán đổi trực tiếp 1-1, hai bên tự cân bằng số ca
                  nên không phát sinh công nợ ca.
                </div>

                <button
                  onClick={handleSendSwap}
                  disabled={selectedCandidateIndex === null}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi đề nghị đổi ca</span>
                </button>
              </div>
            </div>

            {/* Right: Candidate cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                    2. Đề xuất ca đối ứng tương thích từ đồng nghiệp
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống tự động sàng lọc những ca đối ứng không gây xung đột lịch cho cả hai bên
                  </p>
                </div>

                {candidates.length === 0 ? (
                  <div className="text-center p-8 text-xs text-slate-400">
                    Không tìm thấy ca đối ứng nào phù hợp với ca hiện tại của bạn.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {candidates.slice(0, 6).map((c, idx) => {
                      const targetDay = DAYS_OF_WEEK.find((d) => d.day === c.candidateDayOfWeek);
                      const targetDef = SHIFT_DEFINITIONS.find(
                        (s) => s.index === c.candidateShiftIndex
                      );
                      const isSelected = selectedCandidateIndex === idx;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedCandidateIndex(idx)}
                          className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-400'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={c.employee.avatar}
                                  alt={c.employee.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{c.employee.name}</div>
                                  <RoleBadge role={c.employee.role} size="sm" />
                                </div>
                              </div>
                              <input
                                type="radio"
                                name="swap-cand"
                                checked={isSelected}
                                onChange={() => setSelectedCandidateIndex(idx)}
                                className="w-4 h-4 text-indigo-600"
                              />
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 mb-3">
                              <div className="text-[11px] text-slate-400">Ca hiện tại của bạn:</div>
                              <div className="font-semibold text-slate-800">
                                {myDay?.name} — {myDef?.label} ({myDef?.timeRange})
                              </div>
                              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                                Đổi lấy ca của {c.employee.nickname || c.employee.name}:
                              </div>
                              <div className="font-bold text-indigo-700">
                                {targetDay?.name} — {targetDef?.label} ({targetDef?.timeRange})
                              </div>
                            </div>

                            {/* Verification Checks */}
                            <div className="space-y-1 text-[11px] text-emerald-700 font-medium">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Không trùng lịch cho cả 2 người</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Không vượt quá 2 ca/ngày</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* TAB 2: Swap Requests List */
        <div className="space-y-6">
          {/* Incoming Swap Requests targeting me */}
          {incomingSwaps.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Đề nghị đổi ca gửi đến bạn ({incomingSwaps.length})
              </h3>

              <div className="space-y-2.5">
                {incomingSwaps.map((swap) => {
                  const requester = employees.find((e) => e.id === swap.requesterId);
                  const reqShift = shifts.find((s) => s.id === swap.requesterShiftId);
                  const reqDay = DAYS_OF_WEEK.find((d) => d.day === reqShift?.dayOfWeek);
                  const reqDef = SHIFT_DEFINITIONS.find((s) => s.index === reqShift?.shiftIndex);

                  const tarShift = shifts.find((s) => s.id === swap.targetShiftId);
                  const tarDay = DAYS_OF_WEEK.find((d) => d.day === tarShift?.dayOfWeek);
                  const tarDef = SHIFT_DEFINITIONS.find((s) => s.index === tarShift?.shiftIndex);

                  return (
                    <div
                      key={swap.id}
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
                            {requester?.name} đề nghị đổi ca:
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            Ca của họ:{' '}
                            <strong className="text-slate-800">
                              {reqDay?.name} {reqDef?.label}
                            </strong>{' '}
                            &harr; Ca của bạn:{' '}
                            <strong className="text-indigo-700">
                              {tarDay?.name} {tarDef?.label}
                            </strong>
                          </div>
                          {swap.note && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              "{swap.note}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => acceptSwapRequest(swap.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Đồng ý đổi
                        </button>
                        <button
                          onClick={() => rejectSwapRequest(swap.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table of all swap requests */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Danh sách đề nghị hoán đổi ca</h3>
              <span className="text-xs text-slate-500">Đổi ca trực tiếp không làm phát sinh công nợ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Người đề nghị</th>
                    <th className="px-4 py-3">Ca của người đề nghị</th>
                    <th className="px-4 py-3">Đối tác nhận đề nghị</th>
                    <th className="px-4 py-3">Ca muốn đổi</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {swapRequests.map((swap) => {
                    const requester = employees.find((e) => e.id === swap.requesterId);
                    const targetEmp = employees.find((e) => e.id === swap.targetEmployeeId);

                    const reqShift = shifts.find((s) => s.id === swap.requesterShiftId);
                    const reqDay = DAYS_OF_WEEK.find((d) => d.day === reqShift?.dayOfWeek);
                    const reqDef = SHIFT_DEFINITIONS.find((s) => s.index === reqShift?.shiftIndex);

                    const tarShift = shifts.find((s) => s.id === swap.targetShiftId);
                    const tarDay = DAYS_OF_WEEK.find((d) => d.day === tarShift?.dayOfWeek);
                    const tarDef = SHIFT_DEFINITIONS.find((s) => s.index === tarShift?.shiftIndex);

                    const isTargetMe = swap.targetEmployeeId === currentUser.id;

                    return (
                      <tr key={swap.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <img
                              src={requester?.avatar}
                              alt={requester?.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div>{requester?.name}</div>
                              <div className="text-[10px] text-slate-400">{swap.createdAt}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {reqDay?.name} ({reqDay?.dateStr})
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {reqDef?.label} • {reqDef?.timeRange}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <img
                              src={targetEmp?.avatar}
                              alt={targetEmp?.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            />
                            <span>{targetEmp?.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-indigo-700">
                            {tarDay?.name} ({tarDay?.dateStr})
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {tarDef?.label} • {tarDef?.timeRange}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={swap.status} size="sm" />
                        </td>

                        <td className="px-4 py-3 text-right">
                          {swap.status === 'PENDING' && isTargetMe ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => acceptSwapRequest(swap.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs"
                              >
                                Đổi ca
                              </button>
                            </div>
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

export default SwapPage;
