import React from 'react';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from '../common/RoleBadge';
import { StatusBadge } from '../common/StatusBadge';
import { HelpCircle } from 'lucide-react';

export const WorkloadPanel: React.FC = () => {
  const { workload, employees, t } = useApp();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.workload.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi phân bổ số ca tuần so với định mức chỉ tiêu của từng nhân viên
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
            <tr>
              <th className="px-4 py-3">{t.workload.staff}</th>
              <th className="px-4 py-3">{t.workload.role}</th>
              <th className="px-4 py-3 text-center">{t.workload.target}</th>
              <th className="px-4 py-3 text-center">{t.workload.planned}</th>
              <th className="px-4 py-3 text-center">{t.workload.actual}</th>
              <th className="px-4 py-3">{t.workload.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workload.map((item) => {
              const emp = employees.find((e) => e.id === item.employeeId);
              if (!emp) return null;

              return (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2.5">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div>{emp.name}</div>
                      {emp.nickname && (
                        <div className="text-[10px] text-slate-400">({emp.nickname})</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={emp.role} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">
                    {item.target}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-700">
                    {item.planned}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">
                    {item.actual}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={item.status} size="sm" />
                      {item.status === 'OVERLOAD' && (
                        <span
                          title={t.workload.overloadNote}
                          className="text-slate-400 hover:text-slate-600 cursor-help"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
