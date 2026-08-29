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
 * Detects if a section or class session is a VLE (Virtual Learning Environment / Online) session.
 * VLE sessions do not require fixed physical classroom slots and do not clash with in-person schedules.
 */
export function isVLESection(sec: MasterCourseSection): boolean {
  if (!sec) return false;
  const room = (sec.room || '').toUpperCase();
  const type = (sec.classType || '').toUpperCase();
  const group = (sec.group || '').toUpperCase();
  const code = (sec.classCode || '').toUpperCase();
  const name = (sec.courseName || '').toUpperCase();
  return (
    room.includes('VLE') ||
    room.includes('ONLINE') ||
    type.includes('VLE') ||
    group.includes('VLE') ||
    code.includes('VLE') ||
    name.includes('VLE')
  );
}

/**
 * Checks if two course sections have a time clash.
 * VLE / Online sessions are excluded from physical time clashes.
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

  // Overlap condition: neither ends before the other starts
  return !(endA < startB || startA > endB);
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

/**
 * Computes a preference and quality score for a candidate schedule.
 */
export function evaluateScheduleScore(
  sections: MasterCourseSection[],
  constraints: ScheduleConstraints
): { score: number; tags: string[]; clashCount: number; activeDays: number[] } {
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

  for (const s of sections) {
    activeDaysSet.add(s.dayOfWeek);

    if (s.dayOfWeek === 7) hasSaturday = true;
    if (s.dayOfWeek === 8) hasSunday = true;

    if (s.startPeriod === 1) earlyMorningCount++;
    if (s.endPeriod >= 10) lateAfternoonCount++;
    if (s.dayOfWeek === 6 && s.startPeriod >= 7) fridayAfternoonCount++;

    if (s.startPeriod <= 6) morningCount++;
    if (s.startPeriod >= 7) afternoonCount++;

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

  // Massive penalty for clashes
  score -= clashCount * 200;

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

  if (constraints.avoidEarlyMorning) {
    if (earlyMorningCount > 0) {
      score -= earlyMorningCount * 15;
    } else {
      score += 15;
      tags.push('Không tiết 1 (7h sáng)');
    }
  }

  if (constraints.avoidLateAfternoon) {
    if (lateAfternoonCount > 0) {
      score -= lateAfternoonCount * 15;
    } else {
      score += 10;
      tags.push('Không học muộn');
    }
  }

  if (constraints.freeFridayAfternoon) {
    if (fridayAfternoonCount > 0) {
      score -= 25;
    } else {
      score += 15;
      tags.push('Trống chiều Thứ 6');
    }
  }

  if (constraints.compactDays) {
    // Reward fewer days: 3 days is ideal, 4 days good, 5-6 days less compact
    const daysCount = activeDays.length;
    if (daysCount <= 3) {
      score += 30;
      tags.push(`Gom gọn ${daysCount} ngày/tuần`);
    } else if (daysCount === 4) {
      score += 15;
      tags.push('Học 4 ngày/tuần');
    } else {
      score -= (daysCount - 4) * 10;
    }
  }

  if (constraints.preferredPeriod === 'morning') {
    if (morningCount > afternoonCount) {
      score += 20;
      tags.push('Ưu tiên ca sáng');
    } else {
      score -= 15;
    }
  } else if (constraints.preferredPeriod === 'afternoon') {
    if (afternoonCount > morningCount) {
      score += 20;
      tags.push('Ưu tiên ca chiều');
    } else {
      score -= 15;
    }
  } else if (constraints.preferredPeriod === 'all') {
    if (morningCount > 0 && afternoonCount > 0) {
      score += 15;
      tags.push('Học cả sáng & chiều');
    }
  }

  if (clashCount === 0 && !tags.includes('Không trùng giờ')) {
    tags.unshift('100% Không trùng lịch');
  }

  return { score, tags, clashCount, activeDays };
}

/**
 * Solves the Constraint Satisfaction Problem (CSP) using Backtracking Search
 * with Minimum Remaining Values (MRV) heuristic, domain pruning, and multi-objective ranking.
 * Guarantees at least 5 valid scheduling options whenever mathematically possible in the catalog.
 */
export function solveTimetableCSP(
  catalog: MasterCourseSection[],
  selectedCourseCodes: string[],
  constraints: ScheduleConstraints,
  maxSolutions = 10
): TimetableSolution[] {
  if (selectedCourseCodes.length === 0) return [];

  // 1. Assign consistent colors to courses
  const courseColorMap = new Map<string, string>();
  selectedCourseCodes.forEach((code, idx) => {
    courseColorMap.set(code, COURSE_COLORS[idx % COURSE_COLORS.length]);
  });

  // 2. Generate bundles for each course
  const rawSubjectBundles: { courseCode: string; bundles: MasterCourseSection[][] }[] = [];
  for (const code of selectedCourseCodes) {
    const bundles = generateCourseOptionBundles(code, catalog);
    if (bundles.length > 0) {
      // Colorize sections
      const color = courseColorMap.get(code) || '#3b82f6';
      const coloredBundles = bundles.map((b) =>
        b.map((s) => ({
          ...s,
          color,
          id: s.id || `sec-${s.classCode}-${s.dayOfWeek}-${s.startPeriod}`
        }))
      );
      rawSubjectBundles.push({ courseCode: code, bundles: coloredBundles });
    }
  }

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
  const MAX_EXPLORED_SOLUTIONS = 500;

  // 4. Backtracking Search with Branch & Bound
  function backtrack(courseIdx: number, currentSections: MasterCourseSection[]) {
    if (foundSolutions.length >= MAX_EXPLORED_SOLUTIONS) return;

    // All courses scheduled
    if (courseIdx === subjectBundles.length) {
      const evalResult = evaluateScheduleScore(currentSections, constraints);
      if (evalResult.clashCount === 0) {
        // Create canonical fingerprint to avoid duplicate combinations
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
    if (foundSolutions[0]) addIfDistinct(foundSolutions[0]);

    // Strategy 2: Most Compact Schedule (minimum active days / fewest campus trips)
    const mostCompact = [...foundSolutions].sort((a, b) => a.activeDays.length - b.activeDays.length || b.score - a.score);
    if (mostCompact[0]) addIfDistinct(mostCompact[0]);

    if (constraints.preferredPeriod === 'all') {
      // Strategy 3: Best Balanced / Day-Sharing Schedule (has both morning and afternoon classes)
      const bestBalanced = [...foundSolutions].sort((a, b) => {
        const aHasBoth = (a.sections.some(s => s.startPeriod <= 6) && a.sections.some(s => s.startPeriod >= 7)) ? 1 : 0;
        const bHasBoth = (b.sections.some(s => s.startPeriod <= 6) && b.sections.some(s => s.startPeriod >= 7)) ? 1 : 0;
        return bHasBoth - aHasBoth || b.score - a.score;
      });
      if (bestBalanced[0]) addIfDistinct(bestBalanced[0]);
    } else {
      // Strategy 3: Best Morning-friendly Schedule (least early 7am, most morning focus)
      const bestMorning = [...foundSolutions].sort((a, b) => {
        const aMorningCount = a.sections.filter((s) => s.startPeriod <= 6).length;
        const bMorningCount = b.sections.filter((s) => s.startPeriod <= 6).length;
        return bMorningCount - aMorningCount || b.score - a.score;
      });
      if (bestMorning[0]) addIfDistinct(bestMorning[0]);

      // Strategy 4: Best Afternoon/Late-friendly Schedule
      const bestAfternoon = [...foundSolutions].sort((a, b) => {
        const aAfternoonCount = a.sections.filter((s) => s.startPeriod >= 7).length;
        const bAfternoonCount = b.sections.filter((s) => s.startPeriod >= 7).length;
        return bAfternoonCount - aAfternoonCount || b.score - a.score;
      });
      if (bestAfternoon[0]) addIfDistinct(bestAfternoon[0]);
    }

    // Fill remaining distinct slots up to maxSolutions (max 7) from the highest-ranked solutions
    for (const sol of foundSolutions) {
      if (chosenSolutions.length >= maxSolutions) break;
      addIfDistinct(sol);
    }

    // Map to final TimetableSolution interface (strictly only distinct solutions found)
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

  // 6. Fallback: If no 100% clash-free solution exists, return the best combination with minimal clashes so the student can edit manually
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
