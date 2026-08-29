import React from 'react';
import { Check } from 'lucide-react';
import { TimetableSolution } from '../types';
import { isVLESection } from '../utils/schedulerCsp';

interface ScheduleOptionsProps {
  solutions: TimetableSolution[];
  selectedSolutionIndex: number;
  onSelectSolution: (index: number) => void;
}

const WEEK_DAYS = [
  { num: 2, label: 'T2' },
  { num: 3, label: 'T3' },
  { num: 4, label: 'T4' },
  { num: 5, label: 'T5' },
  { num: 6, label: 'T6' },
  { num: 7, label: 'T7' },
  { num: 8, label: 'CN' },
];

/**
 * Calculates a unique dynamic characteristic highlight for each schedule option
 * ensuring distinct and recognizable descriptions across options based on actual metrics.
 */
export function getSolutionHighlight(sol: TimetableSolution, index: number, allSolutions?: TimetableSolution[]): string {
  const sections = sol.sections || [];
  if (sections.length === 0) return '✨ Lịch học tiêu chuẩn • Đầy đủ môn';

  const nonVle = sections.filter((s) => !isVLESection(s));
  const activeDays = Array.from(new Set(nonVle.map((s) => s.dayOfWeek))).sort((a, b) => a - b);
  const morningCount = nonVle.filter((s) => s.startPeriod <= 6).length;
  const afternoonCount = nonVle.filter((s) => s.startPeriod >= 7).length;
  const early7amCount = nonVle.filter((s) => s.startPeriod === 1).length;
  const hasSaturday = activeDays.includes(7);
  const hasSunday = activeDays.includes(8);
  const hasWednesday = activeDays.includes(4);
  const hasThursday = activeDays.includes(5);
  const hasFridayAfternoon = nonVle.some((s) => s.dayOfWeek === 6 && s.startPeriod >= 7);

  // Distinct descriptive strategies
  if (index === 0) {
    if (morningCount > 0 && afternoonCount > 0) return '✨ Tối ưu nhất • Phân bổ Cả ngày (Sáng & Chiều)';
    if (afternoonCount === 0) return '✨ Tối ưu cao nhất • 100% học ca Sáng';
    if (morningCount === 0) return '✨ Tối ưu cao nhất • 100% học ca Chiều';
    if (activeDays.length <= 4) return `✨ Tối ưu cao nhất • Gom gọn ${activeDays.length} ngày/tuần`;
    return '✨ Điểm tối ưu cao nhất • Phân bổ lịch hài hòa';
  }

  // Full day mixed
  if (morningCount > 0 && afternoonCount > 0) {
    if (activeDays.length <= 3) {
      return `✨ Gom lịch Cả ngày (${activeDays.length} ngày) • Nhiều ngày nghỉ trọn vẹn`;
    }
    return '✨ Lịch Cả ngày linh hoạt • Đan xen Sáng & Chiều';
  }

  // Pure Morning
  if (afternoonCount === 0 && morningCount > 0) {
    return '✨ Học gọn ca Sáng • Nghỉ trọn vẹn tất cả buổi chiều';
  }

  // Pure Afternoon
  if (morningCount === 0 && afternoonCount > 0) {
    return '✨ Học tập trung ca Chiều • Toàn bộ sáng tự do';
  }

  // Highly compact days (2-3 days)
  if (activeDays.length <= 3) {
    const dayNames = activeDays.map((d) => (d === 8 ? 'CN' : `T${d}`)).join(', ');
    return `✨ Siêu gọn ${activeDays.length} ngày (${dayNames}) • Nghỉ ${7 - activeDays.length} ngày/tuần`;
  }

  // Free midweek days
  if (!hasWednesday && activeDays.length <= 5) {
    return '✨ Trống trọn ngày Thứ 4 • Nghỉ ngơi & ôn bài giữa tuần';
  }
  if (!hasThursday && activeDays.length <= 5) {
    return '✨ Trống trọn ngày Thứ 5 • Giảm áp lực giữa tuần';
  }

  // Free Friday afternoon & weekend
  if (!hasSaturday && !hasSunday && !hasFridayAfternoon) {
    return '✨ Nghỉ từ chiều Thứ 6 • Cuối tuần trọn vẹn không vướng bận';
  }

  // 4 compact days
  if (activeDays.length === 4) {
    const freeCount = 7 - activeDays.length;
    return `✨ Gom lịch 4 ngày/tuần • Dành riêng ${freeCount} ngày nghỉ ngơi`;
  }

  // No early 7:00 AM class
  if (early7amCount === 0 && morningCount > 0) {
    return '✨ Không học tiết 1 (7:00) • Giờ vào lớp thoải mái đầu ngày';
  }

  // Mostly morning or afternoon
  if (morningCount > afternoonCount) {
    return '✨ Ưu tiên ca Sáng • Chiều thảnh thơi tự học';
  }
  if (afternoonCount > morningCount) {
    return '✨ Ưu tiên ca Chiều • Sáng tự do nghỉ ngơi';
  }

  const pool = [
    '✨ Phân bổ đều các ngày • Giảm tải áp lực học tập',
    '✨ Khoảng cách giữa các tiết liền mạch • Tiết kiệm thời gian',
    '✨ Cân bằng sáng chiều • Thuận tiện đi lại và sinh hoạt',
    '✨ Lịch trình ổn định • Tối ưu số buổi di chuyển'
  ];

  return pool[index % pool.length];
}

