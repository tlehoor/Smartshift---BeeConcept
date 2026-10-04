import React, { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlight?: boolean;
  badge?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  highlight,
  badge,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border bg-white shadow-2xs transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-xs' : ''
      } ${highlight ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {badge}
          </span>
        )}
      </div>
      {(subtext || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          {subtext && <span>{subtext}</span>}
          {trend && (
            <span
              className={`font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
