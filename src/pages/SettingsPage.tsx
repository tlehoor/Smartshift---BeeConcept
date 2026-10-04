import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { RoleBadge } from '../components/common/RoleBadge';
import {
  User,
  Lock,
  Globe,
  Bell,
  Save,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t, currentUser, updateEmployee, language, setLanguage, showToast } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [email, setEmail] = useState(currentUser.email);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [scheduleChangeNotif, setScheduleChangeNotif] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmployee({
      ...currentUser,
      name,
      phone,
      nickname,
      email,
    });
    showToast('Đã lưu thông tin cá nhân thành công!', 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showToast('Mật khẩu mới không trùng khớp!', 'error');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Đổi mật khẩu thành công!', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.title}
        subtitle={t.settings.subtitle}
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Hệ thống' },
          { label: t.settings.title },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal info & Language */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Profile */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              {t.settings.personalInfo}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role={currentUser.role} size="sm" />
                    <span className="text-slate-500 font-medium">
                      Mục tiêu: {currentUser.targetShifts} ca/tuần
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Biệt danh (Nickname)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Password */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Lock className="w-4 h-4 text-blue-600" />
              {t.settings.accountSecurity}
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Display & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          {/* Display & Language */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Globe className="w-4 h-4 text-blue-600" />
              {t.settings.display}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t.settings.language}
              </label>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('vi');
                    showToast('Đã chọn ngôn ngữ Tiếng Việt', 'info');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    language === 'vi'
                      ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇻🇳</span>
                    <span>Tiếng Việt (Mặc định)</span>
                  </div>
                  {language === 'vi' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    showToast('Switched language to English', 'info');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    language === 'en'
                      ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇬🇧</span>
                    <span>English (International)</span>
                  </div>
                  {language === 'en' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Bell className="w-4 h-4 text-blue-600" />
              {t.settings.notifications}
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppNotif}
                  onChange={(e) => setInAppNotif(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-900">Thông báo trong ứng dụng</div>
                  <div className="text-slate-500 text-[11px]">
                    Nhận chuông thông báo khi có yêu cầu Cover/Swap mới
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-900">Thông báo qua Email</div>
                  <div className="text-slate-500 text-[11px]">
                    Gửi email tổng kết khi lịch tuần được công bố
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleChangeNotif}
                  onChange={(e) => setScheduleChangeNotif(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600"
                />
                <div>
                  <div className="font-semibold text-slate-900">Cảnh báo vi phạm ràng buộc</div>
                  <div className="text-slate-500 text-[11px]">
                    Thông báo cho Quản lý khi xuất hiện xung đột ca
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
