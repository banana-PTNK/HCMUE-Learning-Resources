import React from 'react';
import { Sliders, Zap } from 'lucide-react';
import { ScheduleConstraints } from '../types';

interface ConstraintSettingsStepProps {
  constraints: ScheduleConstraints;
  onChangeConstraints: (updated: ScheduleConstraints) => void;
  onSubmit: () => void;
  selectedCourseCount: number;
}

export const ConstraintSettingsStep: React.FC<ConstraintSettingsStepProps> = ({
  constraints,
  onChangeConstraints,
  onSubmit,
  selectedCourseCount,
}) => {
  const toggleConstraint = (key: keyof ScheduleConstraints) => {
    onChangeConstraints({
      ...constraints,
      [key]: !constraints[key],
    });
  };

  const setPreferredPeriod = (period: 'all' | 'morning' | 'afternoon') => {
    onChangeConstraints({
      ...constraints,
      preferredPeriod: period,
    });
  };

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header Bar */}
      <div className="pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <span>Thiết lập ràng buộc lịch học</span>
        </h3>
      </div>

      {/* Constraints Single-line Rows */}
      <div className="space-y-3">
        {/* 1. Avoid Saturday */}
        <div
          onClick={() => toggleConstraint('avoidSaturday')}
          className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
            constraints.avoidSaturday
              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:shadow-xs'
          }`}
        >
          <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>🚫</span>
            <span>Không học Thứ 7</span>
          </span>

          <input
            type="checkbox"
            checked={constraints.avoidSaturday}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('avoidSaturday');
            }}
            className="w-5 h-5 rounded-md text-indigo-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 2. Avoid Early Morning 7am */}
        <div
          onClick={() => toggleConstraint('avoidEarlyMorning')}
          className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
            constraints.avoidEarlyMorning
              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:shadow-xs'
          }`}
        >
          <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>⏰</span>
            <span>Tránh học Tiết 1 (07:00 AM)</span>
          </span>

          <input
            type="checkbox"
            checked={constraints.avoidEarlyMorning}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('avoidEarlyMorning');
            }}
            className="w-5 h-5 rounded-md text-indigo-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 3. Free Friday Afternoon */}
        <div
          onClick={() => toggleConstraint('freeFridayAfternoon')}
          className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
            constraints.freeFridayAfternoon
              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:shadow-xs'
          }`}
        >
          <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>🏖️</span>
            <span>Trống chiều Thứ 6</span>
          </span>

          <input
            type="checkbox"
            checked={constraints.freeFridayAfternoon}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('freeFridayAfternoon');
            }}
            className="w-5 h-5 rounded-md text-indigo-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 4. Compact Days */}
        <div
          onClick={() => toggleConstraint('compactDays')}
          className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
            constraints.compactDays
              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
              : 'bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:shadow-xs'
          }`}
        >
          <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>⚡</span>
            <span>Gom lịch học gọn ngày</span>
          </span>

          <input
            type="checkbox"
            checked={constraints.compactDays}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('compactDays');
            }}
            className="w-5 h-5 rounded-md text-indigo-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {/* Ca Học Selection Grid */}
      <div className="p-4 md:p-4.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-300 dark:border-slate-700/80 space-y-2.5">
        <span className="text-sm font-bold text-slate-900 dark:text-white block">
          🕒 Khung ca học mong muốn:
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { key: 'all', label: 'Cả ngày' },
            { key: 'morning', label: 'Ca Sáng' },
            { key: 'afternoon', label: 'Ca Chiều' },
          ].map((item) => {
            const isActive = constraints.preferredPeriod === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPreferredPeriod(item.key as any)}
                className={`py-2.5 px-3 text-sm md:text-base font-bold rounded-xl text-center border-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button: XẾP LỊCH TỰ ĐỘNG */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={selectedCourseCount === 0}
        className="text-base md:text-lg font-bold py-3.5 md:py-4 rounded-xl w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:opacity-95 text-white shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
        <span>⚡ XẾP LỊCH TỰ ĐỘNG</span>
      </button>
    </div>
  );
};
