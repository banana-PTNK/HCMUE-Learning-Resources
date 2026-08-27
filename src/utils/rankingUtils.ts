export interface RankLevelInfo {
  level: number;
  rank: string;
  icon: string;
  tier: string;
  minFiles: number;
  maxFiles?: number;
  badgeColor: string;
  badgeBg: string;
  borderClass: string;
  displayText: string;
  nextLevelFiles?: number;
}

/**
 * 5 Cấp Bậc Ranking theo số lượng file:
 * Level 1: Tân Binh (Đồng) - < 30 files
 * Level 2: Tập Sự (Bạc) - 30 <= x < 70 files
 * Level 3: Chiến Binh (Vàng) - 70 <= x < 100 files
 * Level 4: Cao Thủ (Bạch Kim) - 100 <= x < 200 files
 * Level 5: Huyền Thoại (Kim Cương) - >= 200 files
 */
export function getRankLevel(totalFiles: number): RankLevelInfo {
  const safeFiles = Math.max(0, Math.round(Number(totalFiles) || 0));

  if (safeFiles >= 200) {
    return {
      level: 5,
      rank: 'Huyền Thoại',
      icon: '👑',
      tier: 'Kim Cương',
      minFiles: 200,
      badgeColor: 'text-amber-400 font-bold',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40',
      borderClass: 'border-amber-400',
      displayText: '👑 Huyền Thoại'
    };
  }

  if (safeFiles >= 100) {
    return {
      level: 4,
      rank: 'Cao Thủ',
      icon: '💎',
      tier: 'Bạch Kim',
      minFiles: 100,
      maxFiles: 199,
      nextLevelFiles: 200,
      badgeColor: 'text-cyan-400 font-bold',
      badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
      borderClass: 'border-cyan-400',
      displayText: '💎 Cao Thủ'
    };
  }

  if (safeFiles >= 70) {
    return {
      level: 3,
      rank: 'Chiến Binh',
      icon: '🥇',
      tier: 'Vàng',
      minFiles: 70,
      maxFiles: 99,
      nextLevelFiles: 100,
      badgeColor: 'text-yellow-500 font-bold',
      badgeBg: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/40',
      borderClass: 'border-yellow-400',
      displayText: '🥇 Chiến Binh'
    };
  }

  if (safeFiles >= 30) {
    return {
      level: 2,
      rank: 'Tập Sự',
      icon: '🥈',
      tier: 'Bạc',
      minFiles: 30,
      maxFiles: 69,
      nextLevelFiles: 70,
      badgeColor: 'text-slate-300 font-semibold',
      badgeBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
      borderClass: 'border-slate-400',
      displayText: '🥈 Tập Sự'
    };
  }

  return {
    level: 1,
    rank: 'Tân Binh',
    icon: '🥉',
    tier: 'Đồng',
    minFiles: 0,
    maxFiles: 29,
    nextLevelFiles: 30,
    badgeColor: 'text-amber-700 font-medium',
    badgeBg: 'bg-amber-700/15 text-amber-800 dark:text-amber-400 border-amber-600/30 dark:border-amber-700/40',
    borderClass: 'border-amber-600',
    displayText: '🥉 Tân Binh'
  };
}

export const RANK_LEVELS_METADATA = [
  { level: 1, rank: 'Tân Binh', tier: 'Đồng', icon: '🥉', range: '< 30 files', minFiles: 0, color: 'from-amber-600 to-amber-800' },
  { level: 2, rank: 'Tập Sự', tier: 'Bạc', icon: '🥈', range: '30 – 69 files', minFiles: 30, color: 'from-slate-400 to-slate-600' },
  { level: 3, rank: 'Chiến Binh', tier: 'Vàng', icon: '🥇', range: '70 – 99 files', minFiles: 70, color: 'from-yellow-500 to-amber-600' },
  { level: 4, rank: 'Cao Thủ', tier: 'Bạch Kim', icon: '💎', range: '100 – 199 files', minFiles: 100, color: 'from-cyan-500 to-blue-600' },
  { level: 5, rank: 'Huyền Thoại', tier: 'Kim Cương', icon: '👑', range: '≥ 200 files', minFiles: 200, color: 'from-amber-400 to-yellow-500' }
];
