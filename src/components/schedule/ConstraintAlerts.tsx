import React from 'react';
import { ConstraintViolation } from '../../types';
import { AlertTriangle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface ConstraintAlertsProps {
  violations: ConstraintViolation[];
  onSelectViolation?: (violation: ConstraintViolation) => void;
}

export const ConstraintAlerts: React.FC<ConstraintAlertsProps> = ({
  violations,
  onSelectViolation,
}) => {
  if (violations.length === 0) return null;

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>Phát hiện {violations.length} ràng buộc cần người quản lý lưu ý:</span>
      </div>

      <div className="space-y-2.5">
        {violations.map((v, idx) => (
          <div
            key={v.id || idx}
            onClick={() => onSelectViolation && onSelectViolation(v)}
            className="p-3 bg-white rounded-lg border border-amber-200/80 flex items-start justify-between gap-3 text-xs hover:border-amber-400 hover:shadow-2xs transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded bg-amber-100 text-amber-700 mt-0.5 flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {v.title}
                </div>
                <div className="text-slate-600 mt-1 leading-relaxed">{v.message}</div>
                {v.fallbackUsed && (
                  <div className="mt-1.5 inline-block text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Fallback: {v.fallbackUsed}
                  </div>
                )}
              </div>
            </div>

            <span className="text-blue-600 font-semibold text-[11px] flex items-center gap-0.5 group-hover:underline flex-shrink-0 mt-0.5">
              Chi tiết
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
