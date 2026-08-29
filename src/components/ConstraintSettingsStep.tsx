import React from 'react';
import { Sliders, Zap, Sun, Moon, Sparkles, Coffee } from 'lucide-react';
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

  const setPreferredShift = (shift: 'all' | 'morning' | 'afternoon') => {
    onChangeConstraints({
      ...constraints,
      preferredShift: shift,
      preferredPeriod: shift,
    });
  };

  const currentShift = constraints.preferredShift || constraints.preferredPeriod || 'all';

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header Bar */}
      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Tùy chọn & Ràng buộc xếp lịch</span>
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {selectedCourseCount} môn đã chọn
        </span>
      </div>

      {/* 3-way Segmented Button: Study Shift Preference */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
          Khung ca học ưu tiên
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* Option 1: All Day / Flexible */}
          <button
            type="button"
            onClick={() => setPreferredShift('all')}
            className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              currentShift === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-medium'
            }`}
          >
            <div className="flex items-center gap-1 text-xs">
              <Sparkles className={`w-3.5 h-3.5 ${currentShift === 'all' ? 'text-amber-300 fill-amber-300' : 'text-indigo-500'}`} />
              <span>Cả ngày</span>
            </div>
            <span className={`text-[10px] ${currentShift === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Sáng + Chiều
            </span>
          </button>

          {/* Option 2: Morning Only */}
          <button
            type="button"
            onClick={() => setPreferredShift('morning')}
            className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              currentShift === 'morning'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-medium'
            }`}
          >
            <div className="flex items-center gap-1 text-xs">
              <Sun className={`w-3.5 h-3.5 ${currentShift === 'morning' ? 'text-amber-300 fill-amber-300' : 'text-amber-500'}`} />
              <span>Chỉ ca Sáng</span>
            </div>
            <span className={`text-[10px] ${currentShift === 'morning' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Tiết 1 - 6
            </span>
          </button>

          {/* Option 3: Afternoon Only */}
          <button
            type="button"
            onClick={() => setPreferredShift('afternoon')}
            className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
              currentShift === 'afternoon'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-medium'
            }`}
          >
            <div className="flex items-center gap-1 text-xs">
              <Moon className={`w-3.5 h-3.5 ${currentShift === 'afternoon' ? 'text-amber-300 fill-amber-300' : 'text-blue-500'}`} />
              <span>Chỉ ca Chiều</span>
            </div>
            <span className={`text-[10px] ${currentShift === 'afternoon' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Tiết 7 - 12
            </span>
          </button>
        </div>
      </div>

      {/* Constraints Single-line Rows */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
          Ràng buộc bổ sung
        </label>

        {/* 1. Avoid Saturday */}
        <div
          onClick={() => toggleConstraint('avoidSaturday')}
          className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-sm ${
            constraints.avoidSaturday
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
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
            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 2. Soft Preference: Avoid Split Days */}
        <div
          onClick={() => toggleConstraint('avoidSplitDays')}
          className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-sm ${
            constraints.avoidSplitDays
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Hạn chế học cả sáng & chiều trong ngày</span>
          </span>
          <input
            type="checkbox"
            checked={!!constraints.avoidSplitDays}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('avoidSplitDays');
            }}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 3. Avoid Early Morning 7am */}
        <div
          onClick={() => toggleConstraint('avoidEarlyMorning')}
          className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-sm ${
            constraints.avoidEarlyMorning
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>⏰</span>
            <span>Tránh tiết 1 (07:00 sáng)</span>
          </span>
          <input
            type="checkbox"
            checked={constraints.avoidEarlyMorning}
            onChange={(e) => {
              e.stopPropagation();
              toggleConstraint('avoidEarlyMorning');
            }}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 4. Free Friday Afternoon */}
        <div
          onClick={() => toggleConstraint('freeFridayAfternoon')}
          className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-sm ${
            constraints.freeFridayAfternoon
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
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
            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
          />
        </div>

        {/* 5. Compact Days */}
        <div
          onClick={() => toggleConstraint('compactDays')}
          className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-sm ${
            constraints.compactDays
              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2">
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
            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {/* Primary Action Button: XẾP LỊCH TỰ ĐỘNG */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={selectedCourseCount === 0}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
        <span>XẾP LỊCH TỰ ĐỘNG</span>
      </button>
    </div>
  );
};
