import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Bell,
  Sun,
  Moon,
  Menu,
  GraduationCap,
  ExternalLink,
  Keyboard,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import announcementsData from '../data/announcements.json';
import { Announcement } from '../types';
import { toggleAppTheme, getInitialTheme } from '../utils/theme';

interface NavbarProps {
  onOpenCommandPalette: () => void;
  onOpenQuickContribute: () => void;
  onOpenShortcuts?: () => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCommandPalette,
  onOpenQuickContribute,
  onOpenShortcuts,
  onToggleTheme,
  isDarkMode: externalIsDarkMode,
  onToggleSidebar,
  isSidebarOpen = true,
  onNavigate
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || getInitialTheme() === 'dark';
    }
    return true;
  });

  // Sync internal icon state with global theme toggle events without causing App-level re-renders
  useEffect(() => {
    const handleThemeEvent = (e: Event) => {
      const custom = e as CustomEvent<{ isDark: boolean }>;
      if (custom.detail && typeof custom.detail.isDark === 'boolean') {
        setIsDark(custom.detail.isDark);
      } else {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };

    window.addEventListener('hcmue-theme-toggle', handleThemeEvent);
    return () => window.removeEventListener('hcmue-theme-toggle', handleThemeEvent);
  }, []);

  const handleToggleClick = () => {
    const nextDark = toggleAppTheme();
    setIsDark(nextDark);
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  const announcements = announcementsData as Announcement[];
  const importantCount = announcements.filter(a => a.type === 'important').length;

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white dark:bg-[#0e1424] border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle, Desktop Toggle & Brand Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          id="mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 lg:hidden transition-colors duration-200"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sidebar Menu Toggle Button (Clean, Interactive & Subtle Hover Glow) */}
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="group relative hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 select-none shrink-0 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800/90 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md hover:shadow-indigo-500/15 hover:ring-2 hover:ring-indigo-500/20"
          title={isSidebarOpen ? 'Thu gọn menu (Ctrl+B)' : 'Mở rộng menu (Ctrl+B)'}
          aria-label="Menu"
        >
          {/* Subtle Ambient Pulse Dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>

          <Menu className="w-5 h-5 transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        </button>

        <div
          id="brand-logo"
          onClick={() => {
            if (typeof onNavigate === 'function') {
              onNavigate('/');
            }
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0 py-1"
        >
          {/* Brand Logo Emblem */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#124874] via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col justify-center leading-tight select-none">
            <span className="text-lg font-black tracking-tight text-[#124874] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              EduMate
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 tracking-tight whitespace-nowrap">
              Nền tảng học liệu số
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search Command Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          id="global-search-trigger"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#131b2e] hover:bg-slate-200/70 dark:hover:bg-[#1a243b] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs transition-colors duration-200 group cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
            <span className="text-slate-500 dark:text-slate-400">Tìm kiếm môn học, mã môn, tài liệu...</span>
          </div>
        </button>
      </div>

      {/* Right: Actions & User Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          id="mobile-search-btn"
          onClick={onOpenCommandPalette}
          className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 md:hidden transition-colors duration-200"
          title="Tìm kiếm"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Quick Contribute Button */}
        <button
          id="nav-quick-contribute-btn"
          onClick={() => {
            if (typeof onNavigate === 'function') {
              onNavigate('/contribute');
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all duration-200 active:scale-95 cursor-pointer"
          title="Chuyển đến trang Đóng góp và Vinh danh"
        >
          <PlusCircle className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Đóng góp tài liệu</span>
        </button>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            id="nav-notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors duration-200 relative cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {importantCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0e1424]" />
            )}
          </button>

          {/* Notifications Flyout */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 shadow-xl p-4 space-y-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Thông báo Khoa & Ban học tập
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                  {announcements.length} mới
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {announcements.slice(0, 4).map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => {
                      setShowNotifications(false);
                      if (typeof onNavigate === 'function') {
                        onNavigate('/announcements');
                      }
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-150 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                        ann.type === 'important' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {ann.typeLabel}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">{ann.date}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {ann.title}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      {ann.summary}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    if (typeof onNavigate === 'function') {
                      onNavigate('/announcements');
                    }
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 w-full cursor-pointer"
                >
                  <span>Xem tất cả thông báo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <button
          id="theme-toggle-btn"
          onClick={handleToggleClick}
          className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
          title={isDark ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
};
