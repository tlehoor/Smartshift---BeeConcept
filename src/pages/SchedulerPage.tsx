import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { schedulerService } from '../services/schedulerService';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers,
  FileCheck,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const SchedulerPage: React.FC = () => {
  const { t, employees, explanations, runSchedulerSim, scheduleStatus } = useApp();
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const readiness = schedulerService.checkReadiness(employees, explanations);

  const stepsList = [
    t.scheduler.steps.step1,
    t.scheduler.steps.step2,
    t.scheduler.steps.step3,
    t.scheduler.steps.step4,
    t.scheduler.steps.step5,
    t.scheduler.steps.step6,
  ];

  const handleStartScheduler = () => {
    setIsRunning(true);
    setCurrentStep(0);

    // Simulate progressive steps
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < stepsList.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(async () => {
            await runSchedulerSim();
            setIsRunning(false);
            navigate('/scheduler/draft');
          }, 600);
          return prev;
        }
      });
    }, 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.scheduler.title}
        subtitle={t.scheduler.subtitle}
        breadcrumbs={[{ label: 'SmartShift' }, { label: t.scheduler.title }]}
        actions={
          scheduleStatus === 'DRAFT' && (
            <Link
              to="/scheduler/draft"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg shadow-2xs"
            >
              <FileCheck className="w-4 h-4" />
              Xem bản nháp V3 hiện tại
            </Link>
          )
        }
      />

      {/* Main Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              Điều kiện thực thi thuật toán phân ca
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Thuật toán kiểm tra 10 ràng buộc cứng và mục tiêu số ca của từng vị trí trước khi tạo bản nháp.
            </p>
          </div>

          <div>
            {readiness.canRun ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {t.scheduler.canRun}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Chưa đủ điều kiện
              </span>
            )}
          </div>
        </div>

        {/* Roles Readiness Matrix */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            {t.scheduler.registrationTitle}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Official */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800">Nhân viên chính thức</span>
                <span className="font-bold text-indigo-700">
                  {readiness.stats.official.count}/{readiness.stats.official.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{
                    width: `${(readiness.stats.official.count / readiness.stats.official.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Mục tiêu: 6 ca/tuần</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Probation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800">Nhân viên thử việc</span>
                <span className="font-bold text-amber-700">
                  {readiness.stats.probation.count}/{readiness.stats.probation.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${(readiness.stats.probation.count / readiness.stats.probation.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Mục tiêu: 4 ca/tuần</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Workshop */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800">Nhân viên Workshop</span>
                <span className="font-bold text-teal-700">
                  {readiness.stats.workshop.count}/{readiness.stats.workshop.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{
                    width: `${(readiness.stats.workshop.count / readiness.stats.workshop.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Mục tiêu: 4 ca (max 2/ngày)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Manager */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-800">Quản lý</span>
                <span className="font-bold text-blue-700">
                  {readiness.stats.manager.count}/{readiness.stats.manager.total}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${(readiness.stats.manager.count / readiness.stats.manager.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Mục tiêu: 4 ca / Ca đặc biệt</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Warning if cannot run */}
        {!readiness.canRun && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold">{t.scheduler.cannotRun}</div>
              <div className="mt-1 text-amber-800">
                {readiness.reason} Nhân viên có giải trình cần được Quản trị viên/Quản lý phê duyệt trước khi hệ thống xếp lịch.
              </div>
              <div className="mt-2">
                <Link
                  to="/approvals"
                  className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                >
                  Đến trang Phê duyệt giải trình ngay &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs text-slate-500">
            Hệ thống sẽ tạo ra một <strong>Bản nháp mới (V3)</strong> mà không ghi đè các phiên bản cũ.
          </div>

          <button
            onClick={handleStartScheduler}
            disabled={!readiness.canRun || isRunning}
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.scheduler.runButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scheduler Simulation Modal */}
      {isRunning && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <Cpu className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{t.scheduler.runningTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đang áp dụng 10 quy tắc ràng buộc cứng và giải thuật tối ưu lịch làm việc
              </p>
            </div>

            {/* Steps Progress List */}
            <div className="space-y-3 mb-6">
              {stepsList.map((stepText, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-900 font-medium'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                        : 'text-slate-400'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / stepsList.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
