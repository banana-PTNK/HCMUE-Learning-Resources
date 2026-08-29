import { MasterCourseSection, ScheduleConstraints, TimetableSolution } from '../types';
import { extractBaseCourseCode } from './scheduleParser';

export const COURSE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16'  // lime
];

/**
 * Period classification helpers:
 * - Morning (Ca Sáng): Periods 1 to 6 (06:30 - 12:00)
 * - Afternoon (Ca Chiều): Periods 7 to 12 (12:30 - 17:50)
 * - Evening (Ca Tối): Periods 13 to 15 (18:00 - 20:30)
 */
export function isMorningPeriod(period: number): boolean {
  return period >= 1 && period <= 6;
}

export function isAfternoonPeriod(period: number): boolean {
  return period >= 7 && period <= 12;
}

export function getSectionShift(sec: MasterCourseSection): 'morning' | 'afternoon' | 'evening' | 'mixed' | 'vle' {
  if (!sec || isVLESection(sec)) return 'vle';
  const start = Number(sec.startPeriod);
  const end = Number(sec.endPeriod);
  if (end <= 6) return 'morning';
  if (start >= 7 && end <= 12) return 'afternoon';
  if (start >= 13) return 'evening';
  return 'mixed';
}

/**
 * Detects if a section or class session is a VLE (Virtual Learning Environment / Online) session.
 * VLE/Online sessions do not require fixed physical classroom slots and bypass physical clash checks.
 */
export function isVLESection(sec: MasterCourseSection): boolean {
  if (!sec) return false;
  if (sec.isOnline) return true;
  const room = (sec.room || '').toUpperCase();
  const type = (sec.classType || '').toUpperCase();
  const group = (sec.group || '').toUpperCase();
  const code = (sec.classCode || '').toUpperCase();
  const name = (sec.courseName || '').toUpperCase();
  return (
    room.includes('VLE') ||
    room.includes('ONLINE') ||
    room.includes('TRỰC TUYẾN') ||
    room.includes('TRUC TUYEN') ||
    room.includes('ZOOM') ||
    room.includes('TEAMS') ||
    room.includes('MEET') ||
    type.includes('VLE') ||
    type.includes('ONLINE') ||
    group.includes('VLE') ||
    group.includes('ONLINE') ||
    code.includes('VLE') ||
    code.includes('ONLINE') ||
    name.includes('VLE') ||
    name.includes('ONLINE')
  );
}

/**
 * Checks if two individual course section sessions have a time clash.
 * Multi-session courses (e.g., Theory on Morning Mon + Lab on Afternoon Thu) are split into individual time slots
 * and verified per individual slot rather than grouping entire course days into monolithic blocks.
 * Online / VLE sessions bypass physical room and time clash checks.
 */
export function hasTimeClash(a: MasterCourseSection, b: MasterCourseSection): boolean {
  if (!a || !b) return false;
  if (isVLESection(a) || isVLESection(b)) return false;
  
  const dayA = Number(a.dayOfWeek);
  const dayB = Number(b.dayOfWeek);
  if (dayA !== dayB) return false;

  const startA = Number(a.startPeriod);
  const endA = Number(a.endPeriod);
  const startB = Number(b.startPeriod);
  const endB = Number(b.endPeriod);

  if (isNaN(startA) || isNaN(endA) || isNaN(startB) || isNaN(endB)) return false;

  // Exact period overlap check:
  // Clash occurs if and only if period intervals overlap: max(startA, startB) <= min(endA, endB)
  return Math.max(startA, startB) <= Math.min(endA, endB);
}

/**
 * Finds all clashes in a given list of course sections.
 * Returns a list of clashing pairs.
 */
export function findClashes(sections: MasterCourseSection[]): { a: MasterCourseSection; b: MasterCourseSection }[] {
  const clashes: { a: MasterCourseSection; b: MasterCourseSection }[] = [];
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (hasTimeClash(sections[i], sections[j])) {
        clashes.push({ a: sections[i], b: sections[j] });
      }
    }
  }
  return clashes;
}

/**
 * Generates a canonical fingerprint string representing a timetable combination.
 * Two schedules with the exact same course codes, class codes, and time slots will have the exact same fingerprint.
 */
