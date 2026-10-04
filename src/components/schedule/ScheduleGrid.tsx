import React from 'react';
import { ShiftAssignment, Employee, SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../../types';
import { ShiftCell } from './ShiftCell';

interface ScheduleGridProps {
  shifts: ShiftAssignment[];
  employees: Employee[];
  onSelectShift: (shift: ShiftAssignment) => void;
  isDraft?: boolean;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  shifts,
  employees,
  onSelectShift,
  isDraft,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Days Header */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/80 text-xs">
            {/* Corner Cell: Shift Time */}
            <div className="p-3 font-semibold text-slate-500 border-r border-slate-200 flex items-center justify-center">
              Khung giờ
            </div>

            {/* 7 Days of Week */}
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

          {/* 4 Shift Rows */}
          {SHIFT_DEFINITIONS.map((def) => (
            <div
              key={def.index}
              className="grid grid-cols-8 border-b border-slate-200 last:border-b-0 hover:bg-slate-50/30 transition-colors"
            >
              {/* Shift info column */}
              <div className="p-3 border-r border-slate-200 bg-slate-50/50 flex flex-col justify-center items-center text-center">
                <span className="font-bold text-slate-800 text-xs sm:text-sm">{def.label}</span>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">{def.timeRange}</span>
              </div>

              {/* 7 day cells for this shift */}
              {DAYS_OF_WEEK.map((day) => {
                const shift = shifts.find(
                  (s) => s.dayOfWeek === day.day && s.shiftIndex === def.index
                );

                if (!shift) {
                  return (
                    <div
                      key={day.day}
                      className="p-2 border-r border-slate-200 last:border-r-0 bg-slate-50/20"
                    />
                  );
                }

                return (
                  <div
                    key={day.day}
                    className="p-1.5 border-r border-slate-200 last:border-r-0"
                  >
                    <ShiftCell
                      shift={shift}
                      employees={employees}
                      onClick={onSelectShift}
                      isDraft={isDraft}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
