import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const { t } = useApp();

  if (!isOpen) return null;

  let icon = <HelpCircle className="w-6 h-6 text-blue-600" />;
  let btnClass = 'bg-blue-600 hover:bg-blue-700 text-white';

  if (variant === 'danger') {
    icon = <AlertCircle className="w-6 h-6 text-rose-600" />;
    btnClass = 'bg-rose-600 hover:bg-rose-700 text-white';
  } else if (variant === 'warning') {
    icon = <AlertTriangle className="w-6 h-6 text-amber-600" />;
    btnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-slate-100 flex-shrink-0">{icon}</div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelText || t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg shadow-xs transition-colors ${btnClass}`}
          >
            {confirmText || t.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};
