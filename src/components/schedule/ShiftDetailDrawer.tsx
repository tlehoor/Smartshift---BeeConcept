import React, { useState } from 'react';
import { DetailDrawer } from '../common/DetailDrawer';
import { RoleBadge } from '../common/RoleBadge';
import { ShiftAssignment, Employee, SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../../types';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  UserPlus,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';

interface ShiftDetailDrawerProps {
  shift: ShiftAssignment | null;
  onClose: () => void;
  onUpdateEmployees?: (shiftId: string, employeeIds: string[]) => void;
}

export const ShiftDetailDrawer: React.FC<ShiftDetailDrawerProps> = ({
  shift,
  onClose,
  onUpdateEmployees,
}) => {
  const { employees, currentUser, workload, updateShiftEmployees, showToast } = useApp();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmpToAdd, setSelectedEmpToAdd] = useState('');

  if (!shift) return null;

  const dayInfo = DAYS_OF_WEEK.find((d) => d.day === shift.dayOfWeek);
  const shiftDef = SHIFT_DEFINITIONS.find((s) => s.index === shift.shiftIndex);

  const assignedEmployees = shift.assignedEmployeeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  const availableToAdd = employees.filter(
    (e) => e.role !== 'ADMIN' && e.accountStatus === 'ACTIVE' && !shift.assignedEmployeeIds.includes(e.id)
  );

  const handleRemoveEmployee = (empId: string) => {
    if (shift.assignedEmployeeIds.length <= 1) {
      showToast('Một ca làm việc phải có ít nhất 1 nhân viên.', 'warning');
      return;
    }
    const updated = shift.assignedEmployeeIds.filter((id) => id !== empId);
    updateShiftEmployees(shift.id, updated);
  };

  const handleAddEmployee = () => {
    if (!selectedEmpToAdd) return;
    const updated = [...shift.assignedEmployeeIds, selectedEmpToAdd];
    updateShiftEmployees(shift.id, updated);
    setSelectedEmpToAdd('');
  };

  const isAssignedToMe = shift.assignedEmployeeIds.includes(currentUser.id);
  const canManage = currentUser.role === 'MANAGER';

  return (
    <DetailDrawer
      isOpen={Boolean(shift)}
      onClose={onClose}
      title={`${dayInfo?.name} (${dayInfo?.dateStr}) — ${shiftDef?.label}`}
      subtitle={shiftDef?.timeRange}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {assignedEmployees.length}/{shift.requiredCount} nhân sự
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Shift Badge and Overview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Loại ca làm</span>
            {shift.isSpecialShift ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Ca đặc biệt (3 nhân sự)
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                Ca thường (2 nhân sự)
              </span>
            )}
          </div>

          {shift.isSpecialShift && (
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
              💡 Ca này yêu cầu tiêu chuẩn <strong>2 Nhân viên chính thức + 1 Quản lý</strong>
              {shift.specialShiftFallback && (
                <span className="block mt-1 text-rose-700 font-medium">
                  ⚠️ Lưu ý: Đang áp dụng phương án dự phòng bổ sung Nhân viên thử việc.
                </span>
              )}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{dayInfo?.name} ({dayInfo?.dateStr})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-mono">{shiftDef?.timeRange}</span>
            </div>
          </div>
        </div>

        {/* Assigned Staff List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              Nhân viên được phân bổ ({assignedEmployees.length})
            </h3>
            {canManage && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {isEditing ? 'Hoàn tất' : 'Điều chỉnh'}
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {assignedEmployees.map((emp) => {
              const wl = workload.find((w) => w.employeeId === emp.id);

              return (
                <div
                  key={emp.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between hover:border-slate-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{emp.name}</span>
                        {emp.nickname && (
                          <span className="text-[11px] text-slate-400">({emp.nickname})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={emp.role} size="sm" />
                        <span className="text-[11px] text-slate-500">
                          {wl ? `${wl.actual}/${wl.target} ca` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isEditing && canManage && (
                    <button
                      onClick={() => handleRemoveEmployee(emp.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Gỡ khỏi ca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add staff directly (for managers during manual override) */}
          {isEditing && canManage && (
            <div className="mt-3 flex gap-2">
              <select
                value={selectedEmpToAdd}
                onChange={(e) => setSelectedEmpToAdd(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">-- Chọn nhân viên bổ sung --</option>
                {availableToAdd.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.nickname || e.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddEmployee}
                disabled={!selectedEmpToAdd}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm
              </button>
            </div>
          )}
        </div>

        {/* Quick Coordination Actions */}
        {currentUser.role !== 'ADMIN' && (
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Thao tác điều phối ca
            </div>

            {isAssignedToMe ? (
              <>
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/cover?shiftId=${shift.id}`);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Nhờ người khác nhận ca (Cover)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mời đồng nghiệp nhận ca này thay bạn (tạo công nợ)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-semibold">Tạo yêu cầu &rarr;</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/swap?shiftId=${shift.id}`);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800 transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Đổi ca làm việc (Swap)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Hoán đổi trực tiếp với ca của đồng nghiệp (không nợ ca)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-600 font-semibold">Đổi ca &rarr;</span>
                </button>
              </>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 leading-relaxed">
                ℹ️ Bạn không tham gia ca làm việc này nên không thể tạo yêu cầu Nhờ nhận ca hoặc Đổi ca. Thao tác điều phối chỉ áp dụng cho các ca bạn được phân bổ.
              </div>
            )}
          </div>
        )}
      </div>
    </DetailDrawer>
  );
};
