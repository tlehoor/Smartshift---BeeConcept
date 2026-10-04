import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { debtService } from '../services/debtService';
import { Receipt, CheckCircle2, Clock, AlertCircle, ArrowUpRight, Check } from 'lucide-react';

export const DebtPage: React.FC = () => {
  const { t, debts, employees, currentUser, settleDebt } = useApp();
  const [activeTab, setActiveTab] = useState<'I_OWE' | 'OWED_TO_ME'>('I_OWE');

  const { iOwe, owedToMe } = debtService.getDebtsForUser(debts, currentUser.id);

  const displayedList = activeTab === 'I_OWE' ? iOwe : owedToMe;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.debt.title}
        subtitle={t.debt.subtitle}
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: t.debt.title },
        ]}
      />

      {/* Rules Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Nguyên tắc công nợ:</strong> Chỉ thao tác <em>Nhờ nhận ca (Cover)</em> mới tạo
            công nợ ca. <em>Đổi ca (Swap)</em> không tạo công nợ. Công nợ không có ngày hết hạn và
            không bao giờ mang giá trị âm.
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => setActiveTab('I_OWE')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'I_OWE'
              ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {t.debt.tabIOwe}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              {iOwe.length} khoản
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {iOwe.reduce((acc, curr) => acc + curr.shiftsCount, 0)} ca
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số ca làm bù bạn cần hoàn trả cho đồng nghiệp
          </p>
        </div>

        <div
          onClick={() => setActiveTab('OWED_TO_ME')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'OWED_TO_ME'
              ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              {t.debt.tabOwedToMe}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              {owedToMe.length} khoản
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {owedToMe.reduce((acc, curr) => acc + curr.shiftsCount, 0)} ca
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số ca đồng nghiệp đang nợ và sẽ làm bù cho bạn
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('I_OWE')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'I_OWE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t.debt.tabIOwe}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {iOwe.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OWED_TO_ME')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'OWED_TO_ME'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t.debt.tabOwedToMe}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {owedToMe.length}
          </span>
        </button>
      </div>

      {/* Debt Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">{t.debt.noDebt}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.debt.person}</th>
                  <th className="px-4 py-3 text-center">{t.debt.shiftsCount}</th>
                  <th className="px-4 py-3">{t.debt.details}</th>
                  <th className="px-4 py-3">{t.common.date}</th>
                  <th className="px-4 py-3">{t.common.status}</th>
                  <th className="px-4 py-3 text-right">{t.common.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map((item) => {
                  const partnerId =
                    activeTab === 'I_OWE' ? item.creditorId : item.debtorId;
                  const partner = employees.find((e) => e.id === partnerId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={partner?.avatar}
                            alt={partner?.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div>{partner?.name}</div>
                            <RoleBadge role={partner?.role || 'OFFICIAL_STAFF'} size="sm" />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-sm text-slate-900">
                          {item.shiftsCount} ca
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.relatedAction}</div>
                        {item.note && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">{item.note}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500">{item.createdAt}</td>

                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      <td className="px-4 py-3 text-right">
                        {item.status === 'ACTIVE' && (
                          <button
                            onClick={() => settleDebt(item.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded shadow-2xs transition-colors inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {t.debt.settle}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
