import React, { useState, useMemo } from 'react';
import { BookOpen, Check, Search, CheckSquare, Square } from 'lucide-react';

export interface UniqueCourseItem {
  code: string;
  name: string;
  sectionCount: number;
  hasLab: boolean;
}

interface SubjectSelectStepProps {
  uniqueCourses: UniqueCourseItem[];
  selectedCourseCodes: string[];
  onToggleCourse: (code: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const SubjectSelectStep: React.FC<SubjectSelectStepProps> = ({
  uniqueCourses,
  selectedCourseCodes,
  onToggleCourse,
  onSelectAll,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return uniqueCourses;
    return uniqueCourses.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [uniqueCourses, searchQuery]);

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-0.5">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Chọn môn học cần đăng ký</span>
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            Đã chọn <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedCourseCodes.length}</span> / {uniqueCourses.length} môn học trong kỳ
          </p>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Chọn tất cả</span>
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Bỏ chọn</span>
          </button>
        </div>
      </div>

      {/* Course Cards Grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4 max-h-[560px] overflow-y-auto pr-1">
        {filteredCourses.map((course) => {
          const isSelected = selectedCourseCodes.includes(course.code);

          return (
            <div
              key={course.code}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '84px' }}
              onClick={() => onToggleCourse(course.code)}
              className={`p-4 md:p-4.5 rounded-xl min-h-[82px] flex items-center justify-between cursor-pointer border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/15 ring-4 ring-indigo-500/20 -translate-y-0.5'
                  : 'bg-white dark:bg-slate-900/80 border-slate-300 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 hover:shadow-md hover:-translate-y-0.5 shadow-xs'
              }`}
            >
              <div className="space-y-1 pr-3 min-w-0">
                {/* Upper line: Course Code + Lab Badge */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {course.code}
                  </span>
                  {course.hasLab && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                      Có thực hành
                    </span>
                  )}
                </div>

                {/* Course Name */}
                <h4 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                  {course.name}
                </h4>
              </div>

              {/* Checkbox Icon Circle */}
              <div
                className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-105'
                    : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            {uniqueCourses.length === 0
              ? 'Chưa có môn học nào trong danh mục. Vui lòng tải lên tệp Thời khóa biểu ở Bước 1 để bắt đầu chọn môn.'
              : `Không tìm thấy môn học nào khớp với từ khóa "${searchQuery}".`}
          </div>
        )}
      </div>
    </div>
  );
};
