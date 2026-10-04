import React from 'react';
import { ScheduleStatus, AccountStatus, RequestStatus, ApprovalStatus, WorkloadStatus } from '../../types';
import { useApp } from '../../context/AppContext';

interface StatusBadgeProps {
  status: ScheduleStatus | AccountStatus | RequestStatus | ApprovalStatus | WorkloadStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useApp();

  let text = status;
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'PUBLISHED':
      text = t.common.published;
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'DRAFT':
      text = t.common.draft;
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'WAITING':
      text = t.common.waiting;
      bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
    case 'RUNNING':
      text = t.common.running;
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      break;
    case 'ACTIVE':
      text = t.common.active;
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'BAN':
      text = t.common.banned;
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'PENDING':
      text = t.common.pending;
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'ACCEPTED':
      text = t.common.accepted;
      bgClass = 'bg-sky-50 text-sky-700 border-sky-200';
      break;
    case 'COMPLETED':
      text = t.common.completed;
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'REJECTED':
      text = t.common.rejected;
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'CANCELLED':
      text = 'Đã hủy';
      bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
      break;
    case 'OK':
      text = t.workload.ok;
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'WARNING':
      text = t.workload.warning;
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'OVERLOAD':
      text = t.workload.overload;
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    case 'APPROVED':
      text = 'Đã duyệt';
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'SETTLED':
      text = 'Đã thanh toán';
      bgClass = 'bg-slate-100 text-slate-600 border-slate-200';
      break;
    default:
      text = status;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClasses} ${bgClass}`}
    >
      {text}
    </span>
  );
};
