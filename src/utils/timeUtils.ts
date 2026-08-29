/**
 * Time and Schedule Utilities for HCMUE-FIT StudyVault
 * Official 12-period academic schedule definition for Ho Chi Minh City University of Education (HCMUE)
 */

export interface PeriodTimeSlot {
  period: number;
  startTime: string;
  endTime: string;
  session: 'morning' | 'afternoon';
}

/**
 * Official HCMUE 12-Period Time Schedule
 * Morning Session: Tiết 1 - Tiết 6 (06:30 - 11:40)
 * Afternoon Session: Tiết 7 - Tiết 12 (12:30 - 17:40)
 */
export const HCMUE_PERIOD_SCHEDULE: Record<number, PeriodTimeSlot> = {
  1: { period: 1, startTime: '06:30', endTime: '07:20', session: 'morning' },
  2: { period: 2, startTime: '07:20', endTime: '08:10', session: 'morning' },
  3: { period: 3, startTime: '08:10', endTime: '09:00', session: 'morning' },
  4: { period: 4, startTime: '09:10', endTime: '10:00', session: 'morning' },
  5: { period: 5, startTime: '10:00', endTime: '10:50', session: 'morning' },
  6: { period: 6, startTime: '10:50', endTime: '11:40', session: 'morning' },
  7: { period: 7, startTime: '12:30', endTime: '13:20', session: 'afternoon' },
  8: { period: 8, startTime: '13:20', endTime: '14:10', session: 'afternoon' },
  9: { period: 9, startTime: '14:10', endTime: '15:00', session: 'afternoon' },
  10: { period: 10, startTime: '15:10', endTime: '16:00', session: 'afternoon' },
  11: { period: 11, startTime: '16:00', endTime: '16:50', session: 'afternoon' },
  12: { period: 12, startTime: '16:50', endTime: '17:40', session: 'afternoon' },
};

/**
 * Returns formatted time string range for start and end periods
 * E.g. (1, 3) => "06:30 - 09:00"
 */
export function periodsToTimeRange(startPeriod: number, endPeriod: number): string {
  const clampedStart = Math.min(Math.max(1, startPeriod), 12);
  const clampedEnd = Math.min(Math.max(clampedStart, endPeriod), 12);

  const startSlot = HCMUE_PERIOD_SCHEDULE[clampedStart];
  const endSlot = HCMUE_PERIOD_SCHEDULE[clampedEnd];

  if (!startSlot || !endSlot) return '';
  return `${startSlot.startTime} - ${endSlot.endTime}`;
}

/**
 * Converts a time string (e.g. "07:30", "13h00", "09:10 - 11:40") to periods
 */
export function timeStringToPeriods(timeStr: string): { startPeriod: number; endPeriod: number } {
  if (!timeStr) return { startPeriod: 1, endPeriod: 3 };

  // Check if string contains period numbers directly: "Tiết 1-3", "Tiết 7-9", "1-3"
  const periodMatch = timeStr.match(/(?:tiết|tiet|ca)?\s*([0-9]{1,2})\s*(?:-|đến|to|->)\s*([0-9]{1,2})/i);
  if (periodMatch) {
    const s = parseInt(periodMatch[1], 10);
    const e = parseInt(periodMatch[2], 10);
    if (s >= 1 && s <= 12 && e >= s && e <= 12) {
      return { startPeriod: s, endPeriod: e };
    }
  }

  // Parse clock times like "06:30", "6h30"
  const clockMatches = [...timeStr.matchAll(/([0-9]{1,2})[:hH]([0-9]{2})/g)];
  if (clockMatches.length >= 1) {
    const startHour = parseInt(clockMatches[0][1], 10);
    const startMin = parseInt(clockMatches[0][2], 10);
    const startTotal = startHour * 60 + startMin;

    let endTotal = startTotal + 150; // default 2.5 hours
    if (clockMatches.length >= 2) {
      const endHour = parseInt(clockMatches[1][1], 10);
      const endMin = parseInt(clockMatches[1][2], 10);
      endTotal = endHour * 60 + endMin;
    }

    let startPeriod = 1;
    let endPeriod = 3;

    for (let p = 1; p <= 12; p++) {
      const [sh, sm] = HCMUE_PERIOD_SCHEDULE[p].startTime.split(':').map(Number);
      const slotStart = sh * 60 + sm;
      if (Math.abs(slotStart - startTotal) <= 25) {
        startPeriod = p;
        break;
      }
    }

    for (let p = 12; p >= startPeriod; p--) {
      const [eh, em] = HCMUE_PERIOD_SCHEDULE[p].endTime.split(':').map(Number);
      const slotEnd = eh * 60 + em;
      if (Math.abs(slotEnd - endTotal) <= 25) {
        endPeriod = p;
        break;
      }
    }

    return { startPeriod, endPeriod };
  }

  return { startPeriod: 1, endPeriod: 3 };
}