export function getScheduleFingerprint(sections: MasterCourseSection[]): string {
  return sections
    .map((s) => `${(s.courseCode || extractBaseCourseCode(s.classCode)).trim().toUpperCase()}:::${(s.classCode || '').trim().toUpperCase()}:::${s.dayOfWeek}:::${s.startPeriod}-${s.endPeriod}`)
    .sort()
    .join('|||');
}

/**
 * Generates a time-and-course fingerprint to detect visually and structurally identical schedules
 * (e.g. same subjects on same days at same periods).
 */
export function getTimeAndCourseFingerprint(sections: MasterCourseSection[]): string {
  return sections
    .map((s) => {
      const baseCode = (s.courseCode || extractBaseCourseCode(s.classCode) || s.classCode || '').trim().toUpperCase();
      const lecturer = (s.lecturer || '').trim().toUpperCase();
      return `${baseCode}@D${s.dayOfWeek}:P${s.startPeriod}-${s.endPeriod}:${lecturer}`;
    })
    .sort()
    .join('|');
}

/**
 * Groups master catalog sections by course code, and generates valid section-bundles
 * (e.g. 1 LT class option + 1 TH class option if both exist, supporting multiple weekly sessions per class).
 * Strictly deduplicates identical bundles.
 */
export function generateCourseOptionBundles(
  courseCode: string,
  catalog: MasterCourseSection[]
): MasterCourseSection[][] {
  const sections = catalog.filter(
    (s) =>
      (s.courseCode && s.courseCode.trim().toUpperCase() === courseCode.trim().toUpperCase()) ||
      extractBaseCourseCode(s.classCode).toUpperCase() === courseCode.trim().toUpperCase()
  );
  if (sections.length === 0) return [];

  // Group sections strictly by classCode or fallback key
  const bundlesMap = new Map<string, MasterCourseSection[]>();

  for (const s of sections) {
    const key = (s.classCode || `${s.courseCode || extractBaseCourseCode(s.classCode)}_${s.group || s.classType || ''}`).trim();
    if (!bundlesMap.has(key)) {
      bundlesMap.set(key, []);
    }
    bundlesMap.get(key)!.push(s);
  }

  const rawBundles = Array.from(bundlesMap.values());

  // Helper: Check if all sessions inside a single bundle clash with each other
  const hasInternalClash = (list: MasterCourseSection[]): boolean => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (hasTimeClash(list[i], list[j])) return true;
      }
    }
    return false;
  };

  const validBundles = rawBundles.filter((b) => !hasInternalClash(b));

  // Fallback: If all bundles have internal clashes, return them individually
  if (validBundles.length === 0) {
    return sections.map((s) => [s]);
  }

  // Deduplicate bundles that have identical schedules
  const seenBundleFingerprints = new Set<string>();
  const uniqueBundles: MasterCourseSection[][] = [];
  for (const b of validBundles) {
    const fp = getScheduleFingerprint(b);
    if (!seenBundleFingerprints.has(fp)) {
      seenBundleFingerprints.add(fp);
      uniqueBundles.push(b);
    }
  }

  return uniqueBundles;
}

export const DEFAULT_SCHEDULE_CONSTRAINTS: ScheduleConstraints = {
  avoidSaturday: false,
  avoidSunday: true,
  avoidEarlyMorning: false,
  avoidLateAfternoon: false,
  freeFridayAfternoon: false,
  compactDays: false,
  preferredShift: 'all',
  preferredPeriod: 'all',
  avoidSplitDays: false,
};

/**
 * Computes a preference and quality score for a candidate schedule.
 * Fully supports full-day schedules (both Morning and Afternoon) and handles shift preferences accurately.
 */
