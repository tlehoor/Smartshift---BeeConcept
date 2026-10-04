import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../common/PageHeader';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { RoleBadge } from '../common/RoleBadge';
import { SHIFT_DEFINITIONS, DAYS_OF_WEEK } from '../../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  ArrowLeftRight,
  Receipt,
  Sparkles,
  ArrowRight,
  Send,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const StaffDashboard: React.FC = () => {
  const {
    currentUser,
    shifts,
    employees,
    workload,
    coverRequests,
    swapRequests,
    debts,
    t,
  } = useApp();

  const navigate = useNavigate();

  // Shifts assigned to this staff member
  const myShifts = shifts.filter((s) => s.assignedEmployeeIds.includes(currentUser.id));

  // Current workload for this staff
  const myWorkload = workload.find((w) => w.employeeId === currentUser.id);

  // Incoming cover requests where user is invited
  const incomingCoverRequests = coverRequests.filter(
    (c) => c.status === 'PENDING' && c.invitedCandidateIds.includes(currentUser.id)
  );

  // Incoming swap requests targeting this user
  const incomingSwapRequests = swapRequests.filter(
    (s) => s.status === 'PENDING' && s.targetEmployeeId === currentUser.id
  );

  // Debts
  const iOweCount = debts
    .filter((d) => d.debtorId === currentUser.id && d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.shiftsCount, 0);

  const owedToMeCount = debts
    .filter((d) => d.creditorId === currentUser.id && d.status === 'ACTIVE')
    .reduce((sum, d) => sum + d.shiftsCount, 0);

  // Sort my shifts by day and shiftIndex
  const sortedMyShifts = [...myShifts].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.shiftIndex - b.shiftIndex;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào, ${currentUser.name}`}
        subtitle={`Khu vực làm việc cá nhân của ${t.roles[currentUser.role]} • Tuần 41 (12/10 – 18/10)`}
        actions={
          <div className="flex items-center gap-2">
            <RoleBadge role={currentUser.role} size="md" />
            <Link
              to="/availability"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Đăng ký ca
            </Link>
          </div>
        }
      />

      {/* KPI Cards for Staff */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Ca làm việc tuần này"
          value={`${myWorkload?.actual || myShifts.length} / ${currentUser.targetShifts}`}
          subtext={`Mục tiêu: ${currentUser.targetShifts} ca`}
          badge={myWorkload?.status === 'OK' ? 'Đạt chỉ tiêu' : undefined}
          icon={<Calendar className="w-4 h-4 text-blue-600" />}
          onClick={() => navigate('/schedule')}
        />
        <KpiCard
          title="Khả năng làm việc (Availability)"
          value={`${currentUser.availabilityCount} ca`}
          subtext="Đã cam kết khả năng làm"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          onClick={() => navigate('/availability')}
        />
        <KpiCard
          title="Lời mời hỗ trợ nhận ca"
          value={incomingCoverRequests.length}
          subtext={
            incomingCoverRequests.length > 0
              ? 'Có đồng nghiệp nhờ nhận ca'
              : 'Không có lời mời mới'
          }
          badge={incomingCoverRequests.length > 0 ? 'Cần phản hồi' : undefined}
          icon={<UserPlus className="w-4 h-4 text-sky-600" />}
          highlight={incomingCoverRequests.length > 0}
          onClick={() => navigate('/cover')}
        />
        <KpiCard
          title="Công nợ ca làm bù"
          value={`${iOweCount} nợ / ${owedToMeCount} có`}
          subtext={iOweCount > 0 ? `Đang nợ đồng nghiệp ${iOweCount} ca` : 'Không có ca nợ'}
          icon={<Receipt className="w-4 h-4 text-indigo-600" />}
          onClick={() => navigate('/debt')}
        />
      </div>

      {/* Incoming Requests Banner if any */}
      {(incomingCoverRequests.length > 0 || incomingSwapRequests.length > 0) && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Bạn có yêu cầu điều phối ca đang chờ:</span>
              <span className="ml-1 text-slate-700">
                {incomingCoverRequests.length > 0 && `${incomingCoverRequests.length} lời mời nhờ nhận ca. `}
                {incomingSwapRequests.length > 0 && `${incomingSwapRequests.length} đề xuất đổi ca.`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {incomingCoverRequests.length > 0 && (
              <Link
                to="/cover"
                className="px-3 py-1 bg-amber-200 hover:bg-amber-300 font-semibold text-amber-900 rounded-md transition-colors"
              >
                Xem lời mời nhận ca &rarr;
              </Link>
            )}
            {incomingSwapRequests.length > 0 && (
              <Link
                to="/swap"
                className="px-3 py-1 bg-amber-200 hover:bg-amber-300 font-semibold text-amber-900 rounded-md transition-colors"
              >
                Xem đề xuất đổi ca &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* My Weekly Shifts Agenda */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Lịch làm việc của bạn trong tuần (12/10 – 18/10)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng cộng {myShifts.length} ca trực được phân bổ chính thức
            </p>
          </div>
          <Link
            to="/schedule"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            <span>Xem lưới toàn đội ngũ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {sortedMyShifts.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-400">
            Bạn chưa có ca làm việc nào được xếp trong tuần này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedMyShifts.map((shift, idx) => {
              const day = DAYS_OF_WEEK.find((d) => d.day === shift.dayOfWeek);
              const def = SHIFT_DEFINITIONS.find((s) => s.index === shift.shiftIndex);
              const teammates = shift.assignedEmployeeIds
                .filter((id) => id !== currentUser.id)
                .map((id) => employees.find((e) => e.id === id))
                .filter(Boolean);

              return (
                <div
                  key={shift.id}
                  className={`p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    shift.isSpecialShift
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-slate-900 text-sm">
                        {day?.name} ({day?.dateStr})
                      </div>
                      {shift.isSpecialShift && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                          Ca đặc biệt
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {def?.label}: {def?.timeRange}
                      </span>
                    </div>

                    {teammates.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 mb-3">
                        <span className="text-[11px] text-slate-400 block mb-1">
                          Đồng nghiệp cùng ca:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {teammates.map((mate) => (
                            <span
                              key={mate?.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {mate?.nickname || mate?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions on my shift */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/cover?shiftId=${shift.id}`)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Nhờ nhận ca
                    </button>
                    <button
                      onClick={() => navigate(`/swap?shiftId=${shift.id}`)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      Đổi ca
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
