import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { RoleBadge } from '../components/common/RoleBadge';
import { Employee, Role } from '../types';
import {
  Users,
  Search,
  Filter,
  Edit,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { t, employees, updateEmployee, toggleLockAccount } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Filtered employees
  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm) ||
      (emp.nickname && emp.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    updateEmployee(editingEmp);
    setEditingEmp(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.employees.title}
        subtitle={t.employees.subtitle}
        breadcrumbs={[
          { label: 'SmartShift' },
          { label: 'Quản trị' },
          { label: t.employees.title },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, biệt danh, hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả ({employees.length})</option>
            <option value="ADMIN">{t.roles.ADMIN}</option>
            <option value="MANAGER">{t.roles.MANAGER}</option>
            <option value="OFFICIAL_STAFF">{t.roles.OFFICIAL_STAFF}</option>
            <option value="PROBATION_STAFF">{t.roles.PROBATION_STAFF}</option>
            <option value="WORKSHOP">{t.roles.WORKSHOP}</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">{t.employees.name}</th>
                <th className="px-4 py-3">{t.employees.phone}</th>
                <th className="px-4 py-3">{t.employees.role}</th>
                <th className="px-4 py-3 text-center">{t.employees.target}</th>
                <th className="px-4 py-3">{t.employees.regStatus}</th>
                <th className="px-4 py-3">{t.employees.accountStatus}</th>
                <th className="px-4 py-3 text-right">{t.common.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Name & Avatar */}
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{emp.name}</div>
                        {emp.nickname && (
                          <div className="text-[10px] text-slate-400">({emp.nickname})</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-slate-600 font-mono">{emp.phone}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <RoleBadge role={emp.role} size="sm" />
                  </td>

                  {/* Target Shifts */}
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    {emp.targetShifts > 0 ? `${emp.targetShifts} ca/tuần` : '—'}
                  </td>

                  {/* Registration Status */}
                  <td className="px-4 py-3">
                    {emp.registrationCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã đăng ký ({emp.availabilityCount} ca)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Chưa hoàn tất
                      </span>
                    )}
                  </td>

                  {/* Account Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={emp.accountStatus} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right space-x-1.5">
                    <button
                      onClick={() => setEditingEmp(emp)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {emp.role !== 'ADMIN' && (
                      <button
                        onClick={() => toggleLockAccount(emp.id)}
                        className={`p-1.5 rounded transition-colors ${
                          emp.accountStatus === 'ACTIVE'
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={
                          emp.accountStatus === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
                        }
                      >
                        {emp.accountStatus === 'ACTIVE' ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Chỉnh sửa thông tin nhân viên
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biệt danh (Nickname)</label>
                <input
                  type="text"
                  value={editingEmp.nickname || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, nickname: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  required
                  value={editingEmp.phone}
                  onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu số ca tuần</label>
                <input
                  type="number"
                  min={0}
                  max={28}
                  value={editingEmp.targetShifts}
                  onChange={(e) =>
                    setEditingEmp({ ...editingEmp, targetShifts: parseInt(e.target.value) || 0 })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