export function evaluateScheduleScore(
  sections: MasterCourseSection[],
  constraintsInput: Partial<ScheduleConstraints> = {}
): { score: number; tags: string[]; clashCount: number; activeDays: number[] } {
  const constraints: ScheduleConstraints = {
    ...DEFAULT_SCHEDULE_CONSTRAINTS,
    ...constraintsInput,
  };
  let score = 100;
  const tags: string[] = [];
  const activeDaysSet = new Set<number>();
  let hasSaturday = false;
  let hasSunday = false;
  let earlyMorningCount = 0;
  let lateAfternoonCount = 0;
  let fridayAfternoonCount = 0;
  let morningCount = 0;
  let afternoonCount = 0;

  // Track morning/afternoon per day to evaluate split-day preference
  const dayPeriodsMap = new Map<number, { hasMorning: boolean; hasAfternoon: boolean }>();

  for (const s of sections) {
    if (isVLESection(s)) continue;

    const day = Number(s.dayOfWeek);
    activeDaysSet.add(day);

    if (day === 7) hasSaturday = true;
    if (day === 8) hasSunday = true;

    if (s.startPeriod === 1) earlyMorningCount++;
    if (s.endPeriod >= 10) lateAfternoonCount++;
    if (day === 6 && s.startPeriod >= 7) fridayAfternoonCount++;

    const isMorning = s.startPeriod <= 6;
    const isAfternoon = s.startPeriod >= 7 || s.endPeriod >= 7;

    if (isMorning) morningCount++;
    if (isAfternoon) afternoonCount++;

    if (!dayPeriodsMap.has(day)) {
      dayPeriodsMap.set(day, { hasMorning: false, hasAfternoon: false });
    }
    const dayInfo = dayPeriodsMap.get(day)!;
    if (isMorning) dayInfo.hasMorning = true;
    if (isAfternoon) dayInfo.hasAfternoon = true;

    // Preferred lecturer bonus
    const sCourseCode = (s.courseCode || extractBaseCourseCode(s.classCode)).trim().toUpperCase();
    if (constraints.preferredLecturers && (constraints.preferredLecturers[s.courseCode] || constraints.preferredLecturers[sCourseCode])) {
      const pref = (constraints.preferredLecturers[s.courseCode] || constraints.preferredLecturers[sCourseCode]).toLowerCase();
      if (s.lecturer && s.lecturer.toLowerCase().includes(pref)) {
        score += 15;
      }
    }
  }

  const activeDays = Array.from(activeDaysSet).sort((a, b) => a - b);
  const clashes = findClashes(sections);
  const clashCount = clashes.length;

  // Massive penalty for hard clashes
  score -= clashCount * 500;

  // Study Shift Preference (preferredShift / preferredPeriod)
  const shiftPref = constraints.preferredShift || constraints.preferredPeriod || 'all';

  if (shiftPref === 'morning') {
    if (afternoonCount === 0 && morningCount > 0) {
      score += 120;
      tags.push('100% Ca Sáng (T1-6)');
    } else {
      score += morningCount * 20;
      score -= afternoonCount * 60;
      if (morningCount > afternoonCount) {
        tags.push('Chủ yếu Ca Sáng');
      }
    }
  } else if (shiftPref === 'afternoon') {
    if (morningCount === 0 && afternoonCount > 0) {
      score += 120;
      tags.push('100% Ca Chiều (T7-12)');
    } else {
      score += afternoonCount * 20;
      score -= morningCount * 60;
      if (afternoonCount > morningCount) {
        tags.push('Chủ yếu Ca Chiều');
      }
    }
  } else {
    // 'all' | 'flexible': Full-day scheduling is explicitly welcomed and prioritized
    if (morningCount > 0 && afternoonCount > 0) {
      const balanceRatio = Math.min(morningCount, afternoonCount) / Math.max(morningCount, afternoonCount || 1);
      score += 90 + Math.round(balanceRatio * 40);
      tags.push('Phân bổ Sáng & Chiều');
    } else if (morningCount > 0) {
      score += 15;
      tags.push('Tập trung Ca Sáng');
    } else if (afternoonCount > 0) {
      score += 15;
      tags.push('Tập trung Ca Chiều');
    }
  }

  // Constraint penalties & bonuses
  if (constraints.avoidSaturday) {
    if (hasSaturday) {
      score -= 30;
    } else {
      score += 20;
      tags.push('Nghỉ Thứ 7');
    }
  }

  if (constraints.avoidSunday) {
    if (hasSunday) {
      score -= 40;
    } else {
      score += 10;
      tags.push('Nghỉ Chủ Nhật');
    }
  }

  if (constraints.avoidEarlyMorning && shiftPref !== 'afternoon') {
    if (earlyMorningCount > 0) {
      score -= earlyMorningCount * 15;
    } else {
      score += 15;
      tags.push('Không tiết 1 (7h sáng)');
    }
  }

  if (constraints.avoidLateAfternoon && shiftPref !== 'morning') {
    if (lateAfternoonCount > 0) {
      score -= lateAfternoonCount * 15;
    } else {
      score += 10;
      tags.push('Không học muộn');
    }
  }

  if (constraints.freeFridayAfternoon && shiftPref !== 'afternoon') {
    if (fridayAfternoonCount > 0) {
      score -= 25;
    } else {
      score += 15;
      tags.push('Trống chiều Thứ 6');
    }
  }

  if (constraints.compactDays) {
    // Reward fewer days: 2-3 days is ideal, 4 days good, 5-6 days less compact
    const daysCount = activeDays.length;
    if (daysCount <= 3) {
      score += 30;
      tags.push(`Gom gọn ${daysCount} ngày/tuần`);
    } else if (daysCount === 4) {
      score += 15;
      tags.push('Học 4 ngày/tuần');
    } else {
      score -= (daysCount - 4) * 8;
    }
  }

  // Soft preference: Avoid split days (both morning and afternoon on the same day)
  let splitDaysCount = 0;
  dayPeriodsMap.forEach((info) => {
    if (info.hasMorning && info.hasAfternoon) {
      splitDaysCount++;
    }
  });

  if (constraints.avoidSplitDays) {
    if (splitDaysCount === 0) {
      score += 20;
      tags.push('Không xé lẻ ca trong ngày');
    } else {
      score -= splitDaysCount * 15;
    }
  }

  if (clashCount === 0 && !tags.includes('100% Không trùng lịch')) {
    tags.unshift('100% Không trùng lịch');
  }

  return { score, tags, clashCount, activeDays };
}

