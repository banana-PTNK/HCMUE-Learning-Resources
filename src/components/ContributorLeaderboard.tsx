import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  FileText,
  Upload,
  ShieldCheck,
  Crown,
  Layers,
  Send,
  User,
  Sparkles,
  ChevronRight,
  Info,
  GraduationCap
} from 'lucide-react';
import { Contributor } from '../types';
import { UserProfileModal } from './UserProfileModal';
import { matchesSearchQuery } from '../utils/studentIdUtils';
import { getRankLevel } from '../utils/rankingUtils';

export type TimeframeFilter = 'all' | 'semester' | 'month';

export interface LeaderboardProps {
  contributors: Contributor[];
  onSelectContributor?: (contributor: Contributor) => void;
  onScrollToForm?: () => void;
  onOpenContributeModal?: (tab?: 'submit' | 'lookup') => void;
  onOpenLookupModal?: (initialQuery?: string) => void;
}

export const ContributorLeaderboard: React.FC<LeaderboardProps> = ({
  contributors,
  onSelectContributor,
  onScrollToForm,
  onOpenContributeModal,
  onOpenLookupModal
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<Contributor | null>(null);

  const handleTriggerLookup = (query?: string) => {
    const q = (query !== undefined ? query : searchQuery).trim();
    if (onOpenLookupModal) {
      onOpenLookupModal(q);
    } else if (onOpenContributeModal) {
      onOpenContributeModal('lookup');
    } else if (onScrollToForm) {
      onScrollToForm();
    }
  };

  // Dynamic ranking calculation based on chosen timeframe & formula:
  // Tiêu chí 1: Tổng số files giảm dần (Total Files DESC)
  // Tiêu chí 2: Ai đạt mốc trước (lastUpdated ASC / rank ASC)
  const rankedContributors = useMemo(() => {
    let list = [...contributors];

    // Filter by search query (Name, MSSV, Class, or Specialty) with flexible formatting
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = list.filter((c) =>
        matchesSearchQuery(
          {
            name: c.name,
            studentId: c.studentId,
            className: c.className,
            email: c.email,
            specialty: c.specialty
          },
          q
        )
      );
    }

    // Metric extractor: Files count theo timeframe
    const getFiles = (c: Contributor) => {
      if (timeframe === 'month') {
        return c.monthlyFilesCount ?? Math.max(1, Math.round((c.filesCount || 1) * 0.25));
      }
      if (timeframe === 'semester') {
        return c.semesterFilesCount ?? Math.max(1, Math.round((c.filesCount || 1) * 0.5));
      }
      return c.filesCount || 0;
    };

    // Metric extractor: Lượt đóng góp theo timeframe
    const getEntries = (c: Contributor) => {
      if (timeframe === 'month') {
        return Math.max(1, Math.round((c.entriesCount || 1) * 0.25));
      }
      if (timeframe === 'semester') {
        return Math.max(1, Math.round((c.entriesCount || 1) * 0.5));
      }
      return c.entriesCount || 1;
    };

    // Quy tắc sắp xếp: ORDER BY total_files DESC, last_updated ASC
    list.sort((a, b) => {
      const filesA = getFiles(a);
      const filesB = getFiles(b);
      if (filesB !== filesA) {
        return filesB - filesA;
      }
      // Tiêu chí 2 (Phụ): ai đạt mốc trước xếp trên
      const timeA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : (a.rank || 999));
      const timeB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : (b.rank || 999));
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return (b.entriesCount || 0) - (a.entriesCount || 0);
    });

    // Gán dynamic ranks, cấp bậc level & metrics
    return list.map((item, index) => {
      const files = getFiles(item);
      const entries = getEntries(item);
      const rankLevel = getRankLevel(files);
      return {
        ...item,
        currentFiles: files,
        currentEntries: entries,
        rankLevel,
        dynamicRank: index + 1
      };
    });
  }, [contributors, timeframe, searchQuery]);

  // Split Top 3 and Remaining (Top 4+)
  const top1 = rankedContributors.length > 0 ? rankedContributors[0] : null;
  const top2 = rankedContributors.length > 1 ? rankedContributors[1] : null;
  const top3 = rankedContributors.length > 2 ? rankedContributors[2] : null;

  // When no search query is active, show Top 4+ in the list. If searching, show all matches.
  const tableContributors = searchQuery.trim()
    ? rankedContributors
    : rankedContributors.slice(3);

  const handleOpenDetail = (contributor: Contributor) => {
    setSelectedDetail(contributor);
    if (onSelectContributor) {
      onSelectContributor(contributor);
    }
  };

  const handleActionContribute = () => {
    if (onOpenContributeModal) {
      onOpenContributeModal();
    } else if (onScrollToForm) {
      onScrollToForm();
    }
  };

  return (
    <div className="space-y-7" id="contributor-leaderboard-section">
      {/* ========================================================================= */}
      {/* A. HEADER & BỘ LỌC THỜI GIAN & HỆ THỐNG 5 CẤP BẬC                        */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/80 dark:border-amber-500/30 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 uppercase font-mono tracking-wider shadow-2xs">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
              <span>BẢNG VINH DANH HỌC THUẬT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Bảng Xếp Hạng Đóng Góp Học Thuật
            </h2>
          </div>
        </div>

        {/* Filters & Unified Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          {/* Timeframe Filter: [ Toàn thời gian | Học kỳ này | Tháng này ] */}
          <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 text-sm font-semibold self-start sm:self-auto shrink-0">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm font-semibold ${
                timeframe === 'all'
                  ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Toàn thời gian
            </button>
            <button
              onClick={() => setTimeframe('semester')}
              className={`px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm font-semibold ${
                timeframe === 'semester'
                  ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Học kỳ này
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm font-semibold ${
                timeframe === 'month'
                  ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tháng này
            </button>
          </div>

          {/* Unified Search Box - Gọn gàng 1 thanh tìm kiếm duy nhất */}
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="leaderboard-search-input"
              type="text"
              placeholder="Tra cứu theo MSSV, Họ tên hoặc Lớp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* B. KHỐI TOP 3 (PODIUM CARDS)                                              */}
      {/* ========================================================================= */}
      {!searchQuery && rankedContributors.length >= 3 && (
        <div className="pt-8 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end max-w-5xl mx-auto">
            {/* Top 2 (Bên trái - Bạc) */}
            {top2 && (
              <div
                id="podium-rank-2"
                onClick={() => handleOpenDetail(top2)}
                className="order-2 md:order-1 rounded-3xl p-5 bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-[#131b2e] dark:to-[#0c1220] border-2 border-slate-300 dark:border-slate-700/80 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center relative group"
              >
                {/* Silver Badge */}
                <div className="absolute -top-4.5 w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-800 border-2 border-white dark:border-slate-600 text-slate-900 dark:text-white flex items-center justify-center font-black text-sm shadow-md font-mono">
                  🥈 #2
                </div>

                <div className="mt-3.5 relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 overflow-hidden flex items-center justify-center shadow-inner">
                    {top2.avatarUrl ? (
                      <img src={top2.avatarUrl} alt={top2.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{top2.name.charAt(0)}</span>
                    )}
                  </div>
                  {top2.verified && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-1.5">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {top2.name}
                  </h3>
                  
                  {/* Rank Level Tag & Class */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${top2.rankLevel.badgeBg}`}>
                      <span>{top2.rankLevel.displayText}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${
                      top2.className && top2.className.trim()
                        ? 'bg-blue-50/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                      <span>{top2.className && top2.className.trim() ? `Lớp ${top2.className.trim()}` : 'Không xác định'}</span>
                    </span>
                  </div>
                </div>

                {/* Metrics: Tổng số Files to đậm */}
                <div className="mt-4.5 w-full p-4 rounded-2xl bg-white/90 dark:bg-[#0a0f1d]/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-0.5">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl md:text-4xl font-black font-mono text-slate-800 dark:text-slate-200">
                      {top2.currentFiles}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1.5 font-sans">
                      files
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                    {top2.currentEntries} lượt đóng góp
                  </div>
                </div>
              </div>
            )}

            {/* Top 1 (Ở giữa - Vàng - Cao nhất & Nổi bật nhất) */}
            {top1 && (
              <div
                id="podium-rank-1"
                onClick={() => handleOpenDetail(top1)}
                className="order-1 md:order-2 rounded-3xl p-6 bg-gradient-to-b from-amber-50/95 via-amber-100/50 to-amber-50/95 dark:from-[#241c10] dark:via-[#1c1622] dark:to-[#0f172a] border-2 border-amber-400/95 dark:border-amber-500/90 shadow-xl shadow-amber-500/15 hover:shadow-amber-500/25 transition-all transform hover:-translate-y-1.5 cursor-pointer flex flex-col items-center text-center relative group md:-mt-6"
              >
                {/* Gold Crown & Badge */}
                <div className="absolute -top-8 flex flex-col items-center">
                  <span className="text-2xl drop-shadow-md animate-bounce">👑</span>
                  <div className="w-11 h-11 -mt-1 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-white dark:border-amber-300 flex items-center justify-center font-black text-base shadow-lg shadow-amber-500/30 font-mono">
                    #1
                  </div>
                </div>

                <div className="mt-6 relative">
                  <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-400/90 overflow-hidden flex items-center justify-center shadow-lg shadow-amber-500/20 ring-4 ring-amber-400/25">
                    {top1.avatarUrl ? (
                      <img src={top1.avatarUrl} alt={top1.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-amber-950 dark:text-amber-200">{top1.name.charAt(0)}</span>
                    )}
                  </div>
                  {top1.verified && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-1.5">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                    {top1.name}
                  </h3>

                  {/* Rank Level Tag & Class */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black border ${top1.rankLevel.badgeBg} shadow-xs`}>
                      <span>{top1.rankLevel.displayText}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border shadow-xs ${
                      top1.className && top1.className.trim()
                        ? 'text-amber-900 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-900/60 border-amber-300/80 dark:border-amber-700/70'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`}>
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                      <span>{top1.className && top1.className.trim() ? `Lớp ${top1.className.trim()}` : 'Không xác định'}</span>
                    </span>
                  </div>
                </div>

                {/* Metrics: Con số thành tích chính (Files) */}
                <div className="mt-4.5 w-full p-4 rounded-2xl bg-white/95 dark:bg-[#0a0f1d]/95 border border-amber-300/80 dark:border-amber-700/70 shadow-xs space-y-0.5">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl md:text-4xl font-black font-mono text-amber-500 dark:text-amber-400">
                      {top1.currentFiles}
                    </span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1.5 font-sans">
                      files
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-800/80 dark:text-amber-400/80 font-medium">
                    {top1.currentEntries} lượt đóng góp
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 (Bên phải - Đồng) */}
            {top3 && (
              <div
                id="podium-rank-3"
                onClick={() => handleOpenDetail(top3)}
                className="order-3 md:order-3 rounded-3xl p-5 bg-gradient-to-b from-amber-50/60 to-orange-100/70 dark:from-[#1d161a] dark:to-[#0f121d] border-2 border-amber-700/50 dark:border-amber-700/70 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center relative group"
              >
                {/* Bronze Badge */}
                <div className="absolute -top-4.5 w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-white border-2 border-white dark:border-amber-700 flex items-center justify-center font-black text-sm shadow-md font-mono">
                  🥉 #3
                </div>

                <div className="mt-3.5 relative">
                  <div className="w-16 h-16 rounded-2xl bg-amber-900/10 dark:bg-amber-950/50 border-2 border-amber-700/50 overflow-hidden flex items-center justify-center shadow-inner">
                    {top3.avatarUrl ? (
                      <img src={top3.avatarUrl} alt={top3.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-amber-900 dark:text-amber-200">{top3.name.charAt(0)}</span>
                    )}
                  </div>
                  {top3.verified && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-3.5 space-y-1.5">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {top3.name}
                  </h3>

                  {/* Rank Level Tag & Class */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${top3.rankLevel.badgeBg}`}>
                      <span>{top3.rankLevel.displayText}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${
                      top3.className && top3.className.trim()
                        ? 'text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`}>
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>{top3.className && top3.className.trim() ? `Lớp ${top3.className.trim()}` : 'Không xác định'}</span>
                    </span>
                  </div>
                </div>

                {/* Metrics: Files */}
                <div className="mt-4.5 w-full p-4 rounded-2xl bg-white/90 dark:bg-[#0a0f1d]/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-0.5">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl md:text-4xl font-black font-mono text-amber-700 dark:text-amber-400">
                      {top3.currentFiles}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1.5 font-sans">
                      files
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                    {top3.currentEntries} lượt đóng góp
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* C. BẢNG DANH SÁCH CHI TIẾT (DẠNG THẺ CARD RỜI)                             */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {tableContributors.length === 0 ? (
          <div className="p-12 text-center space-y-2 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800/90 shadow-sm">
            <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-base font-bold text-slate-700 dark:text-slate-300">
              Không tìm thấy sinh viên phù hợp
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-400">
              Thử tìm kiếm với Họ tên, Lớp hoặc từ khóa khác
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tableContributors.map((c) => {
              const rankNumber = c.dynamicRank;
              const rankLevel = c.rankLevel;
              return (
                <div
                  key={c.id}
                  id={`contributor-row-${c.id}`}
                  onClick={() => handleOpenDetail(c)}
                  className="py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#13192b] border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/60 dark:hover:border-indigo-500/50 hover:bg-slate-50/70 dark:hover:bg-[#182038] shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 sm:gap-4 group"
                >
                  {/* Left: Khối vuông Hạng + Avatar/Monogram + Tên + Lớp + Level */}
                  <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
                    {/* Cột Hạng: Khối vuông bo góc rõ ràng */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-[#1d253f] border border-slate-200 dark:border-slate-700/70 text-center flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 transition-all duration-200">
                      <span className="text-base sm:text-lg font-mono font-black text-slate-700 dark:text-slate-200 group-hover:text-white">
                        {rankNumber}
                      </span>
                    </div>

                    {/* Avatar hoặc Monogram chữ cái */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 shrink-0 overflow-hidden flex items-center justify-center shadow-2xs">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-300">
                          {c.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Tên sinh viên + Cấp bậc + Lớp */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {c.name}
                        </span>

                        {/* Rank Level Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-2xs ${rankLevel.badgeBg}`}>
                          <span>{rankLevel.displayText}</span>
                        </span>

                        {/* Lớp hiển thị nổi bật bên phải mục level */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-2xs ${
                          c.className && c.className.trim()
                            ? 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          <GraduationCap className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                          <span>{c.className && c.className.trim() ? `Lớp ${c.className.trim()}` : 'Không xác định'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Cụm thông số phẳng tinh giản (Lượt & Files) */}
                  <div className="flex items-center gap-4 sm:gap-10 shrink-0 pr-1">
                    <div className="flex items-center gap-4 sm:gap-10 text-center">
                      {/* Cột 1: Lượt gửi (Entries) */}
                      <div className="w-14 sm:w-18 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black font-mono text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {c.currentEntries}
                        </div>
                        <div className="text-xs font-medium text-slate-400 dark:text-slate-400">
                          Lượt
                        </div>
                      </div>

                      {/* Cột 2: Số tệp (Files) */}
                      <div className="w-14 sm:w-18 space-y-0.5">
                        <div className="text-lg sm:text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                          {c.currentFiles}
                        </div>
                        <div className="text-xs font-bold text-indigo-500 dark:text-indigo-400">
                          Files
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all hidden sm:block shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile Detail Modal */}
      <UserProfileModal
        contributor={selectedDetail}
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        onOpenContributeModal={handleActionContribute}
      />
    </div>
  );
};

