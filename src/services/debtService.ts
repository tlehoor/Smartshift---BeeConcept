import { DebtRecord } from '../types';
import { INITIAL_DEBTS } from '../mock/data';

export const debtService = {
  getDebts: async (): Promise<DebtRecord[]> => {
    return Promise.resolve([...INITIAL_DEBTS]);
  },

  getDebtsForUser: (allDebts: DebtRecord[], userId: string) => {
    const iOwe = allDebts.filter((d) => d.debtorId === userId && d.status === 'ACTIVE');
    const owedToMe = allDebts.filter((d) => d.creditorId === userId && d.status === 'ACTIVE');
    return { iOwe, owedToMe };
  },

  settleDebt: async (debtId: string, currentDebts: DebtRecord[]): Promise<DebtRecord[]> => {
    return currentDebts.map((d) =>
      d.id === debtId ? { ...d, status: 'SETTLED' as const } : d
    );
  },

  createDebtFromCover: (
    debtorId: string,
    creditorId: string,
    actionDetail: string
  ): DebtRecord => {
    return {
      id: `debt-${Date.now().toString().slice(-4)}`,
      debtorId,
      creditorId,
      shiftsCount: 1,
      relatedAction: actionDetail,
      createdAt: 'Hôm nay',
      status: 'ACTIVE',
      note: 'Công nợ ghi nhận tự động sau khi đối tác nhận ca thành công.',
    };
  },
};
