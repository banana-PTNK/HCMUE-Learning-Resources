import React from 'react';
import { X, Keyboard, ArrowRight, BookOpen, Calendar, Bot, Upload, Bell, Search, CornerDownLeft } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Điều hướng nhanh (Navigation)',
      items: [
        {
          key: 'G',
          label: 'Tổng quan Môn học',
          desc: 'Chuyển đến danh mục tài liệu & cấu trúc môn học',
          path: '/category/foundation',
          icon: BookOpen
        },
        {
          key: 'S',
          label: 'Trợ lý Xếp Thời khóa biểu',
          desc: 'Quét ảnh TKB và đồng bộ Google Calendar',
          path: '/ai-schedule',
          icon: Calendar
        },
        {
          key: 'A',
          label: 'Trợ lý Code & Thuật toán',
          desc: 'Phân tích Big-O, Dry Run và tối ưu mã nguồn',
          path: '/ai-assistant',
          icon: Bot
        },
        {
          key: 'C',
          label: 'Đóng góp tài liệu',
          desc: 'Gửi đề thi, slide bài giảng & đề cương',
          path: '/contribute',
          icon: Upload
        },
        {
          key: 'N',
          label: 'Thông báo Khoa',
          desc: 'Xem lịch thi, cập nhật và thông báo mới',
          path: '/announcements',
          icon: Bell
        }
      ]
    },
    {
      title: 'Thao tác & Hộp thoại (Global Actions)',
      items: [
        {
          key: 'Ctrl + K / ⌘K',
          label: 'Tìm kiếm toàn cục (Command Palette)',
          desc: 'Tìm nhanh mã môn học, công cụ và tài liệu',
          action: 'search',
          icon: Search
        },
        {
          key: 'Ctrl + B / ⌘B',
          label: 'Ẩn / Hiện thanh điều hướng (Sidebar)',
          desc: 'Thu gọn hoặc mở rộng danh mục môn học bên trái',
          action: 'sidebar',
          icon: Keyboard
        },
        {
          key: '?',
          label: 'Mở Bảng phím tắt này',
          desc: 'Hiển thị danh sách các phím tắt hệ thống',
          action: 'shortcuts',
          icon: Keyboard
        },
        {
          key: 'Esc',
          label: 'Đóng Modal / Hộp thoại',
          desc: 'Đóng ngay cửa sổ tìm kiếm, thông báo hoặc biểu mẫu đang mở',
          action: 'close',
          icon: CornerDownLeft
        }
      ]
    }
  ];

  const handleItemClick = (item: { path?: string; action?: string }) => {
    if (item.path && typeof onNavigate === 'function') {
      onNavigate(item.path);
      onClose();
    }
  };

  return (
    <div
      id="keyboard-shortcuts-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-modal"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Bảng Phím Tắt Hệ Thống</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Thao tác nhanh không cần chuột trên StudyVault</p>
            </div>
          </div>
          <button
            id="close-shortcuts-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={iIdx}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3 ${
                        item.path ? 'hover:border-blue-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60 cursor-pointer transition-colors' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.desc}</div>
                        </div>
                      </div>
                      <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 shadow-xs">
                        {item.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">Esc</kbd> bất kỳ lúc nào để thoát</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
