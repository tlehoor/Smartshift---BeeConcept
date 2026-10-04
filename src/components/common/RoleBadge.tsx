import React from 'react';
import { Role } from '../../types';
import { useApp } from '../../context/AppContext';

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const { t } = useApp();

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (role) {
    case 'ADMIN':
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'MANAGER':
      bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'OFFICIAL_STAFF':
      bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'PROBATION_STAFF':
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'WORKSHOP':
      bgClass = 'bg-teal-50 text-teal-700 border-teal-200';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClasses} ${bgClass}`}
    >
      {t.roles[role]}
    </span>
  );
};
