import React, { useState, useMemo, useRef } from 'react';
import {
  GraduationCap,
  LayoutGrid,
  Code2,
  BookOpen,
  Award,
  Search,
  Filter,
  ArrowUpDown,
  FileCheck,
  Presentation,
  FolderOpen,
  Sparkles,
  X
} from 'lucide-react';
import { SubjectCard } from '../components/SubjectCard';
import { EmptyStateIllustration } from '../components/EmptyStateIllustration';
import { categoryMeta } from '../data/mockData';
import { Subject, SubjectCategory } from '../types';
import { useGoogleSheet } from '../context/GoogleSheetContext';

interface CategoryPageProps {
  category: SubjectCategory;
  onNavigate?: (path: string) => void;
  onOpenContributeModal?: (code?: string) => void;
}

// Utility to normalize Vietnamese string for matching
const normalizeSearch = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  onNavigate,
  onOpenContributeModal
}) => {
  const { subjects } = useGoogleSheet();

  const [searchQuery, setSearchQuery] = useState('');
  const [creditFilter, setCreditFilter] = useState<number | 'all'>('all');
  const [examFilter, setExamFilter] = useState<'all' | 'Thi tập trung' | 'Báo cáo'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'credits' | 'lastUpdated'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const meta = categoryMeta[category] || categoryMeta.foundation;

  const getExamFormat = (sub: Subject): 'Thi tập trung' | 'Báo cáo' => {
    if (sub.examFormat) {
      return sub.examFormat.toLowerCase().includes('báo cáo') || sub.examFormat.toLowerCase().includes('đồ án')
        ? 'Báo cáo'
        : 'Thi tập trung';
    }
    const codeNum = parseInt(sub.code.replace(/\D/g, ''), 10) || 0;
    return codeNum % 2 === 0 ? 'Thi tập trung' : 'Báo cáo';
  };

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((s) => s.category === category)
      .filter((s) => {
        if (creditFilter !== 'all' && s.credits !== creditFilter) return false;
        if (examFilter !== 'all') {
          const format = getExamFormat(s);
          if (format !== examFilter) return false;
        }
        if (searchQuery.trim()) {
          const rawQ = searchQuery.toLowerCase().trim();
          const normQ = normalizeSearch(searchQuery.trim());
          
          const rawName = s.name.toLowerCase();
          const normName = normalizeSearch(s.name);
          const rawCode = s.code.toLowerCase();
          const rawEnglish = (s.englishName || '').toLowerCase();
          const rawDesc = (s.description || '').toLowerCase();
          const normDesc = normalizeSearch(s.description || '');

          return (
            rawName.includes(rawQ) ||
            normName.includes(normQ) ||
            rawCode.includes(rawQ) ||
            rawEnglish.includes(rawQ) ||
            rawDesc.includes(rawQ) ||
            normDesc.includes(normQ)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'code') comp = a.code.localeCompare(b.code);
        else if (sortBy === 'name') comp = a.name.localeCompare(b.name, 'vi');
        else if (sortBy === 'credits') comp = a.credits - b.credits;
        else if (sortBy === 'lastUpdated') {
          const timeA = Date.parse(a.lastUpdated || '') || 0;
          const timeB = Date.parse(b.lastUpdated || '') || 0;
          comp = timeA - timeB;
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [subjects, category, creditFilter, examFilter, searchQuery, sortBy, sortOrder]);

  const Icon = {
    general: GraduationCap,
    foundation: LayoutGrid,
    specialized: Code2,
    elective: BookOpen,
    capstone: Award,
  }[category] || LayoutGrid;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
            <button
              onClick={() => onNavigate('/')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Trang chủ
            </button>
            <span>/</span>
            <span>Chương trình đào tạo</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{meta.title}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Icon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {meta.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 mt-2.5 max-w-3xl leading-relaxed font-normal border-l-2 border-indigo-500/80 dark:border-indigo-400/80 pl-3.5 py-0.5">
            {meta.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
            {filteredSubjects.length} Môn học
          </span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Quick Search inside category */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Lọc tên môn hoặc mã môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters: Credits & Exam Types & Sort */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            {/* Credit Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#090e18] p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {(['all', 2, 3, 4] as const).map((cr) => (
                <button
                  key={cr}
                  onClick={() => setCreditFilter(cr)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                    creditFilter === cr
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cr === 'all' ? 'Tất cả TC' : `${cr} TC`}
                </button>
              ))}
            </div>

            {/* Exam Format Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#090e18] p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {[
                { id: 'all', label: 'Tất cả HT' },
                { id: 'Thi tập trung', label: 'Thi tập trung' },
                { id: 'Báo cáo', label: 'Đồ án' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setExamFilter(fmt.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    examFilter === fmt.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 flex-wrap">
              <span>Đang làm nổi bật từ khóa:</span>
              <span className="bg-yellow-200 dark:bg-yellow-400/30 text-yellow-950 dark:text-yellow-200 font-bold px-1.5 py-0.5 rounded-md font-mono shadow-xs">
                "{searchQuery.trim()}"
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono">
                ({filteredSubjects.length} môn học)
              </span>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Xóa từ khóa
            </button>
          </div>
        )}
      </div>

      {/* Grid of Subject Cards */}
      {filteredSubjects.length > 0 ? (
        <div
          ref={gridContainerRef}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredSubjects.map((subject, idx) => (
            <SubjectCard
              key={subject.code}
              subject={subject}
              examFormat={getExamFormat(subject)}
              onNavigate={onNavigate}
              isFocused={focusedIndex === idx}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      ) : (
        <EmptyStateIllustration
          title="Không tìm thấy môn học phù hợp"
          description="Vui lòng thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc số tín chỉ và hình thức đánh giá."
          actionText="Đặt lại tất cả bộ lọc"
          badge="0 môn học tìm thấy"
          onAction={() => {
            setSearchQuery('');
            setCreditFilter('all');
            setExamFilter('all');
          }}
        />
      )}
    </div>
  );
};
