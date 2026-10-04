import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Shield, Lock, Phone, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { Role } from '../types';

export const LoginPage: React.FC = () => {
  const { t, switchRole, setIsAuthenticated, showToast } = useApp();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('0912 345 678');
  const [password, setPassword] = useState('••••••••');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirstLogin) {
      setShowPasswordChangeModal(true);
      return;
    }
    setIsAuthenticated(true);
    showToast('Đăng nhập thành công vào hệ thống SmartShift', 'success');
    navigate('/dashboard');
  };

  const handleFirstLoginPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      showToast('Mật khẩu xác nhận không trùng khớp!', 'error');
      return;
    }
    setShowPasswordChangeModal(false);
    setIsAuthenticated(true);
    showToast('Đổi mật khẩu lần đầu thành công! Chào mừng bạn.', 'success');
    navigate('/dashboard');
  };

  const handleQuickDemoLogin = (role: Role) => {
    switchRole(role);
    setIsAuthenticated(true);
    showToast(`Đăng nhập chế độ Demo với quyền: ${t.roles[role]}`, 'info');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand */}
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg font-bold text-2xl">
            S
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">SmartShift</h1>
            <p className="text-xs text-blue-400 font-medium">Enterprise Workforce Management</p>
          </div>
        </div>

        <h2 className="mt-4 text-center text-sm text-slate-300 font-normal px-4">
          Nền tảng Tự động hóa Phân ca và Điều phối Lịch trình Thông minh
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-800">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); showToast('Vui lòng liên hệ Admin để khôi phục mật khẩu.', 'info'); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            {/* First login toggle simulator */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Mô phỏng lần đăng nhập đầu tiên</span>
              <input
                type="checkbox"
                checked={isFirstLogin}
                onChange={(e) => setIsFirstLogin(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
            >
              <span>Đăng nhập hệ thống</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Logins */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Đăng nhập nhanh theo vai trò Demo
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('MANAGER')}
                className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium text-center"
              >
                👔 Quản lý (Nguyễn Minh Anh)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ADMIN')}
                className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors font-medium text-center"
              >
                🛡️ Quản trị viên (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('OFFICIAL_STAFF')}
                className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors font-medium text-center"
              >
                💼 Nhân viên chính thức (Ánh)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('PROBATION_STAFF')}
                className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors font-medium text-center"
              >
                🌱 Thử việc (Minh)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('WORKSHOP')}
                className="col-span-2 p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors font-medium text-center"
              >
                🔧 Nhân viên Workshop (Thái Linh)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* First Login Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đây là lần đăng nhập đầu tiên</h3>
                <p className="text-xs text-slate-500">Vui lòng tạo mật khẩu mới an toàn để tiếp tục.</p>
              </div>
            </div>

            <form onSubmit={handleFirstLoginPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Cập nhật & Đăng nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
