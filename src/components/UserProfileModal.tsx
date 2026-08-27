import React from 'react';
import {
  X,
  ShieldCheck,
  Medal,
  FileText,
  Layers,
  Clock,
  CheckCircle2,
  Trophy,
  Sparkles,
  FileCheck,
  ChevronRight,
  Crown
} from 'lucide-react';
import { Contributor } from '../types';
import { getRankLevel } from '../utils/rankingUtils';

interface UserProfileModalProps {
  contributor: Contributor | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenContributeModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  contributor,
  isOpen,
  onClose
}) => {
  if (!isOpen || !contributor) return null;

  const totalFiles = contributor.filesCount || 0;
  const totalEntries = contributor.entriesCount || 1;
  const rank = contributor.rank;
  const rankLevel = getRankLevel(totalFiles);

  // Calculate level progress
  const prevLevelFiles = rankLevel.minFiles;
  const nextLevelFiles = rankLevel.nextLevelFiles;
  let progressPercent = 100;
  let filesNeeded = 0;

  if (nextLevelFiles) {
    const range = nextLevelFiles - prevLevelFiles;
    const currentInRange = totalFiles - prevLevelFiles;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
    filesNeeded = Math.max(0, nextLevelFiles - totalFiles);
  }

  // Rank-based color schemes for header
  const getRankHeaderGradient = () => {
    if (rankLevel.level === 5) return 'from-amber-600 via-amber-700 to-yellow-800 border-b-2 border-amber-400/50';
    if (rankLevel.level === 4) return 'from-cyan-700 via-blue-800 to-indigo-950 border-b-2 border-cyan-400/50';
    if (rankLevel.level === 3) return 'from-yellow-600 via-amber-700 to-amber-900 border-b-2 border-yellow-400/40';
    if (rankLevel.level === 2) return 'from-slate-600 via-slate-700 to-indigo-900 border-b-2 border-slate-400/40';
    return 'from-amber-800 via-orange-900 to-slate-900 border-b-2 border-amber-700/40';
  };

  return (
    <div
      id="user-profile-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="user-profile-modal-card"
        className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 bg-gradient-to-br ${getRankHeaderGradient()} text-white relative shrink-0 shadow-sm`}>
          {/* Nút đóng */}
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-all cursor-pointer"
            title="Đóng hồ sơ"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar & Rank Pill */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-extrabold backdrop-blur-md shadow-lg">
                {contributor.avatarUrl ? (
                  <img src={contributor.avatarUrl} alt={contributor.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white drop-shadow-sm">{contributor.name.charAt(0)}</span>
                )}
              </div>
              
              {/* Huy hiệu Hạng */}
              <div className="absolute -bottom-2 -right-1.5 px-2 py-0.5 rounded-lg bg-white text-slate-950 font-black text-xs flex items-center gap-1 shadow-md font-mono">
                <span>#{rank || 1}</span>
              </div>
            </div>

            {/* Thông tin định danh */}
            <div className="space-y-1.5 min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate drop-shadow-xs">
                  {contributor.name}
                </h3>
                {contributor.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/50 text-emerald-100 text-[10px] sm:text-[11px] font-bold shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>Đã xác minh</span>
                  </span>
                )}
              </div>

              {/* Lớp & Cấp bậc Level */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="bg-white/20 border border-white/25 px-2.5 py-0.5 rounded-md font-semibold text-white/95 backdrop-blur-xs">
                  {contributor.className ? `Lớp ${contributor.className}` : 'Khoa CNTT'}
                </span>
                
                {/* Badge Rank phẳng gọn gàng (không có tiền tố Level X) */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/25 border border-white/35 text-white font-bold text-[11px] shadow-2xs backdrop-blur-xs">
                  <span>{rankLevel.displayText || `${rankLevel.icon} ${rankLevel.rank}`}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body: max-h scrollable, không bị nút Đóng che */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-[#0b1120]">
          {/* Level Progress Bar (Tiến trình thăng hạng theo số file) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131d35] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>{rankLevel.icon} {rankLevel.rank} ({rankLevel.tier})</span>
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {totalFiles} files
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              {nextLevelFiles ? (
                <span>
                  Cần thêm <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{filesNeeded} files</strong> để lên cấp tiếp theo
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  Đã đạt Cấp Bậc Tối Cao (Huyền Thoại)
                </span>
              )}
              <span>{progressPercent}%</span>
            </div>
          </div>

          {/* Thống kê nổi bật: 2 Thẻ đối chiếu trực quan */}
          <div className="grid grid-cols-2 gap-3.5 text-center">
            {/* Thống kê 1: Số lượt gửi (Sắc xanh dương / Blue) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131d35] border-2 border-blue-200 dark:border-blue-800/70 shadow-xs flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                {totalEntries}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 uppercase tracking-wider">
                Số lượt gửi
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                lần đóng góp
              </div>
            </div>

            {/* Thống kê 2: Tổng số Files (Sắc xanh lá / Emerald) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131d35] border-2 border-emerald-200 dark:border-emerald-800/70 shadow-xs flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {totalFiles}
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 uppercase tracking-wider">
                Tổng số files
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                tập tin chia sẻ
              </div>
            </div>
          </div>

          {/* Thẻ: Tài liệu tải lên gần đây nhất (Sắc tím hoàng gia / Indigo-Violet) */}
          <div className="p-4.5 rounded-2xl bg-white dark:bg-[#131d35] border-2 border-indigo-100 dark:border-indigo-900/60 shadow-xs space-y-2">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Tài liệu tải lên gần đây nhất</span>
            </div>
            
            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/50 flex items-start gap-2.5">
              <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug break-words">
                  {contributor.recentUpload || 'Tài liệu học tập, Đề thi & Bài giảng FIT'}
                </p>
                <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                  Đã duyệt & hiển thị trên hệ thống
                </span>
              </div>
            </div>
          </div>

          {/* Thẻ: Dòng chứng nhận học thuật (Sắc Vàng - Ngọc / Gold & Emerald Luxury) */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-amber-50 via-emerald-50/50 to-teal-50 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-2 border-amber-300/80 dark:border-amber-500/40 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Medal className="w-6 h-6" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-extrabold text-xs sm:text-sm text-amber-950 dark:text-amber-300 flex items-center gap-1.5 flex-wrap">
                <span>Chứng nhận đóng góp học thuật FIT HCMUE</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Tài liệu đóng góp đã được Admin xác thực, lưu trữ công khai và phục vụ miễn phí cho cộng đồng sinh viên khoa CNTT.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
          <button
            id="close-modal-bottom-btn"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};