/**
 * Standard Day of Week mapping
 * 2 -> "Thứ 2", ..., 7 -> "Thứ 7", 8 -> "Chủ nhật"
 */
export const DAY_OF_WEEK_NAMES: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật'
};

export function parseDayOfWeek(input: string | number): number {
  if (typeof input === 'number') {
    if (input >= 2 && input <= 8) return input;
    if (input === 1) return 8; // Sunday
    return 2;
  }

  const str = String(input || '').toLowerCase().trim();
  if (str.includes('hai') || str === '2' || str.includes('t2') || str.includes('thứ 2') || str.includes('thu 2')) return 2;
  if (str.includes('ba') || str === '3' || str.includes('t3') || str.includes('thứ 3') || str.includes('thu 3')) return 3;
  if (str.includes('tư') || str.includes('tu') || str.includes('bốn') || str === '4' || str.includes('t4') || str.includes('thứ 4') || str.includes('thu 4')) return 4;
  if (str.includes('năm') || str.includes('nam') || str === '5' || str.includes('t5') || str.includes('thứ 5') || str.includes('thu 5')) return 5;
  if (str.includes('sáu') || str.includes('sau') || str === '6' || str.includes('t6') || str.includes('thứ 6') || str.includes('thu 6')) return 6;
  if (str.includes('bảy') || str.includes('bay') || str === '7' || str.includes('t7') || str.includes('thứ 7') || str.includes('thu 7')) return 7;
  if (str.includes('nhật') || str.includes('nhat') || str === '8' || str === 'cn' || str.includes('chủ nhật') || str.includes('chu nhat')) return 8;

  return 2;
}

/**
 * OCR Course Code Healer
 * Automatically repairs degraded OCR characters in HCMUE course codes.
 * E.g.: "COMPLBRI" -> "COMP1801", "COMIPI016" -> "COMP1016", "CONF1817" -> "COMP1017"
 */
export function healCourseCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return '';
  let cleaned = rawCode.trim().toUpperCase().replace(/[\s\-_]+/g, '');

  // Prefix heuristic corrections
  const prefixMap: Record<string, string> = {
    CONF: 'COMP',
    COMI: 'COMP',
    CONP: 'COMP',
    CQMP: 'COMP',
    COHP: 'COMP',
    GNED: 'GNED',
    EDUC: 'EDUC',
    MATH: 'MATH',
    PHYS: 'PHYS',
    PHYL: 'PHYL',
    PSYC: 'PSYC',
    ENGL: 'ENGL'
  };

  for (const [badPrefix, goodPrefix] of Object.entries(prefixMap)) {
    if (cleaned.startsWith(badPrefix)) {
      cleaned = goodPrefix + cleaned.slice(badPrefix.length);
      break;
    }
  }

  // Suffix number healing: letters that look like digits in course number portion
  if (cleaned.length >= 8) {
    const prefix = cleaned.slice(0, 4);
    const suffix = cleaned.slice(4);

    let healedSuffix = '';
    for (const char of suffix) {
      if (/[0-9]/.test(char)) {
        healedSuffix += char;
      } else if (char === 'O' || char === 'D' || char === 'Q') {
        healedSuffix += '0';
      } else if (char === 'I' || char === 'L' || char === 'T' || char === 'J') {
        healedSuffix += '1';
      } else if (char === 'Z') {
        healedSuffix += '2';
      } else if (char === 'E') {
        healedSuffix += '3';
      } else if (char === 'A') {
        healedSuffix += '4';
      } else if (char === 'S') {
        healedSuffix += '5';
      } else if (char === 'G' || char === 'b') {
        healedSuffix += '6';
      } else if (char === 'B') {
        healedSuffix += '8';
      } else if (char === 'R') {
        healedSuffix += '0';
      } else {
        healedSuffix += char;
      }
    }

    return prefix + healedSuffix;
  }

  return cleaned;
}
