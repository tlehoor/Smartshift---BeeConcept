import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { RoleBadge } from '../components/common/RoleBadge';
import { swapService } from '../services/swapService';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import {
  ArrowLeftRight,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const SwapPage: React.FC = () => {
  const { t, shifts, employees, currentUser, createSwapRequest, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialShiftId = searchParams.get('shiftId') || 'd2-s4';
  const [myShiftId, setMyShiftId] = useState(initialShiftId);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const myShift = shifts.find((s) => s.id === myShiftId) || shifts[0];
  const myDay = DAYS_OF_WEEK.find((d) => d.day === myShift.dayOfWeek);
  const myDef = SHIFT_DEFINITIONS.find((s) => s.index === myShift.shiftIndex);

  // Propose eligible candidates
  const candidates = useMemo(() => {
    return swapService.getEligibleSwapCandidates(
      myShift,
      currentUser.id,
      shifts,
      employees
    );
  }, [myShift, currentUser.id, shifts, employees]);

  const handleSendSwap = () => {
    if (selectedCandidateIndex === null || !candidates[selectedCandidateIndex]) {
      showToast('Vui lòng chọn 1 đề xuất hoán đổi ca.', 'warning');
      return;
    }
    const cand = candidates[selectedCandidateIndex];
    createSwapRequest(myShift.id, cand.employee.id, cand.candidateShiftId, note);
    navigate('/swap/requests');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.swap.title}
        subtitle="Hoán đổi trực tiếp 2 ca làm việc giữa bạn và đồng nghiệp (hoạt động này KHÔNG tạo công nợ ca)."
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: t.swap.title },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Select my shift */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              1. Chọn ca của bạn cần đổi
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Ca của bạn
              </label>
              <select
                value={myShiftId}
                onChange={(e) => {
                  setMyShiftId(e.target.value);
                  setSelectedCandidateIndex(null);
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

            <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs space-y-2">
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

        {/* Right: Eligible Candidate cards */}
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
                          <span>{t.swap.noConflict}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.swap.maxTwoDaily}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.swap.availabilityMatch}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
