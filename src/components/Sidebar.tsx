import React, { useState } from 'react';
import {
  Home,
  GraduationCap,
  LayoutGrid,
  Code2,
  BookOpen,
  Award,
  Calendar,
  Bot,
  PlusCircle,
  Bell,
  Sparkles,
  ChevronRight,
  X,
  MessageSquarePlus
} from 'lucide-react';
import subjectsData from '../data/subjects.json';
import { Subject } from '../types';
import { FeedbackModal } from './FeedbackModal';

interface SidebarProps {
  currentPath: string;
  onNavigate?: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpen,
  onClose
}) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const subjects = subjectsData as Subject[];

  // Counts by category
  const countGeneral = subjects.filter(s => s.category === 'general').length;
  const countFoundation = subjects.filter(s => s.category === 'foundation').length;
  const countSpecialized = subjects.filter(s => s.category === 'specialized').length;
  const countElective = subjects.filter(s => s.category === 'elective').length;
  const countCapstone = subjects.filter(s => s.category === 'capstone').length;

  const trainingCategories = [
    {
      id: 'general',
      path: '/category/general',
      label: 'Môn học đại cương',
      englishLabel: 'General Education',
      icon: GraduationCap,
      count: countGeneral
    },
    {
      id: 'foundation',
      path: '/category/foundation',
      label: 'Môn học cơ sở ngành',
      englishLabel: 'Fundamental IT',
      icon: LayoutGrid,
      count: countFoundation
    },
    {
      id: 'specialized',
      path: '/category/specialized',
      label: 'Môn học chuyên ngành',
      englishLabel: 'Specialized IT',
      icon: Code2,
      count: countSpecialized
    },
    {
      id: 'elective',
      path: '/category/elective',
      label: 'Môn học tự chọn',
      englishLabel: 'Elective Subjects',
      icon: BookOpen,
      count: countElective
    },
    {
      id: 'capstone',
      path: '/category/capstone',
      label: 'Đồ án & Khóa luận',
      englishLabel: 'Capstone & Resources',
      icon: Award,
      count: countCapstone
    }
  ];

  const smartTools = [
    {
      id: 'ai-schedule',
      path: '/ai-schedule',
      label: 'Trợ lý Xếp Thời khóa biểu',
      sublabel: 'Conflict-Free Timetable CSP',
      icon: Calendar
    },
    {
      id: 'ai-assistant',
      path: '/ai-assistant',
      label: 'Trợ lý Code & Thuật toán',
      sublabel: 'Big-O Analysis & Dry Run',
      icon: Bot
    }
  ];

  const communityTools = [
    {
      id: 'contribute',
      path: '/contribute',
      label: 'Đóng góp tài liệu',
      sublabel: 'Google Form & Leaderboard',
      icon: PlusCircle
    },
    {
      id: 'announcements',
      path: '/announcements',
      label: 'Thông báo từ Khoa',
      sublabel: 'Bảng tin học vụ & Lịch thi',
      icon: Bell
    }
  ];

  const handleLinkClick = (path: string) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    }
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-200"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-40 h-full lg:h-[calc(100vh-4rem)] shrink-0 w-72 min-w-[288px] max-w-[288px] bg-white dark:bg-[#0e1424] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto transition-all duration-300 ${
          isOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0 lg:max-w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0 pointer-events-none'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Mobile Drawer Brand Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 lg:hidden">
            <div
              onClick={() => {
                if (typeof onNavigate === 'function') {
                  onNavigate('/');
                }
                onClose();
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none group py-1"
            >
              {/* Brand Logo Emblem */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#124874] via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>

              <div className="flex flex-col justify-center leading-tight select-none">
                <span className="text-lg font-black tracking-tight text-[#124874] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  HCMUE
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 tracking-tight whitespace-nowrap">
                  Kho Học Liệu CNTT
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Group 0: TỔNG QUAN & TRANG CHỦ */}
          <div className="space-y-1">
            <button
              id="sidebar-link-home"
              onClick={() => handleLinkClick('/')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                currentPath === '/' || currentPath === '/home'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left min-w-0">
                <Home className={`w-4 h-4 shrink-0 ${currentPath === '/' || currentPath === '/home' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="font-medium truncate">Trang chủ</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${currentPath === '/' || currentPath === '/home' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
            </button>
          </div>

          {/* Group 1: CHƯƠNG TRÌNH ĐÀO TẠO */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Chương Trình Đào Tạo
            </div>

            <nav className="space-y-1">
              {trainingCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = currentPath === cat.path;

                return (
                  <button
                    key={cat.id}
                    id={`sidebar-link-${cat.id}`}
                    onClick={() => handleLinkClick(cat.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0 pr-2">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="font-medium truncate">{cat.label}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold shrink-0 ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: CÔNG CỤ THÔNG MINH */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
              <span>Công Cụ Thông Minh</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            </div>

            <nav className="space-y-1">
              {smartTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = currentPath === tool.path || (tool.id === 'ai-schedule' && currentPath === '/schedule-parser');

                return (
                  <button
                    key={tool.id}
                    id={`sidebar-tool-${tool.id}`}
                    onClick={() => handleLinkClick(tool.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="font-medium truncate">{tool.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 3: THÔNG TIN & ĐÓNG GÓP */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between">
              <span>Thông Tin & Đóng Góp</span>
              <Bell className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            </div>

            <nav className="space-y-1">
              {communityTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = currentPath === tool.path;

                return (
                  <button
                    key={tool.id}
                    id={`sidebar-tool-${tool.id}`}
                    onClick={() => handleLinkClick(tool.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="font-medium truncate">{tool.label}</span>
                    </div>
                  </button>
                );
              })}

              {/* Feedback Button - Highlighted */}
              <button
                id="sidebar-feedback-btn"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10 group"
              >
                <div className="flex items-center gap-2.5 text-left min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">Feedback / Góp ý</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                  Góp ý
                </span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* User Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </>
  );
};
