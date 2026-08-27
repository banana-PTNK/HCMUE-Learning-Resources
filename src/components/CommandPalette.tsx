import React, { useState, useEffect } from 'react';
import { Home, Search, BookOpen, Calendar, Bot, Upload, Bell, ArrowRight, X, History, Trash2, CornerDownLeft } from 'lucide-react';
import { Subject } from '../types';
import { useGoogleSheet } from '../context/GoogleSheetContext';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { HighlightText } from './HighlightText';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const SEARCH_HISTORY_KEY = 'fithcmue_search_history';
const MAX_HISTORY_ITEMS = 6;

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const { subjects } = useGoogleSheet();
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever history changes
  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setSearchHistory((prev) => {
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_HISTORY_ITEMS
      );
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save search history', err);
      }
      return next;
    });
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const next = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch (err) {
        console.error('Failed to update search history', err);
      }
      return next;
    });
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (err) {
      console.error('Failed to clear search history', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    saveSearchTerm(query);

    // If there is an exact code match or top match, navigate to it
    if (filteredSubjects.length > 0) {
      const topSubject = filteredSubjects[0];
      if (typeof onNavigate === 'function') {
        onNavigate(`/subject/${topSubject.code}`);
      }
      onClose();
    }
  };

  const handleSelectSubject = (code: string) => {
    if (query.trim()) {
      saveSearchTerm(query);
    }
    if (typeof onNavigate === 'function') {
      onNavigate(`/subject/${code}`);
    }
    onClose();
  };

  const handleSelectTool = (path: string) => {
    if (query.trim()) {
      saveSearchTerm(query);
    }
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    }
    onClose();
  };

  const handleSelectHistoryItem = (term: string) => {
    setQuery(term);
    saveSearchTerm(term);
  };

  if (!isOpen) return null;

  const filteredSubjects = query.trim() === ''
    ? subjects.slice(0, 5)
    : subjects.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.code.toLowerCase().includes(query.toLowerCase()) ||
        s.englishName.toLowerCase().includes(query.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(query.toLowerCase())
      );

  const quickTools = [
    { name: 'Trang chủ StudyVault', path: '/', icon: Home, desc: 'Tổng quan hệ thống, công cụ & chương trình học' },
    { name: 'Trợ lý Xếp Thời khóa biểu', path: '/ai-schedule', icon: Calendar, desc: 'Tự động quét và giải xung đột TKB (CSP)' },
    { name: 'Trợ lý học thuật & Code', path: '/ai-assistant', icon: Bot, desc: 'Phân tích Big-O, Dry Run và kiểm thử biên' },
    { name: 'Đóng góp tài liệu học tập', path: '/contribute', icon: Upload, desc: 'Gửi đề thi, slide, link Google Form & BXH vinh danh' },
    { name: 'Thông báo từ Khoa CNTT', path: '/announcements', icon: Bell, desc: 'Lịch thi, bảo trì & cập nhật kho' }
  ];

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs px-4"
      onClick={onClose}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3 bg-slate-50 dark:bg-[#090e18]">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            id="cmd-search-input"
            autoFocus
            type="text"
            placeholder="Tìm kiếm môn học, mã môn (vd: IT002, Cấu trúc dữ liệu), công cụ Trợ lý..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Xóa ô tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Đóng bảng tìm kiếm (ESC)"
          >
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ESC
            </span>
          </button>
        </form>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Recent Search History Section */}
          {searchHistory.length > 0 && query.trim() === '' && (
            <div id="search-history-section" className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono px-2">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  id="clear-all-history-btn"
                  onClick={clearAllHistory}
                  className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-semibold lowercase hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>xóa lịch sử</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 px-1">
                {searchHistory.map((item, idx) => (
                  <div
                    key={`${item}-${idx}`}
                    onClick={() => handleSelectHistoryItem(item)}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                  >
                    <History className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => removeHistoryItem(e, item)}
                      className="p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Xóa mục này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Tools */}
          {query.trim() === '' && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono px-2">
                Công cụ thông minh
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.path}
                      onClick={() => handleSelectTool(tool.path)}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#090e18] hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tool.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {tool.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subjects Matching */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono px-2 flex items-center justify-between">
              <span>{query.trim() === '' ? 'Môn học phổ biến' : `Kết quả tìm kiếm (${filteredSubjects.length})`}</span>
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {filteredSubjects.length > 0 ? (
              <div className="space-y-1">
                {filteredSubjects.map((sub) => (
                  <button
                    key={sub.code}
                    onClick={() => handleSelectSubject(sub.code)}
                    className="w-full p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold shrink-0">
                        <HighlightText text={sub.code} query={query} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          <HighlightText text={sub.name} query={query} />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <HighlightText text={sub.englishName} query={query} /> • {sub.credits} Tín chỉ
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyStateIllustration
                title={`Không tìm thấy môn học nào`}
                description={`Không có tài liệu hoặc môn học nào khớp với từ khóa "${query}". Hãy thử tìm theo mã môn, tên tiếng Việt không dấu hoặc từ khóa chung.`}
                actionText="Xóa từ khóa tìm kiếm"
                onAction={() => setQuery('')}
                className="my-2 border-0 bg-transparent dark:bg-transparent shadow-none p-6"
                badge="0 kết quả"
              />
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#090e18] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="w-3 h-3 text-slate-400" />
            <span>Nhấn Enter để tìm & lưu lịch sử</span>
          </span>
          <span>Nhấn ESC để đóng</span>
        </div>
      </div>
    </div>
  );
};
