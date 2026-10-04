import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { DetailDrawer } from '../components/common/DetailDrawer';
import { AuditLogItem, AuditCategory } from '../types';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { t, auditLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const categories: { label: string; value: string }[] = [
    { label: 'Tất cả danh mục', value: 'ALL' },
    { label: 'Tự động phân ca (Scheduler)', value: 'SCHEDULER' },
    { label: 'Đăng ký khả năng làm việc', value: 'AVAILABILITY' },
    { label: 'Nhờ nhận ca (Cover)', value: 'COVER' },
    { label: 'Đổi ca (Swap)', value: 'SWAP' },
    { label: 'Công nợ ca (Debt)', value: 'DEBT' },
    { label: 'Nhân sự (Employee)', value: 'EMPLOYEE' },
    { label: 'Phê duyệt giải trình (Approval)', value: 'APPROVAL' },
    { label: 'Lịch phân ca (Schedule)', value: 'SCHEDULE' },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetObject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.audit.title}
        subtitle={t.audit.subtitle}
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Hệ thống' },
          { label: t.audit.title },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo hành động, người thực hiện, đối tượng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Danh mục:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.common.time}</th>
                <th className="px-4 py-3">{t.audit.actor}</th>
                <th className="px-4 py-3">{t.audit.action}</th>
                <th className="px-4 py-3">{t.audit.category}</th>
                <th className="px-4 py-3">{t.audit.object}</th>
                <th className="px-4 py-3">{t.audit.result}</th>
                <th className="px-4 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{log.actorName}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-700 max-w-xs truncate">
                    {log.targetObject}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.result === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {log.result === 'SUCCESS' ? 'Thành công' : 'Cảnh báo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 group-hover:text-blue-600">
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết sự kiện nhật ký"
        subtitle={selectedLog?.id}
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">Hành động</span>
                <span className="text-sm font-bold text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Danh mục</span>
                  <span className="font-semibold text-slate-800">{selectedLog.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Kết quả</span>
                  <span className="font-bold text-emerald-700">
                    {selectedLog.result === 'SUCCESS' ? 'Thành công' : 'Cảnh báo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Người thực hiện</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-medium text-slate-900">
                  {selectedLog.actorName} (ID: {selectedLog.actorId})
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Đối tượng tác động</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-medium text-blue-700">
                  {selectedLog.targetObject}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Mô tả chi tiết</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLog.detail}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Thời gian ghi nhận</span>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-slate-600">
                  {selectedLog.timestamp}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