/**
 * Solves the Constraint Satisfaction Problem (CSP) using Backtracking Search
 * with Minimum Remaining Values (MRV) heuristic, domain pruning, and multi-objective ranking.
 * Guarantees high-quality, diverse scheduling options for both full-day and shift-specific preferences.
 */
export function solveTimetableCSP(
  catalog: MasterCourseSection[],
  selectedCourseCodes: string[],
  constraintsInput: Partial<ScheduleConstraints> = {},
  maxSolutions = 10
): TimetableSolution[] {
  if (selectedCourseCodes.length === 0) return [];

  const constraints: ScheduleConstraints = {
    ...DEFAULT_SCHEDULE_CONSTRAINTS,
    ...constraintsInput,
  };

  // 1. Assign consistent colors to courses
  const courseColorMap = new Map<string, string>();
  selectedCourseCodes.forEach((code, idx) => {
    courseColorMap.set(code, COURSE_COLORS[idx % COURSE_COLORS.length]);
  });

  const shiftPref = constraints.preferredShift || constraints.preferredPeriod || 'all';

  // 2. Generate bundles for each course and pre-sort/interleave bundles according to shift preference
  const rawSubjectBundles: { courseCode: string; bundles: MasterCourseSection[][] }[] = [];
  selectedCourseCodes.forEach((code, codeIdx) => {
    const bundles = generateCourseOptionBundles(code, catalog);
    if (bundles.length > 0) {
      const color = courseColorMap.get(code) || '#3b82f6';
      let coloredBundles = bundles.map((b) =>
        b.map((s) => ({
          ...s,
          color,
          id: s.id || `sec-${s.classCode}-${s.dayOfWeek}-${s.startPeriod}`
        }))
      );

      // Pre-sort / Interleave bundles so the user's preferred shift is explored effectively by CSP backtracking
      if (shiftPref === 'afternoon') {
        coloredBundles.sort((bundleA, bundleB) => {
          const getAfternoonScore = (bundle: MasterCourseSection[]): number => {
            let bMorning = 0;
            let bAfternoon = 0;
            for (const s of bundle) {
              if (isVLESection(s)) continue;
              if (s.startPeriod <= 6) bMorning++;
              if (s.startPeriod >= 7 || s.endPeriod >= 7) bAfternoon++;
            }
            if (bMorning === 0 && bAfternoon > 0) return 100;
            return bAfternoon * 10 - bMorning * 20;
          };
          return getAfternoonScore(bundleB) - getAfternoonScore(bundleA);
        });
      } else if (shiftPref === 'morning') {
        coloredBundles.sort((bundleA, bundleB) => {
          const getMorningScore = (bundle: MasterCourseSection[]): number => {
            let bMorning = 0;
            let bAfternoon = 0;
            for (const s of bundle) {
              if (isVLESection(s)) continue;
              if (s.startPeriod <= 6) bMorning++;
              if (s.startPeriod >= 7 || s.endPeriod >= 7) bAfternoon++;
            }
            if (bAfternoon === 0 && bMorning > 0) return 100;
            return bMorning * 10 - bAfternoon * 20;
          };
          return getMorningScore(bundleB) - getMorningScore(bundleA);
        });
      } else {
        // 'all' / 'flexible': Intelligently interleave Morning and Afternoon bundles across courses
        // This avoids catalog bias where Lớp 01 (Morning) is always evaluated first for every course
        const morningBundles: typeof coloredBundles = [];
        const afternoonBundles: typeof coloredBundles = [];
        const mixedBundles: typeof coloredBundles = [];

        for (const b of coloredBundles) {
          let m = 0;
          let a = 0;
          for (const s of b) {
            if (isVLESection(s)) continue;
            if (s.startPeriod <= 6) m++;
            if (s.startPeriod >= 7 || s.endPeriod >= 7) a++;
          }
          if (m > 0 && a > 0) mixedBundles.push(b);
          else if (a > 0) afternoonBundles.push(b);
          else morningBundles.push(b);
        }

        const interleaved: typeof coloredBundles = [...mixedBundles];
        const maxLen = Math.max(morningBundles.length, afternoonBundles.length);
        for (let i = 0; i < maxLen; i++) {
          if (codeIdx % 2 === 0) {
            if (i < afternoonBundles.length) interleaved.push(afternoonBundles[i]);
            if (i < morningBundles.length) interleaved.push(morningBundles[i]);
          } else {
            if (i < morningBundles.length) interleaved.push(morningBundles[i]);
            if (i < afternoonBundles.length) interleaved.push(afternoonBundles[i]);
          }
        }
        if (interleaved.length > 0) {
          coloredBundles = interleaved;
        }
      }

      rawSubjectBundles.push({ courseCode: code, bundles: coloredBundles });
    }
  });

  if (rawSubjectBundles.length === 0) return [];

  // 3. Apply MRV (Minimum Remaining Values) heuristic:
  // Sort courses so those with fewer options are scheduled first to prune search space early
  const subjectBundles = [...rawSubjectBundles].sort(
    (a, b) => a.bundles.length - b.bundles.length
  );

  // Helper to test if a candidate bundle clashes with any already scheduled section
  const bundleClashesWithExisting = (bundle: MasterCourseSection[], current: MasterCourseSection[]): boolean => {
    for (const newSec of bundle) {
      for (const existSec of current) {
        if (hasTimeClash(newSec, existSec)) return true;
      }
    }
    return false;
  };

  const foundSolutions: {
    sections: MasterCourseSection[];
    score: number;
    tags: string[];
    clashCount: number;
    activeDays: number[];
    signature: string;
  }[] = [];

  const seenSignatures = new Set<string>();
  const MAX_EXPLORED_SOLUTIONS = 3000;

  // 4. Backtracking Search with Branch & Bound
  function backtrack(courseIdx: number, currentSections: MasterCourseSection[]) {
    if (foundSolutions.length >= MAX_EXPLORED_SOLUTIONS) return;

    // All courses scheduled
    if (courseIdx === subjectBundles.length) {
      const evalResult = evaluateScheduleScore(currentSections, constraints);
      if (evalResult.clashCount === 0) {
        const signature = getScheduleFingerprint(currentSections);

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          foundSolutions.push({
            sections: [...currentSections],
            score: evalResult.score,
            tags: evalResult.tags,
            clashCount: evalResult.clashCount,
            activeDays: evalResult.activeDays,
            signature
          });
        }
      }
      return;
    }

    const { bundles } = subjectBundles[courseIdx];

    for (const bundle of bundles) {
      if (!bundleClashesWithExisting(bundle, currentSections)) {
        for (const s of bundle) currentSections.push(s);
        backtrack(courseIdx + 1, currentSections);
        for (let i = 0; i < bundle.length; i++) currentSections.pop();
      }
    }
  }

  backtrack(0, []);

  // 5. Intelligent Selection & Ranking for Diverse, High-Quality Options
  if (foundSolutions.length > 0) {
    // Sort primarily by highest score
    foundSolutions.sort((a, b) => b.score - a.score);

    const chosenSolutions: typeof foundSolutions = [];
    const usedSignatures = new Set<string>();
    const usedTimeSignatures = new Set<string>();

    const addIfDistinct = (sol: typeof foundSolutions[0]) => {
      if (!sol) return;
      const canonicalSig = getScheduleFingerprint(sol.sections);
      const timeSlotSig = getTimeAndCourseFingerprint(sol.sections);
      if (!usedSignatures.has(canonicalSig) && !usedTimeSignatures.has(timeSlotSig) && chosenSolutions.length < maxSolutions) {
        usedSignatures.add(canonicalSig);
        usedTimeSignatures.add(timeSlotSig);
        chosenSolutions.push(sol);
      }
    };

    // Strategy 1: Top Best Overall Solution
    if (shiftPref === 'afternoon') {
      const bestAfternoon = [...foundSolutions].sort((a, b) => {
        const aAfternoonCount = a.sections.filter((s) => !isVLESection(s) && (s.startPeriod >= 7 || s.endPeriod >= 7)).length;
        const bAfternoonCount = b.sections.filter((s) => !isVLESection(s) && (s.startPeriod >= 7 || s.endPeriod >= 7)).length;
        const aMorningCount = a.sections.filter((s) => !isVLESection(s) && s.startPeriod <= 6).length;
        const bMorningCount = b.sections.filter((s) => !isVLESection(s) && s.startPeriod <= 6).length;
        return (bAfternoonCount - bMorningCount) - (aAfternoonCount - aMorningCount) || b.score - a.score;
      });
      if (bestAfternoon[0]) addIfDistinct(bestAfternoon[0]);
      if (bestAfternoon[1]) addIfDistinct(bestAfternoon[1]);
    } else if (shiftPref === 'morning') {
      const bestMorning = [...foundSolutions].sort((a, b) => {
        const aMorningCount = a.sections.filter((s) => !isVLESection(s) && s.startPeriod <= 6).length;
        const bMorningCount = b.sections.filter((s) => !isVLESection(s) && s.startPeriod <= 6).length;
        const aAfternoonCount = a.sections.filter((s) => !isVLESection(s) && (s.startPeriod >= 7 || s.endPeriod >= 7)).length;
        const bAfternoonCount = b.sections.filter((s) => !isVLESection(s) && (s.startPeriod >= 7 || s.endPeriod >= 7)).length;
        return (bMorningCount - aAfternoonCount) - (aMorningCount - bAfternoonCount) || b.score - a.score;
      });
      if (bestMorning[0]) addIfDistinct(bestMorning[0]);
      if (bestMorning[1]) addIfDistinct(bestMorning[1]);
    } else {
      // 'all' / 'flexible': Prioritize balanced full-day schedules (both Morning and Afternoon)
      const fullDaySolutions = foundSolutions.filter((s) => {
        const hasMorning = s.sections.some((sec) => !isVLESection(sec) && sec.startPeriod <= 6);
        const hasAfternoon = s.sections.some((sec) => !isVLESection(sec) && (sec.startPeriod >= 7 || sec.endPeriod >= 7));
        return hasMorning && hasAfternoon;
      });

      if (fullDaySolutions.length > 0) {
        // 1. Top balanced full-day schedule
        fullDaySolutions.sort((a, b) => b.score - a.score);
        addIfDistinct(fullDaySolutions[0]);

        // 2. Most compact full-day schedule (combines morning & afternoon to reduce total days)
        const compactFullDay = [...fullDaySolutions].sort(
          (a, b) => a.activeDays.length - b.activeDays.length || b.score - a.score
        );
        if (compactFullDay[0]) addIfDistinct(compactFullDay[0]);

        // 3. Second best full-day alternative
        if (fullDaySolutions[1]) addIfDistinct(fullDaySolutions[1]);
        if (fullDaySolutions[2]) addIfDistinct(fullDaySolutions[2]);
      } else {
        // If no mixed full-day solution exists in data, pick best overall
        if (foundSolutions[0]) addIfDistinct(foundSolutions[0]);
      }
    }

    // Strategy 3: Most Compact Schedule overall (minimum active days)
    const mostCompact = [...foundSolutions].sort((a, b) => a.activeDays.length - b.activeDays.length || b.score - a.score);
    if (mostCompact[0]) addIfDistinct(mostCompact[0]);

    // Strategy 4: If avoidSplitDays requested, prioritize schedules with minimum split days
    if (constraints.avoidSplitDays) {
      const bestNoSplit = [...foundSolutions].sort((a, b) => {
        const aSplit = a.activeDays.filter((day) =>
          a.sections.some((s) => !isVLESection(s) && Number(s.dayOfWeek) === day && s.startPeriod <= 6) &&
          a.sections.some((s) => !isVLESection(s) && Number(s.dayOfWeek) === day && (s.startPeriod >= 7 || s.endPeriod >= 7))
        ).length;
        const bSplit = b.activeDays.filter((day) =>
          b.sections.some((s) => !isVLESection(s) && Number(s.dayOfWeek) === day && s.startPeriod <= 6) &&
          b.sections.some((s) => !isVLESection(s) && Number(s.dayOfWeek) === day && (s.startPeriod >= 7 || s.endPeriod >= 7))
        ).length;
        return aSplit - bSplit || b.score - a.score;
      });
      if (bestNoSplit[0]) addIfDistinct(bestNoSplit[0]);
    }

    // Fill remaining distinct slots up to maxSolutions from the highest-ranked solutions
    for (const sol of foundSolutions) {
      if (chosenSolutions.length >= maxSolutions) break;
      addIfDistinct(sol);
    }

    // Map to final TimetableSolution interface
    return chosenSolutions.map((sol, index) => {
      const dayNames = sol.activeDays.map((d) => (d === 8 ? 'CN' : `T${d}`)).join(', ');
      const title = `Phương án ${index + 1}`;

      return {
        id: `solution-${index + 1}`,
        title,
        description: `Học các ngày [${dayNames}] (${sol.activeDays.length} buổi/tuần) với ${sol.sections.length} lớp học phần (LT & TH).`,
        score: sol.score,
        clashCount: sol.clashCount,
        totalDays: sol.activeDays.length,
        activeDays: sol.activeDays,
        sections: sol.sections,
        tags: sol.tags.slice(0, 4)
      };
    });
  }

  // 6. Fallback: If no 100% clash-free solution exists, return the best combination with minimal clashes
  const greedySections: MasterCourseSection[] = [];
  for (const item of subjectBundles) {
    if (item.bundles.length > 0) {
      greedySections.push(...item.bundles[0]);
    }
  }

  const fallbackEval = evaluateScheduleScore(greedySections, constraints);
  return [
    {
      id: 'solution-fallback-1',
      title: 'Phương án 1 (Cần chỉnh sửa thủ công)',
      description: `Đang có ${fallbackEval.clashCount} tiết học bị trùng giờ giữa các lớp. Bạn có thể đổi ca học trực tiếp ở Ma trận bên dưới để khắc phục.`,
      score: Math.max(0, fallbackEval.score),
      clashCount: fallbackEval.clashCount,
      totalDays: fallbackEval.activeDays.length,
      activeDays: fallbackEval.activeDays,
      sections: greedySections,
      tags: ['Cần đổi nhóm thực hành/lý thuyết']
    }
  ];
}

/**
 * Backward compatibility alias for solveTimetableCSP
 */
export const solveSchedule = solveTimetableCSP;
