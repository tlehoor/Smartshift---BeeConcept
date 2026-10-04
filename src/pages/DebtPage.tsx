import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { debtService } from '../services/debtService';
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Check,
  ArrowLeftRight,
  Sparkles,
  History,
  ShieldCheck,
} from 'lucide-react';

export const DebtPage: React.FC = () => {
  const { t, debts, employees, currentUser, settleDebt, offsetDebts } = useApp();
  const [activeTab, setActiveTab] = useState<'I_OWE' | 'OWED_TO_ME' | 'HISTORY'>('I_OWE');

  const { iOwe, owedToMe, history } = debtService.getDebtsForUser(debts, currentUser.id);
  const potentialOffsets = debtService.findPotentialOffsets(debts, currentUser.id);

  const displayedList =
    activeTab === 'I_OWE' ? iOwe : activeTab === 'OWED_TO_ME' ? owedToMe : history;

  const handleQuickOffset = (myDebtId: string, counterDebtId: string) => {
    offsetDebts(myDebtId, counterDebtId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.debt.title}
        subtitle="Sổ theo dõi giao dịch công nợ ca làm bù và cơ chế cấn trừ 2 chiều tự động"
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Điều phối' },
          { label: t.debt.title },
        ]}
      />

      {/* Rules Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Nguyên tắc công nợ & Cấn trừ (Offset):</strong> Chỉ thao tác <em>Nhờ nhận ca (Cover)</em> mới tạo
            giao dịch nợ ca. <em>Đổi ca (Swap)</em> không tạo công nợ. Hai nhân sự có công nợ qua lại có thể <strong>cấn trừ 1:1 (Offset)</strong> để tất toán mà không cần làm bù. Nợ không có hạn chót và không bao giờ âm.
          </span>
        </div>
      </div>

      {/* Smart Mutual Offset Banner if reciprocal debts exist */}
      {potentialOffsets.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-indigo-900 to-blue-900 text-white shadow-sm space-y-3 border border-indigo-700">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/10 border border-white/20">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  Phát hiện công nợ đối ứng 2 chiều có thể Cấn trừ (Offset)
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Bạn và đồng nghiệp đang nợ qua lại nhau. Có thể tất toán 1:1 ngay mà không cần làm bù.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {potentialOffsets.map((pair, idx) => {
              const partner = employees.find((e) => e.id === pair.counterpartyId);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/10 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={partner?.avatar}
                      alt={partner?.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/30"
                    />
                    <div>
                      <div className="font-semibold text-white">
                        Đối ứng với {partner?.name} ({partner?.nickname || partner?.role})
                      </div>
                      <div className="text-[11px] text-blue-200 mt-0.5">
                        Bạn nợ: {pair.myDebt.relatedAction} ⇄ Họ nợ: {pair.counterDebt.relatedAction}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickOffset(pair.myDebt.id, pair.counterDebt.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-xs flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Cấn trừ 1:1 ngay
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div
          onClick={() => setActiveTab('HISTORY')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'HISTORY'
              ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-200 shadow-2xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Lịch sử tất toán & Cấn trừ
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
              {history.length} giao dịch
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {history.length} ca đã xong
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận các khoản nợ đã hoàn trả hoặc cấn trừ 1:1
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

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Lịch sử tất toán & Cấn trừ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {history.length}
          </span>
        </button>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="text-center p-12 text-xs text-slate-400">
            {activeTab === 'I_OWE'
              ? 'Bạn không nợ ca làm bù nào. Tuyệt vời!'
              : activeTab === 'OWED_TO_ME'
              ? 'Không có đồng nghiệp nào đang nợ ca làm bù của bạn.'
              : 'Chưa có lịch sử giao dịch tất toán công nợ.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-4 py-3">
                    {activeTab === 'I_OWE'
                      ? 'Chủ nợ (Người nhận thay)'
                      : activeTab === 'OWED_TO_ME'
                      ? 'Con nợ (Người nhờ nhận)'
                      : 'Đối tác liên quan'}
                  </th>
                  <th className="px-4 py-3 text-center">Số ca</th>
                  <th className="px-4 py-3">Giao dịch phát sinh</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map((d) => {
                  const partnerId = d.debtorId === currentUser.id ? d.creditorId : d.debtorId;
                  const partner = employees.find((e) => e.id === partnerId);

                  // Check if this debt has a matching counter debt for offset
                  const counterDebt = debts.find(
                    (other) =>
                      other.status === 'ACTIVE' &&
                      other.debtorId === partnerId &&
                      other.creditorId === currentUser.id
                  );

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 font-medium">#{d.id}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={partner?.avatar}
                            alt={partner?.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{partner?.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {partner?.nickname || partner?.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono">
                          {d.shiftsCount} ca
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{d.relatedAction}</div>
                        {d.note && <div className="text-[10px] text-slate-400 mt-0.5">{d.note}</div>}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                        <div>{d.createdAt}</div>
                        {d.settledAt && (
                          <div className="text-[10px] text-emerald-600">Xong: {d.settledAt}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {d.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Đang nợ
                          </span>
                        )}
                        {d.status === 'SETTLED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã hoàn trả
                          </span>
                        )}
                        {d.status === 'OFFSET' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
                            Đã cấn trừ 1:1
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5">
                        {d.status === 'ACTIVE' && (
                          <>
                            {/* If mutual debt exists, offer offset button */}
                            {counterDebt && d.debtorId === currentUser.id && (
                              <button
                                onClick={() => handleQuickOffset(d.id, counterDebt.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors inline-flex items-center gap-1"
                                title="Cấn trừ 1:1 với khoản nợ đối ứng"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                Cấn trừ
                              </button>
                            )}

                            <button
                              onClick={() => settleDebt(d.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1"
                              title="Xác nhận đã trả ca bù"
                            >
                              <Check className="w-3 h-3" />
                              Tất toán
                            </button>
                          </>
                        )}
                        {d.status !== 'ACTIVE' && (
                          <span className="text-[11px] text-slate-400 italic">Đã đóng</span>
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

export default DebtPage;
