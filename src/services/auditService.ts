import { AuditLogItem, AuditCategory } from '../types';
import { INITIAL_AUDIT_LOGS } from '../mock/data';

export const auditService = {
  getLogs: async (): Promise<AuditLogItem[]> => {
    return Promise.resolve([...INITIAL_AUDIT_LOGS]);
  },

  createLog: (
    actorName: string,
    action: string,
    category: AuditCategory,
    targetObject: string,
    detail: string,
    result: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
  ): AuditLogItem => {
    return {
      id: `aud-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      actorId: 'usr-current',
      actorName,
      action,
      category,
      targetObject,
      detail,
      result,
    };
  },
};
