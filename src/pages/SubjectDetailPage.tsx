import React, { useState } from 'react';
import {
  ExternalLink,
  ChevronRight,
  BookOpen,
  Layers,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Code,
  FolderOpen,
  Share2,
  PlusCircle,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  FlaskConical,
  Laptop,
  AlertTriangle,
  Info
} from 'lucide-react';
import { categoryMeta } from '../data/mockData';
import { Subject } from '../types';
import { getDriveUrlForCourse } from '../config/driveLinks';
import { useGoogleSheet } from '../context/GoogleSheetContext';

interface SubjectDetailPageProps {
  code: string;
  onNavigate?: (path: string) => void;
  onOpenContributeModal?: (code: string) => void;
}

export const SubjectDetailPage: React.FC<SubjectDetailPageProps> = ({
  code,
  onNavigate,
  onOpenContributeModal
}) => {
  const [copied, setCopied] = useState(false);
  const { getSubjectByCode } = useGoogleSheet();

  // Find subject dynamically from background merged subjects
  const subject = getSubjectByCode(code) || {
    id: (code || 'subject').toLowerCase(),
    code: code || 'COMP1000',
    name: 'Môn học',
    englishName: '',
    category: 'foundation',
    categoryName: 'Môn học cơ sở ngành',
    semester: 'Học kỳ chính',
    credits: 3,
    theoryHours: 2,
    practicalHours: 1,
    description: 'Thông tin tài liệu và đề cương học phần.',
    driveUrl: getDriveUrlForCourse(code),
    lastUpdated: new Date().toISOString().split('T')[0],
    gradingWeights: { process: 0.3, midterm: null, practical: 0.3, final: 0.4 },
    prerequisites: { previousCourses: [], prerequisiteCourses: [] },
    syllabus: []
  } as Subject;

  const meta = categoryMeta[subject.category] || categoryMeta.foundation;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
        <button
          onClick={() => {
            if (typeof onNavigate === 'function') {
              onNavigate('/');
            }
          }}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          Trang chủ
        </button>
        <span>/</span>
        <button
          onClick={() => {
            if (typeof onNavigate === 'function') {
              onNavigate(`/category/${subject.category}`);
            }
          }}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>{meta.title}</span>
        </button>
        <span>/</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-xs sm:max-w-md">
          {subject.code} - {subject.name}
        </span>
      </nav>

      {/* Main Subject Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
        {/* Top Row: Badges on the left & Prominent Credits Badge on the top right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-300 font-mono text-sm font-bold">
              {subject.code}
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Lần cập nhật cuối: {subject.lastUpdated || '2026-08-22'}
            </span>
          </div>

          {/* Top-Right: Prominent Credits Badge */}
          <div className="px-4 py-2 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 flex items-center gap-2.5 shadow-sm">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">Số tín chỉ:</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-300 leading-none">{subject.credits}</span>
          </div>
        </div>

        {/* Title, Notes & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {subject.code} - {subject.name}
            </h1>
            {subject.englishName && (
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-mono">
                {subject.englishName}
              </p>
            )}
          </div>

          {/* Action Buttons: Open Drive + Share */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleShare}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              title="Sao chép link môn học"
            >
              <Share2 className="w-5 h-5" />
            </button>

            <a
              href={getDriveUrlForCourse(subject.code, subject.driveUrl)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Mở Drive môn học 📁</span>
              <ExternalLink className="w-4 h-4 ml-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main 2-Column Info Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Course Specs & Syllabus */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Đề cương chi tiết theo chương (Syllabus Outline) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Đề cương lý thuyết tóm tắt theo chương
              </h2>
              {subject.syllabus && subject.syllabus.length > 0 ? (
                <span className="text-sm sm:text-base font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/60 font-semibold">
                  {subject.syllabus.length} Chương
                </span>
              ) : (
                <span className="text-sm sm:text-base font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700/60 font-semibold">
                  Không có
                </span>
              )}
            </div>

            <div className="space-y-3">
              {subject.syllabus && subject.syllabus.length > 0 ? (
                subject.syllabus.map((ch) => (
                  <div
                    key={ch.chapter}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-mono text-xs font-bold shrink-0">
                        Chương {ch.chapter}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {ch.title}
                      </h3>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                      {ch.description}
                    </p>

                    {ch.topics && ch.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                        {ch.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 text-xs font-mono"
                          >
                            • {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic p-4 text-center">
                  Đang cập nhật đề cương chi tiết cho môn học này từ ban học thuật.
                </div>
              )}
            </div>
          </div>

          {/* Card 2.5: Đề cương thực hành / Lab */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Nội dung & Đề cương thực hành (Lab)
              </h2>
              {subject.practicalOutline && subject.practicalOutline.length > 0 ? (
                <span className="text-sm sm:text-base font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                  {subject.practicalOutline.length} Bài thực hành
                </span>
              ) : (
                <span className="text-sm sm:text-base font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700/60 font-semibold">
                  Không có
                </span>
              )}
            </div>

            <div className="space-y-3">
              {subject.practicalOutline && subject.practicalOutline.length > 0 ? (
                <>
                  {subject.practicalOutline.map((lab) => (
                    <div
                      key={lab.labNumber}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200/80 dark:border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono text-xs font-bold shrink-0">
                          LAB {lab.labNumber}
                        </span>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {lab.title}
                        </h3>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                        {lab.description}
                      </p>

                      {lab.toolsOrTech && lab.toolsOrTech.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                          {lab.toolsOrTech.map((tech, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-mono font-medium"
                            >
                              ⚙️ {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Instructor notice banner */}
                  <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>Lưu ý:</strong> Nội dung của các bài thực hành có thể thay đổi tùy theo từng giảng viên phụ trách học phần.
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200/80 dark:border-slate-800/80 text-center text-base text-slate-600 dark:text-slate-300 font-medium">
                  Không có
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Grading Weight, Prerequisites & Resources */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Hệ số điểm đánh giá (Segmented Bar) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Hệ số điểm đánh giá
              </h2>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                Tổng 100%
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="space-y-3 pt-1">
              {(() => {
                const qt = Math.round((subject.gradingWeights.process || 0) * 100);
                const gk = Math.round((subject.gradingWeights.midterm || 0) * 100);
                const th = Math.round((subject.gradingWeights.practical || 0) * 100);
                const ck = Math.round((subject.gradingWeights.final || 0) * 100);

                return (
                  <>
                    <div className="h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                      {qt > 0 && (
                        <div
                          style={{ width: `${qt}%` }}
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-l-full"
                          title={`Quá trình: ${qt}%`}
                        />
                      )}
                      {gk > 0 && (
                        <div
                          style={{ width: `${gk}%` }}
                          className="h-full bg-amber-500"
                          title={`Giữa kỳ: ${gk}%`}
                        />
                      )}
                      {th > 0 && (
                        <div
                          style={{ width: `${th}%` }}
                          className="h-full bg-sky-500"
                          title={`Thực hành: ${th}%`}
                        />
                      )}
                      {ck > 0 && (
                        <div
                          style={{ width: `${ck}%` }}
                          className="h-full bg-purple-600 dark:bg-purple-500 rounded-r-full"
                          title={`Cuối kỳ: ${ck}%`}
                        />
                      )}
                    </div>

                    {/* 4 Single-line indicators */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="flex flex-col items-center p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
                        <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Quá trình</span>
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">QT: {qt}%</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Giữa kỳ</span>
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">GK: {gk}%</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40">
                        <span className="text-xs font-medium text-sky-700 dark:text-sky-300">Thực hành</span>
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">TH: {th}%</span>
                      </div>
                      <div className="flex flex-col items-center p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40">
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Cuối kỳ</span>
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">CK: {ck}%</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Card 4: Điều kiện đăng ký môn học (Prerequisites Table) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Điều kiện đăng ký môn học
              </h2>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-base">
              <div className="grid grid-cols-2 bg-slate-100 dark:bg-[#090e18] p-3 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 text-base text-center">
                <span>Môn học trước</span>
                <span>Môn học tiên quyết</span>
              </div>
              <div className="grid grid-cols-2 p-4 bg-white dark:bg-[#131b2e] divide-x divide-slate-200 dark:divide-slate-800">
                <div className="px-3 space-y-1.5 flex flex-col items-center justify-center text-center">
                  {subject.prerequisites?.previousCourses && subject.prerequisites.previousCourses.length > 0 ? (
                    subject.prerequisites.previousCourses.map((c, i) => (
                      <div key={i} className="text-slate-800 dark:text-slate-200 font-mono text-base font-medium">
                        {c.code} - {c.name}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-base">Không có</span>
                  )}
                </div>

                <div className="px-3 space-y-1.5 flex flex-col items-center justify-center text-center">
                  {subject.prerequisites?.prerequisiteCourses && subject.prerequisites.prerequisiteCourses.length > 0 ? (
                    subject.prerequisites.prerequisiteCourses.map((c, i) => (
                      <div key={i} className="text-rose-600 dark:text-rose-400 font-mono font-bold text-base">
                        {c.code} - {c.name}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-base">Không có</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Thông tin khác */}
          {subject.updateNotes && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Thông tin khác
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090e18] border border-slate-200/80 dark:border-slate-800/80">
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {subject.updateNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
