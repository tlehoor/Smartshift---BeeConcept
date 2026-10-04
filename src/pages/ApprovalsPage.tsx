import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { ExplanationRequest } from '../types';
import { ClipboardCheck, Check, X, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { t, explanations, employees, approveExplanation, rejectExplanation } = useApp();

  const [selectedExp, setSelectedExp] = useState<ExplanationRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const handleApprove = (id: string) => {
    approveExplanation(id, adminNote || 'Đã chấp thuận giải trình hợp lý.');
    setSelectedExp(null);
    setAdminNote('');
  };

  const handleReject = (id: string) => {
    rejectExplanation(id, adminNote || 'Lý do chưa thỏa đáng, vui lòng đăng ký lại.');
    setSelectedExp(null);
    setAdminNote('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phê duyệt giải trình đăng ký ca (Admin)"
        subtitle="Thẩm quyền Admin xem xét và phê duyệt các trường hợp đăng ký số ca thấp hơn chỉ tiêu quy định"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Quản trị' },
          { label: 'Phê duyệt giải trình' },
        ]}
      />

      {/* Explanation Policy Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <strong>Quy tắc hệ thống:</strong> Nhân viên đăng ký số ca thấp hơn hoặc bằng định mức
          (Chính thức &le; 6 ca, Thử việc &le; 4 ca, Workshop &le; 4 ca) bắt buộc phải có giải trình được <strong>Quản trị viên (Admin) phê duyệt</strong> trước khi Quản lý có thể chạy Scheduler phân ca tự động.
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.approvals.employee}</th>
                <th className="px-4 py-3">{t.common.role}</th>
                <th className="px-4 py-3 text-center">{t.approvals.availabilityGiven}</th>
                <th className="px-4 py-3 text-center">{t.approvals.targetRequired}</th>
                <th className="px-4 py-3">{t.approvals.reason}</th>
                <th className="px-4 py-3">{t.approvals.submittedAt}</th>
                <th className="px-4 py-3">{t.common.status}</th>
                <th className="px-4 py-3 text-right">{t.common.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {explanations.map((exp) => {
                const emp = employees.find((e) => e.id === exp.employeeId);

                return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp?.avatar}
                          alt={emp?.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div>{emp?.name}</div>
                          {emp?.nickname && (
                            <div className="text-[10px] text-slate-400">({emp.nickname})</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={emp?.role || 'OFFICIAL_STAFF'} size="sm" />
                    </td>

                    {/* Given vs Target */}
                    <td className="px-4 py-3 text-center font-bold text-amber-700 bg-amber-50/30">
                      {exp.availabilityCount} ca
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {exp.targetShifts} ca
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="line-clamp-2 text-slate-700 font-medium">"{exp.reason}"</div>
                      {exp.adminNote && (
                        <div className="text-[10px] text-slate-500 italic mt-1">
                          Phản hồi Admin: {exp.adminNote}
                        </div>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {exp.submittedAt}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {exp.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(exp.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleReject(exp.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {exp.reviewedBy ? `Đã xử lý bởi ${exp.reviewedBy}` : 'Đã xử lý'}
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
