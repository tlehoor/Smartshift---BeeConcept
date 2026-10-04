import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { GitBranch, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VersionComparisonPage: React.FC = () => {
  const { versions, employees, showToast } = useApp();
  const navigate = useNavigate();

  const [verA, setVerA] = useState('V2');
  const [verB, setVerB] = useState('V3');

  // Realistic mock diff items between V2 and V3
  const diffItems = [
    {
      employeeId: 'emp-ws-01',
      shiftName: 'Thứ 6 — Ca 4 (18:00 - 21:00)',
      oldState: 'Không xếp ca (Làm rời rạc)',
      newState: 'Xếp ca liền nhau (Ca 3 + Ca 4)',
      reason: 'Ưu tiên tối ưu ca liên tiếp cho Workshop để thuận tiện đi lại',
      type: 'OPTIMIZED',
    },
    {
      employeeId: 'emp-prob-01',
      shiftName: 'Thứ 6 — Ca 4 (Ca đặc biệt)',
      oldState: 'Trống 1 vị trí (Thiếu nhân sự)',
      newState: 'Chỉ định bổ sung (Dự phòng Probation)',
      reason: 'Official Staff không đủ availability, kích hoạt phương án dự phòng thử việc',
      type: 'FALLBACK',
    },
    {
      employeeId: 'emp-mgr-01',
      shiftName: 'Thứ 2 — Ca 3 (Ca đặc biệt)',
      oldState: 'Trần Thu Trang (Quản lý)',
      newState: 'Nguyễn Minh Anh (Quản lý)',
      reason: 'Cân bằng số ca tuần của Manager theo đúng hạn ngạch 4 ca',
      type: 'BALANCED',
    },
    {
      employeeId: 'emp-off-03',
      shiftName: 'Thứ 5 — Ca 4',
      oldState: '5 ca / tuần',
      newState: '6 ca / tuần (Đạt mục tiêu)',
      reason: 'Điều phối thêm ca tối Thứ 5 để đạt target 6 ca/tuần',
      type: 'OPTIMIZED',
    },
  ];

  const handleApplyVersion = (ver: string) => {
    showToast(`Đã chọn kích hoạt phiên bản ${ver} làm bản nháp hoạt động.`, 'success');
    navigate('/scheduler/draft');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="So sánh phiên bản lịch"
        subtitle="So sánh chi tiết các thay đổi phân bổ ca giữa 2 phiên bản thuật toán"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Phiên bản lịch', href: '/scheduler/versions' },
          { label: 'So sánh' },
        ]}
      />

      {/* Selectors Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Phiên bản gốc:</span>
            <select
              value={verA}
              onChange={(e) => setVerA(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800"
            >
              <option value="V1">Phiên bản V1</option>
              <option value="V2">Phiên bản V2</option>
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Phiên bản so sánh:</span>
            <select
              value={verB}
              onChange={(e) => setVerB(e.target.value)}
              className="text-xs font-bold border border-blue-400 rounded-lg px-3 py-1.5 bg-blue-50 text-blue-900"
            >
              <option value="V3">Phiên bản V3 (Mới nhất)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => handleApplyVersion(verB)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Áp dụng phiên bản {verB}
        </button>
      </div>

      {/* Summary Comparison Metric */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">{verA} (Trước tối ưu)</span>
            <StatusBadge status="WAITING" size="sm" />
          </div>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li>• Cảnh báo ràng buộc: <strong>3 vi phạm</strong></li>
            <li>• Số nhân viên đạt mục tiêu: <strong>12 / 14</strong></li>
            <li>• Ca thiếu người: <strong>1 ca</strong></li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-blue-950 text-sm">{verB} (Sau tối ưu tự động)</span>
            <StatusBadge status="DRAFT" size="sm" />
          </div>
          <ul className="text-xs text-blue-900 space-y-1.5">
            <li>• Cảnh báo ràng buộc: <strong>1 cảnh báo (đã khắc phục bằng fallback)</strong></li>
            <li>• Số nhân viên đạt mục tiêu: <strong>14 / 14 (100%)</strong></li>
            <li>• Ca thiếu người: <strong>0 ca</strong></li>
          </ul>
        </div>
      </div>

      {/* Detailed Diff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900">Chi tiết thay đổi phân bổ nhân sự</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách 4 thay đổi cụ thể giữa {verA} và {verB}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Nhân sự</th>
                <th className="px-4 py-3">Ca làm việc</th>
                <th className="px-4 py-3">{verA} (Cũ)</th>
                <th className="px-4 py-3">{verB} (Mới)</th>
                <th className="px-4 py-3">Lý do thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diffItems.map((diff, idx) => {
                const emp = employees.find((e) => e.id === diff.employeeId);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <img
                        src={emp?.avatar}
                        alt={emp?.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div>{emp?.name}</div>
                        <RoleBadge role={emp?.role || 'OFFICIAL_STAFF'} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{diff.shiftName}</td>
                    <td className="px-4 py-3 text-slate-500 line-through bg-slate-50/50">
                      {diff.oldState}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-700 bg-blue-50/30">
                      {diff.newState}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs leading-relaxed">
                      {diff.reason}
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
