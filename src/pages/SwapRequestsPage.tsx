import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../types';
import { ArrowLeftRight, CheckCircle2, Clock, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SwapRequestsPage: React.FC = () => {
  const {
    t,
    swapRequests,
    employees,
    shifts,
    currentUser,
    acceptSwapRequest,
    rejectSwapRequest,
  } = useApp();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.swap.requestsTitle}
        subtitle="Quản lý các đề nghị hoán đổi ca làm việc trực tiếp giữa nhân sự"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: t.swap.requestsTitle },
        ]}
        actions={
          <Link
            to="/swap"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Đề nghị đổi ca mới
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Người đề nghị</th>
                <th className="px-4 py-3">Ca của người đề nghị</th>
                <th className="px-4 py-3">Đối tác nhận đề nghị</th>
                <th className="px-4 py-3">Ca hoán đổi mong muốn</th>
                <th className="px-4 py-3">{t.common.status}</th>
                <th className="px-4 py-3 text-right">{t.common.action}</th>
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

                const isTargetMe =
                  swap.targetEmployeeId === currentUser.id || currentUser.role === 'MANAGER';
                const canRespond = swap.status === 'PENDING' && isTargetMe;

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
                      {swap.note && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs">
                          "{swap.note}"
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <img
                          src={targetEmp?.avatar}
                          alt={targetEmp?.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
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
                      {canRespond && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => acceptSwapRequest(swap.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Đồng ý đổi
                          </button>
                          <button
                            onClick={() => rejectSwapRequest(swap.id)}
                            className="px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {swap.status === 'ACCEPTED' && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Đã hoán đổi vào lịch
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
