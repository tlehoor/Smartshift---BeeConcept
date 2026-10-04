import React from 'react';
import { ShiftAssignment, Employee } from '../../types';
import { Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

import { useApp } from '../../context/AppContext';

interface ShiftCellProps {
  shift: ShiftAssignment;
  employees: Employee[];
  onClick: (shift: ShiftAssignment) => void;
  isDraft?: boolean;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  shift,
  employees,
  onClick,
}) => {
  const { currentUser } = useApp();
  const assigned = shift.assignedEmployeeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  const isUnderstaffed = assigned.length < shift.requiredCount;
  const isAssignedToMe = shift.assignedEmployeeIds.includes(currentUser.id);

  return (
    <div
      onClick={() => onClick(shift)}
      className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none text-left relative flex flex-col justify-between min-h-[105px] group ${
        isAssignedToMe
          ? 'ring-2 ring-blue-500/70 border-blue-400 bg-blue-50/20'
          : isUnderstaffed
          ? 'bg-rose-50/60 border-rose-200 hover:border-rose-400'
          : shift.isSpecialShift
          ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400 hover:shadow-xs'
          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
      }`}
    >
      {/* Top Header inside cell */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1">
          {isAssignedToMe && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Ca của bạn" />
          )}
          {shift.isSpecialShift && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
              title="Ca đặc biệt: 2 Official Staff + 1 Manager (hoặc dự phòng Thử việc)"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              Đặc biệt
            </span>
          )}

          {shift.specialShiftFallback && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800"
              title="Phương án dự phòng: Sử dụng Probation Staff bổ sung"
            >
              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            </span>
          )}
        </div>

        <span
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            isUnderstaffed
              ? 'bg-rose-100 text-rose-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {assigned.length}/{shift.requiredCount}
        </span>
      </div>

      {/* Staff list inside cell */}
      <div className="space-y-1 my-auto">
        {assigned.map((emp) => {
          let roleDot = 'bg-indigo-500';
          if (emp.role === 'MANAGER') roleDot = 'bg-blue-600';
          if (emp.role === 'PROBATION_STAFF') roleDot = 'bg-amber-500';
          if (emp.role === 'WORKSHOP') roleDot = 'bg-teal-500';

          return (
            <div
              key={emp.id}
              className="flex items-center gap-1.5 text-xs text-slate-800 truncate"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${roleDot}`} />
              <span className="truncate font-medium group-hover:text-blue-600 transition-colors">
                {emp.nickname || emp.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Understaffed warning */}
      {isUnderstaffed && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-rose-600">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          <span>Thiếu {shift.requiredCount - assigned.length} người</span>
        </div>
      )}
    </div>
  );
};
