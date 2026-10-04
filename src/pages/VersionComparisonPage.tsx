import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { GitBranch, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VersionComparisonPage: React.FC = () => {
  const { versions, employees, showToast } = useApp();
  const navigate = useNavigate();

  const versionNames = versions.map((v) => v.version);
  const defaultA = versionNames.length >= 2 ? versionNames[versionNames.length - 2] : versionNames[0] || 'V1';
  const defaultB = versionNames[versionNames.length - 1] || 'V2';

  const [verA, setVerA] = useState(defaultA);
  const [verB, setVerB] = useState(defaultB);

  const selectedVersionA = versions.find((v) => v.version === verA) || versions[0];
  const selectedVersionB = versions.find((v) => v.version === verB) || versions[versions.length - 1];

  // Domain diff items between versions
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
        title="So sánh phiên bản lịch (Version Comparison)"
        subtitle="So sánh chi tiết các thay đổi phân bổ ca giữa các phiên bản lịch nháp (V1 → V2 → V3...)"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Phiên bản lịch', href: '/scheduler/versions' },
          { label: 'So sánh' },
        ]}
      />

      {/* Selectors Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Phiên bản gốc:</span>
            <select
              value={verA}
              onChange={(e) => setVerA(e.target.value)}
              className="text-xs font-bold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 focus:outline-none"
            >
              {versionNames.map((v) => (
                <option key={`a-${v}`} value={v}>
                  Phiên bản {v}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Phiên bản so sánh:</span>
            <select
              value={verB}
              onChange={(e) => setVerB(e.target.value)}
              className="text-xs font-bold border border-blue-400 rounded-lg px-3 py-1.5 bg-blue-50 text-blue-900 focus:outline-none"
            >
              {versionNames.map((v) => (
                <option key={`b-${v}`} value={v}>
                  Phiên bản {v} {v === versionNames[versionNames.length - 1] && '(Mới nhất)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => handleApplyVersion(verB)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-end sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Áp dụng phiên bản {verB}
        </button>
      </div>

      {/* Summary Comparison Metric */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900 text-sm">
              {verA} ({selectedVersionA?.notes || 'Bản nháp ban đầu'})
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {selectedVersionA?.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mb-3">Tạo lúc: {selectedVersionA?.createdAt}</div>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li>• Cảnh báo ràng buộc: <strong>{selectedVersionA?.violationsCount || 2} cảnh báo</strong></li>
            <li>• Phân bổ: <strong>28 / 28 ca làm việc</strong></li>
            <li>• Trạng thái: <strong>Lưu trữ lịch sử (Không ghi đè)</strong></li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-blue-950 text-sm">
              {verB} ({selectedVersionB?.notes || 'Bản tối ưu tự động'})
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
              {selectedVersionB?.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mb-3">Tạo lúc: {selectedVersionB?.createdAt}</div>
          <ul className="text-xs text-blue-900 space-y-1.5">
            <li>• Cảnh báo ràng buộc: <strong>{selectedVersionB?.violationsCount || 1} cảnh báo (đã khắc phục bằng fallback)</strong></li>
            <li>• Tỷ lệ đạt mục tiêu nhân sự: <strong>96% - 100%</strong></li>
            <li>• Ca thiếu người: <strong>0 ca</strong></li>
          </ul>
        </div>
      </div>

      {/* Detailed Diff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chi tiết thay đổi phân bổ nhân sự</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách thay đổi tối ưu giữa phiên bản {verA} và {verB}
            </p>
          </div>
          <span className="text-xs text-slate-500">4 điểm khác biệt chính</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Nhân sự</th>
                <th className="px-4 py-3">Vị trí ca</th>
                <th className="px-4 py-3">Phiên bản {verA}</th>
                <th className="px-4 py-3">Phiên bản {verB}</th>
                <th className="px-4 py-3">Mục tiêu tối ưu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diffItems.map((item, idx) => {
                const emp = employees.find((e) => e.id === item.employeeId);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <img
                          src={emp?.avatar}
                          alt={emp?.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div>{emp?.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {emp?.nickname || emp?.role}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-800">{item.shiftName}</td>

                    <td className="px-4 py-3 text-slate-500 bg-rose-50/30 font-medium">
                      {item.oldState}
                    </td>

                    <td className="px-4 py-3 text-blue-700 bg-blue-50/40 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{item.newState}</span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 text-[11px] leading-relaxed">
                      {item.reason}
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

export default VersionComparisonPage;
