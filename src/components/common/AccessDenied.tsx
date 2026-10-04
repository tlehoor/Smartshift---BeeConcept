import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface AccessDeniedProps {
  requiredPermission?: string;
  customMessage?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredPermission,
  customMessage,
}) => {
  const navigate = useNavigate();
  const { currentUser, t } = useApp();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-2xs">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="text-xs font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 mb-2">
        Mã lỗi 403 — Không có quyền truy cập
      </span>

      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
        Quyền hạn không đủ để truy cập trang này
      </h1>

      <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
        {customMessage ||
          `Tài khoản của bạn đang đăng nhập với vai trò "${t.roles[currentUser.role]}", vai trò này không được phân quyền thực hiện tác vụ này.`}
      </p>

      {requiredPermission && (
        <div className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded border border-slate-200">
          Quyền yêu cầu: {requiredPermission}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Về trang Tổng quan</span>
        </button>
      </div>
    </div>
  );
};