export const ScheduleOptions: React.FC<ScheduleOptionsProps> = ({
  solutions,
  selectedSolutionIndex,
  onSelectSolution,
}) => {
  if (solutions.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid gap-4 ${
        solutions.length === 1
          ? 'grid-cols-1 max-w-md mx-auto'
          : solutions.length === 2
          ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
          : solutions.length === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : solutions.length === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'
      }`}
    >
      {solutions.map((sol, index) => {
        const isSelected = selectedSolutionIndex === index;
        const nonVleSections = sol.sections.filter((s) => !isVLESection(s));
        const activeDaysList = Array.from(new Set(nonVleSections.map((s) => s.dayOfWeek))).sort();
        const activeDaysSet = new Set(activeDaysList);
        const uniqueCoursesCount = new Set(
          sol.sections.map((s) => s.courseCode)
        ).size;
        const highlightText = getSolutionHighlight(sol, index, solutions);

        return (
          <div
            key={sol.id || `solution-${index}`}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '220px' }}
            onClick={() => onSelectSolution(index)}
            className={`group relative p-5 rounded-2xl cursor-pointer flex flex-col justify-between space-y-4 transition-all duration-200 hover:scale-[1.01] ${
              isSelected
                ? 'bg-blue-50/60 border-2 border-blue-600 shadow-md shadow-blue-100 dark:bg-blue-950/20 dark:border-blue-500 dark:shadow-lg dark:shadow-blue-500/10 -translate-y-0.5'
                : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="space-y-3">
              {/* Row 1: Header - Solution Title & Top-Right Selection Indicator */}
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {sol.title || `Phương án ${index + 1}`}
                </h4>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-transparent shrink-0 group-hover:border-slate-400 dark:group-hover:border-slate-600 transition-colors" />
                )}
              </div>

              {/* Row 2: Distinctive Characteristic Highlight */}
              <div className="text-xs md:text-sm font-bold text-amber-700 dark:text-amber-300 dark:font-semibold flex items-center gap-1.5 leading-snug line-clamp-1">
                <span>{highlightText}</span>
              </div>

              {/* Row 3: Single Week Day Badges (T2 - CN) */}
              <div className="pt-1">
                <div className="grid grid-cols-7 gap-1 font-mono text-xs font-bold">
                  {WEEK_DAYS.map((wd) => {
                    const isActive = activeDaysSet.has(wd.num);
                    return (
                      <div
                        key={wd.num}
                        className={`py-1.5 rounded-md text-center transition-all ${
                          isActive
                            ? isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-xs'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-600'
                        }`}
                      >
                        {wd.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4 & CTA: Footer Stats & Full-width Button */}
            <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800/90 space-y-3">
              {/* Row 4: Clean stats */}
              <div className="text-xs md:text-sm font-mono font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>{uniqueCoursesCount} môn học</span>
                <span>•</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {nonVleSections.length} buổi học
                </span>
              </div>

              {/* Full-width Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSolution(index);
                }}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                {isSelected ? '✓ Đang áp dụng' : 'Áp dụng phương án này'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
