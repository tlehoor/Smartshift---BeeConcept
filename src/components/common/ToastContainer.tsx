import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
        let borderClass = 'border-emerald-200 bg-white shadow-lg';

        if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
          borderClass = 'border-amber-200 bg-white shadow-lg';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />;
          borderClass = 'border-rose-200 bg-white shadow-lg';
        } else if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
          borderClass = 'border-blue-200 bg-white shadow-lg';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border text-sm text-slate-800 transition-all transform duration-200 ${borderClass}`}
          >
            {icon}
            <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
