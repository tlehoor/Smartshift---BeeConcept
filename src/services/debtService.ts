import { DebtRecord } from '../types';
import { INITIAL_DEBTS } from '../mock/data';

export interface PotentialOffsetPair {
  myDebt: DebtRecord; // khoản tôi đang nợ họ
  counterDebt: DebtRecord; // khoản họ đang nợ tôi
  counterpartyId: string;
}

export const debtService = {
  getDebts: async (): Promise<DebtRecord[]> => {
    return Promise.resolve([...INITIAL_DEBTS]);
  },

  getDebtsForUser: (allDebts: DebtRecord[], userId: string) => {
    const iOwe = allDebts.filter((d) => d.debtorId === userId && d.status === 'ACTIVE');
    const owedToMe = allDebts.filter((d) => d.creditorId === userId && d.status === 'ACTIVE');
    const history = allDebts.filter(
      (d) => (d.debtorId === userId || d.creditorId === userId) && (d.status === 'SETTLED' || d.status === 'OFFSET')
    );
    return { iOwe, owedToMe, history };
  },

  // Tìm các cặp công nợ đối ứng có thể cấn trừ 1:1
  findPotentialOffsets: (allDebts: DebtRecord[], userId: string): PotentialOffsetPair[] => {
    const iOwe = allDebts.filter((d) => d.debtorId === userId && d.status === 'ACTIVE');
    const owedToMe = allDebts.filter((d) => d.creditorId === userId && d.status === 'ACTIVE');

    const pairs: PotentialOffsetPair[] = [];
    const matchedCounterDebtIds = new Set<string>();

    for (const myD of iOwe) {
      // Tìm khoản đối ứng người đó nợ tôi
      const counter = owedToMe.find(
        (theirD) => theirD.debtorId === myD.creditorId && !matchedCounterDebtIds.has(theirD.id)
      );
      if (counter) {
        matchedCounterDebtIds.add(counter.id);
        pairs.push({
          myDebt: myD,
          counterDebt: counter,
          counterpartyId: myD.creditorId,
        });
      }
    }

    return pairs;
  },

  // Thực hiện cấn trừ 2 chiều (Offset transaction)
  offsetDebts: (
    debtIdA: string,
    debtIdB: string,
    currentDebts: DebtRecord[]
  ): { success: boolean; error?: string; updatedDebts: DebtRecord[] } => {
    const debtA = currentDebts.find((d) => d.id === debtIdA);
    const debtB = currentDebts.find((d) => d.id === debtIdB);

    if (!debtA || !debtB) {
      return { success: false, error: 'Không tìm thấy thông tin một trong hai khoản công nợ.', updatedDebts: currentDebts };
    }

    if (debtA.status !== 'ACTIVE' || debtB.status !== 'ACTIVE') {
      return { success: false, error: 'Chỉ các khoản nợ đang có hiệu lực (ACTIVE) mới được cấn trừ.', updatedDebts: currentDebts };
    }

    // Kiểm tra tính đối ứng 2 chiều
    const isMutual =
      (debtA.debtorId === debtB.creditorId && debtA.creditorId === debtB.debtorId);

    if (!isMutual) {
      return { success: false, error: 'Hai khoản nợ này không phải đối ứng qua lại giữa cùng hai nhân sự.', updatedDebts: currentDebts };
    }

    const timestamp = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const updatedDebts = currentDebts.map((d) => {
      if (d.id === debtIdA) {
        return {
          ...d,
          status: 'OFFSET' as const,
          settledAt: timestamp,
          offsetWithDebtId: debtIdB,
          note: `Đã cấn trừ 1:1 với khoản nợ #${debtIdB} (${d.note || 'Bù trừ ca làm'})`,
        };
      }
      if (d.id === debtIdB) {
        return {
          ...d,
          status: 'OFFSET' as const,
          settledAt: timestamp,
          offsetWithDebtId: debtIdA,
          note: `Đã cấn trừ 1:1 với khoản nợ #${debtIdA} (${d.note || 'Bù trừ ca làm'})`,
        };
      }
      return d;
    });

    return { success: true, updatedDebts };
  },

  settleDebt: (debtId: string, currentDebts: DebtRecord[]): DebtRecord[] => {
    const timestamp = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return currentDebts.map((d) =>
      d.id === debtId
        ? {
            ...d,
            status: 'SETTLED' as const,
            settledAt: timestamp,
            note: `${d.note || ''} (Đã xác nhận hoàn trả ca làm)`.trim(),
          }
        : d
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
      createdAt: new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'ACTIVE',
      note: 'Công nợ ghi nhận tự động sau khi đồng nghiệp nhận ca thành công.',
    };
  },
};
