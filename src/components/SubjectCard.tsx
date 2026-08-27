import React from 'react';
import { ArrowRight, FileCheck, Presentation, Calendar } from 'lucide-react';
import { Subject } from '../types';
import { HighlightText } from './HighlightText';

interface SubjectCardProps {
  subject: Subject;
  examFormat: 'Thi tập trung' | 'Báo cáo';
  onNavigate?: (path: string) => void;
  isFocused?: boolean;
  searchQuery?: string;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  examFormat,
  onNavigate,
  isFocused = false,
  searchQuery = '',
}) => {
  const handleClick = () => {
    if (typeof onNavigate === 'function') {
      onNavigate(`/subject/${subject.code}`);
    }
  };

  return (
    <div
      id={`subj-card-${subject.code}`}
      tabIndex={0}
      role="button"
      aria-label={`Môn học ${subject.name}, mã ${subject.code}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ease-out cursor-pointer overflow-hidden backdrop-blur-sm focus:outline-none ${
        isFocused
          ? 'bg-white dark:bg-[#131b2e] border-indigo-500 shadow-xl shadow-indigo-500/10 -translate-y-1 scale-[1.015] ring-2 ring-indigo-500/30'
          : 'bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]'
      }`}
    >
      {/* Top subtle highlight */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent transition-all duration-200 ${
          isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      <div className="space-y-3.5 relative z-10">
        {/* Header Badges: Code & Credits separated on left, Exam Format on right */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subject Code Badge */}
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-mono font-bold tracking-wide text-slate-700 dark:text-slate-300 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-colors duration-200">
              <HighlightText text={subject.code} query={searchQuery} />
            </span>

            {/* Separate Credits Box - Highlighted */}
            <span
              id={`subj-credits-${subject.code}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold shadow-xs transition-all duration-200 group-hover:scale-105"
              title={`Số tín chỉ: ${subject.credits}`}
            >
              <span>{subject.credits} Tín chỉ</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Exam Format Tag */}
            {examFormat === 'Thi tập trung' ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors duration-200"
                title="Hình thức kiểm tra: Thi tập trung"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Thi tập trung</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors duration-200"
                title="Hình thức kiểm tra: Báo cáo / Đồ án môn học"
              >
                <Presentation className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Đồ án</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="pt-1">
          <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2 leading-snug">
            <HighlightText text={subject.name} query={searchQuery} />
          </h3>
        </div>

        {/* Update note snippet if available */}
        {subject.updateNotes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            📝 {subject.updateNotes}
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs relative z-10">
        {subject.lastUpdated ? (
          <span
            id={`subj-time-${subject.code}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold shadow-2xs"
            title={`Lần cập nhật cuối: ${subject.lastUpdated}`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{subject.lastUpdated.split(' ')[0]}</span>
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2 ml-auto">
          {isFocused && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[10px] font-mono font-medium animate-pulse">
              Enter ↵
            </span>
          )}
          <div className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-200 text-xs">
            <span>Xem chi tiết</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200 ease-out" />
          </div>
        </div>
      </div>
    </div>
  );
};

