import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import { UserPlus, Send, CheckCircle2, Clock, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoverRequestsPage: React.FC = () => {
  const {
    t,
    coverRequests,
    employees,
    shifts,
    currentUser,
    acceptCoverRequest,
    cancelCoverRequest,
  } = useApp();

  const [acceptingCandidateId, setAcceptingCandidateId] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.cover.requestsTitle}
        subtitle="Quản lý và phản hồi các yêu cầu nhờ nhận ca trong tuần"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: t.cover.requestsTitle },
        ]}
        actions={
          <Link
            to="/cover"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Tạo yêu cầu mới
          </Link>
        }
      />

      {/* Logic Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Quy tắc nhận ca:</strong> {t.cover.firstAcceptRule} Hoạt động này tự động ghi nhận +1 công nợ ca.
          </span>
        </div>
        <Link to="/debt" className="text-blue-700 font-bold hover:underline">
          Xem sổ công nợ &rarr;
        </Link>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.cover.requester}</th>
                <th className="px-4 py-3">{t.cover.shift}</th>
                <th className="px-4 py-3">{t.cover.invitedList}</th>
                <th className="px-4 py-3">{t.cover.acceptedBy}</th>
                <th className="px-4 py-3">{t.common.status}</th>
                <th className="px-4 py-3 text-right">{t.common.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coverRequests.map((req) => {
                const requester = employees.find((e) => e.id === req.requesterId);
                const shift = shifts.find((s) => s.id === req.shiftId);
                const day = DAYS_OF_WEEK.find((d) => d.day === req.dayOfWeek);
                const sDef = SHIFT_DEFINITIONS.find((s) => s.index === req.shiftIndex);
                const acceptedBy = employees.find((e) => e.id === req.acceptedByEmployeeId);

                const invitedEmployees = req.invitedCandidateIds
                  .map((id) => employees.find((e) => e.id === id))
                  .filter(Boolean);

                const isMyRequest = req.requesterId === currentUser.id;
                const canAccept = req.status === 'PENDING' && !isMyRequest;

                // Pick candidate for demo accept action
                const selectedCandidate =
                  acceptingCandidateId[req.id] || req.invitedCandidateIds[0] || currentUser.id;

                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Requester */}
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <img
                          src={requester?.avatar}
                          alt={requester?.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div>{requester?.name}</div>
                          <div className="text-[10px] text-slate-400">{req.createdAt}</div>
                        </div>
                      </div>
                    </td>

                    {/* Shift */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {day?.name} ({day?.dateStr})
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium">
                        {sDef?.label} • {sDef?.timeRange}
                      </div>
                      {req.note && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs">
                          "{req.note}"
                        </div>
                      )}
                    </td>

                    {/* Invited List */}
                    <td className="px-4 py-3">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {invitedEmployees.map((emp) => (
                          <img
                            key={emp?.id}
                            title={emp?.name}
                            src={emp?.avatar}
                            alt={emp?.name}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {invitedEmployees.length} nhân sự được mời
                      </div>
                    </td>

                    {/* Accepted By */}
                    <td className="px-4 py-3">
                      {acceptedBy ? (
                        <div className="flex items-center gap-2 text-emerald-800 font-medium">
                          <img
                            src={acceptedBy.avatar}
                            alt={acceptedBy.name}
                            className="w-6 h-6 rounded-full object-cover border border-emerald-300"
                          />
                          <span>{acceptedBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa ai nhận</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {canAccept && (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={selectedCandidate}
                            onChange={(e) =>
                              setAcceptingCandidateId({
                                ...acceptingCandidateId,
                                [req.id]: e.target.value,
                              })
                            }
                            className="text-[11px] border border-slate-300 rounded px-1.5 py-1 bg-white"
                          >
                            {invitedEmployees.map((e) => (
                              <option key={e?.id} value={e?.id}>
                                Nhận với tư cách: {e?.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => acceptCoverRequest(req.id, selectedCandidate)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition-colors"
                          >
                            Nhận ca
                          </button>
                        </div>
                      )}

                      {isMyRequest && req.status === 'PENDING' && (
                        <button
                          onClick={() => cancelCoverRequest(req.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Hủy yêu cầu
                        </button>
                      )}

                      {req.status === 'COMPLETED' && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Đã điều phối vào lịch
                        </span>
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
  );
};
