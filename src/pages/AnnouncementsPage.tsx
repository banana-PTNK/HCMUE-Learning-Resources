import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  Share2,
  Check,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { Announcement, AnnouncementType } from '../types';
import {
  fetchAnnouncements,
  getStoredAnnouncements,
  ANNOUNCEMENTS_UPDATED_EVENT
} from '../services/announcementService';

interface AnnouncementsPageProps {
  onNavigate?: (path: string) => void;
  initialAnnouncementId?: string;
}

// Markdown-like text renderer for Announcement full content
const renderFormattedContent = (content?: string, summary?: string) => {
  const text = content || summary || '';
  const lines = text.split('\n');

  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-200 leading-relaxed text-base">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Header 1 / 2
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white pt-2">
              {trimmed.replace(/^#\s+/, '')}
            </h2>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pt-1.5">
              {trimmed.replace(/^##\s+/, '')}
            </h3>
          );
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span>{renderInlineStyles(itemText)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineStyles(trimmed)}</p>;
      })}
    </div>
  );
};

const renderInlineStyles = (text: string) => {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({
  onNavigate,
  initialAnnouncementId
}) => {
  const [filterType, setFilterType] = useState<AnnouncementType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchAnnouncements().then((data) => {
      if (data && data.length > 0) {
        setAnnouncements(data);
        if (initialAnnouncementId) {
          const match = data.find((a) => a.id === initialAnnouncementId);
          if (match) setSelectedAnnouncement(match);
        }
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
  }, [initialAnnouncementId]);

  const handleSelectAnnouncement = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyShareLink = (ann: Announcement) => {
    const url = `${window.location.origin}/announcements/${ann.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const filteredAnnouncements = announcements.filter(
    (a) => filterType === 'all' || a.type === filterType
  );

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE) || 1;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // If viewing a single announcement in full detail view
  if (selectedAnnouncement) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-12 max-w-4xl mx-auto">
        {/* Navigation bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSelectedAnnouncement(null)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyShareLink(selectedAnnouncement)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Sao chép liên kết thông báo"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã sao chép' : 'Chia sẻ'}</span>
            </button>
          </div>
        </div>

        {/* Full Detail Article Card */}
        <article className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border ${
                  selectedAnnouncement.type === 'important'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                    : selectedAnnouncement.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                    : selectedAnnouncement.type === 'event'
                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                }`}
              >
                {selectedAnnouncement.type === 'important' && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
                {selectedAnnouncement.typeLabel}
              </span>

              <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Tác giả: <strong className="text-slate-800 dark:text-slate-200">{selectedAnnouncement.author || 'Ban Điều hành StudyVault'}</strong>
              </span>
            </div>

            <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {selectedAnnouncement.date}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {selectedAnnouncement.title}
          </h1>

          {/* Downtime Alert Box */}
          {selectedAnnouncement.downtimeNotice && (
            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Kế hoạch bảo trì / Tạm ngưng:</strong>
                <span>{selectedAnnouncement.downtimeNotice}</span>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {renderFormattedContent(selectedAnnouncement.content, selectedAnnouncement.summary)}
          </div>

          {/* Attached Drive & Actions */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {selectedAnnouncement.driveFolderLink ? (
              <a
                href={selectedAnnouncement.driveFolderLink}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <span>Mở Google Drive đính kèm</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div />
            )}

            {selectedAnnouncement.linkText && (
              <a
                href={selectedAnnouncement.linkUrl || '#'}
                onClick={(e) => {
                  if (selectedAnnouncement.linkUrl?.startsWith('/') && typeof onNavigate === 'function') {
                    e.preventDefault();
                    onNavigate(selectedAnnouncement.linkUrl);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{selectedAnnouncement.linkText}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
            <button
              onClick={() => onNavigate && onNavigate('/')}
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
            Cập nhật lịch thi, đề thi mới, thông tin hội thảo công nghệ và kế hoạch bảo trì hệ thống học tập StudyVault. Nhấp vào thông báo để xem chi tiết đầy đủ.
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
            onClick={() => {
              setFilterType(tab.id as any);
              setCurrentPage(1);
            }}
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

      {/* Announcements Clickable List */}
      <div className="space-y-4">
        {paginatedAnnouncements.map((ann) => (
          <div
            key={ann.id}
            id={`ann-card-${ann.id}`}
            tabIndex={0}
            role="button"
            aria-label={`Thông báo ${ann.title}`}
            onClick={() => handleSelectAnnouncement(ann)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectAnnouncement(ann);
              }
            }}
            className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow-md space-y-3.5 transition-all duration-200 cursor-pointer group"
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
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {ann.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                {ann.summary}
              </p>
            </div>

            {/* Downtime alert box if warning */}
            {ann.downtimeNotice && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{ann.downtimeNotice}</span>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              <span className="group-hover:underline flex items-center gap-1">
                <span>Xem chi tiết thông báo</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>

              {ann.driveFolderLink && (
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Có tài liệu đính kèm</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị <span className="font-bold text-slate-900 dark:text-white">{filteredAnnouncements.length}</span> thông báo (Trang {currentPage}/{totalPages})
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
