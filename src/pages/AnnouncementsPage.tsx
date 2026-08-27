import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen
} from 'lucide-react';
import { Announcement, AnnouncementType } from '../types';
import {
  fetchAnnouncements,
  getStoredAnnouncements,
  ANNOUNCEMENTS_UPDATED_EVENT
} from '../services/announcementService';

interface AnnouncementsPageProps {
  onNavigate?: (path: string) => void;
}

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({ onNavigate }) => {
  const [filterType, setFilterType] = useState<AnnouncementType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());

  useEffect(() => {
    fetchAnnouncements().then((data) => {
      if (data && data.length > 0) {
        setAnnouncements(data);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setAnnouncements(e.detail);
      } else {
        setAnnouncements(getStoredAnnouncements());
      }
    };

    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
  }, []);

  const filteredAnnouncements = announcements.filter(
    (a) => filterType === 'all' || a.type === filterType
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
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
            <span>Khoa CNTT</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Bảng Thông Báo & Tin Tức Học Vụ</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            Thông Báo Từ Khoa & Ban Học Tập
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 mt-2.5 max-w-3xl leading-relaxed font-normal border-l-2 border-rose-500/80 dark:border-rose-400/80 pl-3.5 py-0.5">
            Cập nhật lịch thi, đề thi mới, thông tin hội thảo công nghệ và kế hoạch bảo trì hệ thống học tập StudyVault.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
            {announcements.length} Thông báo
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'all', label: 'Tất cả thông báo' },
          { id: 'important', label: '🔴 [QUAN TRỌNG]' },
          { id: 'update', label: '🔵 [CẬP NHẬT]' },
          { id: 'warning', label: '🟡 [CẢNH BÁO]' },
          { id: 'event', label: '🟣 [SỰ KIỆN]' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`filter-ann-${tab.id}`}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              filterType === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            id={`ann-card-${ann.id}`}
            className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm space-y-4 transition-all duration-200"
          >
            {/* Header: Tag + Date */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 border ${
                    ann.type === 'important'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                      : ann.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : ann.type === 'event'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                  }`}
                >
                  {ann.type === 'important' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  {ann.typeLabel}
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {ann.author || 'Ban Điều hành StudyVault'}
                </span>
              </div>

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {ann.date}
              </span>
            </div>

            {/* Title & Summary */}
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {ann.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {ann.summary}
              </p>
            </div>

            {/* Downtime alert box if warning */}
            {ann.downtimeNotice && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{ann.downtimeNotice}</span>
              </div>
            )}

            {/* Action Link & Folder */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 text-xs">
                {ann.driveFolderLink && (
                  <a
                    href={ann.driveFolderLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors font-semibold"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Thư mục Drive đính kèm</span>
                  </a>
                )}
              </div>

              {ann.linkText && (
                <a
                  href={ann.linkUrl || '#'}
                  onClick={(e) => {
                    if (ann.linkUrl?.startsWith('/') && typeof onNavigate === 'function') {
                      e.preventDefault();
                      onNavigate(ann.linkUrl);
                    }
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 group transition-colors"
                >
                  <span>{ann.linkText}</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Hiển thị <span className="font-bold text-slate-900 dark:text-white">{filteredAnnouncements.length}</span> thông báo
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {[1, 2, 3, 4].map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-7 h-7 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                currentPage === page
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            disabled={currentPage === 4}
            onClick={() => setCurrentPage(prev => Math.min(4, prev + 1))}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
