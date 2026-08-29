import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { MasterCourseSection } from '../types';

/**
 * Yield execution to main UI thread so rendering/interactions never block
 */
export function yieldToMainThread(): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    'scheduler' in window &&
    typeof (window as any).scheduler?.yield === 'function'
  ) {
    return (window as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Client-side non-blocking image compression helper
 */
export async function compressImageFileNonBlocking(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        await yieldToMainThread();
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = ((e.target?.result as string) || '').split(',')[1] || '';
          return resolve({ base64: raw, mimeType: file.type || 'image/jpeg' });
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        const raw = ((e.target?.result as string) || '').split(',')[1] || '';
        resolve({ base64: raw, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes day of week to integer (2: Monday ... 8: Sunday)
 */
export function parseDayOfWeek(raw: any): number {
  if (typeof raw === 'number') {
    if (raw >= 2 && raw <= 8) return raw;
    if (raw === 1) return 8; // Sunday
    return 2;
  }
  const str = String(raw || '').toLowerCase().trim();
  if (!str) return 2;

  if (str.includes('hai') || str === '2' || str === 't2' || str === 't.2' || str === 'thứ 2' || str === 'thu 2' || str === 'mon') return 2;
  if (str.includes('ba') || str === '3' || str === 't3' || str === 't.3' || str === 'thứ 3' || str === 'thu 3' || str === 'tue') return 3;
  if (str.includes('tư') || str.includes('tu') || str.includes('bốn') || str.includes('bon') || str === '4' || str === 't4' || str === 't.4' || str === 'thứ 4' || str === 'thu 4' || str === 'wed') return 4;
  if (str.includes('năm') || str.includes('nam') || str === '5' || str === 't5' || str === 't.5' || str === 'thứ 5' || str === 'thu 5' || str === 'thu') return 5;
  if (str.includes('sáu') || str.includes('sau') || str === '6' || str === 't6' || str === 't.6' || str === 'thứ 6' || str === 'thu 6' || str === 'fri') return 6;
  if (str.includes('bảy') || str.includes('bay') || str === '7' || str === 't7' || str === 't.7' || str === 'thứ 7' || str === 'thu 7' || str === 'sat') return 7;
  if (str.includes('nhật') || str.includes('nhat') || str === '8' || str === 'cn' || str === 'c.n' || str === 'chủ nhật' || str === 'chu nhat' || str === 'sun' || str === '1') return 8;

  // Check if string contains digits 2-8
  const match = str.match(/\b([2-8])\b/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 2;
}

/**
 * Parse periods (start, end)
 * Handles separated start/end, range strings ("1-3", "7->9", "4..6", "1,2,3"), and start + duration
 */
export function parsePeriods(startRaw: any, endRaw?: any, durationRaw?: any): { start: number; end: number } {
  const startStr = String(startRaw || '').trim();
  const endStr = String(endRaw || '').trim();
  const duration = parseInt(String(durationRaw || '0').replace(/[^\d]/g, ''), 10);

  // Check if startRaw contains a range like "1-3", "1 - 3", "7->9", "4..6", "1,2,3"
  if (startStr && (startStr.includes('-') || startStr.includes('->') || startStr.includes('..') || startStr.includes(','))) {
    const numbers = startStr.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const first = parseInt(numbers[0], 10) || 1;
      const last = parseInt(numbers[numbers.length - 1], 10) || first;
      return {
        start: Math.max(1, Math.min(12, first)),
        end: Math.max(first, Math.min(12, last))
      };
    } else if (numbers && numbers.length === 1) {
      const single = parseInt(numbers[0], 10) || 1;
      return {
        start: Math.max(1, Math.min(12, single)),
        end: Math.max(1, Math.min(12, duration > 0 ? single + duration - 1 : single + 2))
      };
    }
  }

  let start = parseInt(startStr.replace(/[^\d]/g, ''), 10) || 1;
  let end = parseInt(endStr.replace(/[^\d]/g, ''), 10);

  if (!end || isNaN(end) || end < start) {
    if (duration > 0) {
      end = start + duration - 1;
    } else {
      end = start + 2; // Default 3 periods
    }
  }

  start = Math.max(1, Math.min(12, start));
  end = Math.max(start, Math.min(12, end));
  if (end - start + 1 > 4) {
    end = start + 2; // Capping to 3 periods (typical session duration)
  }
  return { start, end };
}

/**
 * Clean & format Lecturer name accurately
 */
export function cleanLecturerName(raw: any): string {
  if (!raw) return 'Chưa phân công';
  let name = String(raw).trim();
  // Strip redundant surrounding quotes or brackets
  name = name.replace(/^["'\s\[\]()]+|["'\s\[\]()]+$/g, '');
  if (!name || name === '-' || name === '--' || name.toLowerCase() === 'null' || name.toLowerCase() === 'undefined' || name.toLowerCase() === 'none') {
    return 'Chưa phân công';
  }
  return name;
}

/**
 * Clean room name accurately without inventing fake rooms
 */
export function cleanRoomName(raw: any): string {
  if (!raw) return 'Chưa xếp phòng';
  let room = String(raw).trim();
  room = room.replace(/^["'\s]+|["'\s]+$/g, '');
  if (!room || room === '-' || room === '--' || room.toLowerCase() === 'null' || room.toLowerCase() === 'undefined') {
    return 'Chưa xếp phòng';
  }
  if (/^vle\b/i.test(room) || room.toUpperCase().includes('VLE')) {
    return 'VLE';
  }
  return room;
}

/**
 * Accurately extracts the base course code from a full section class code.
 * E.g., "2511COMP180202" -> "COMP1802"
 *       "COMP180202" -> "COMP1802"
 *       "COMP1802_01" -> "COMP1802"
 */
export function extractBaseCourseCode(classCode?: string, explicitCourseCode?: string): string {
  if (explicitCourseCode && explicitCourseCode.trim()) {
    const cleanExplicit = explicitCourseCode.trim().toUpperCase();
    const match = cleanExplicit.match(/[A-Z]+\d+/);
    if (match) return match[0];
    return cleanExplicit;
  }
  if (!classCode) return 'COMP';
  const clean = classCode.trim().toUpperCase();
  const match = clean.match(/[A-Z]+\d+/);
  if (match) return match[0];
  return clean;
}

/**
 * Auto-detect class type (LT vs TH)
 */
export function detectClassType(row: {
  classType?: string;
  classCode?: string;
  group?: string;
  courseName?: string;
  room?: string;
}): 'LT' | 'TH' {
  const combined = `${row.classType || ''} ${row.classCode || ''} ${row.group || ''} ${row.courseName || ''} ${row.room || ''}`.toUpperCase();
  if (
    combined.includes('TH') ||
    combined.includes('THỰC HÀNH') ||
    combined.includes('THUC HANH') ||
    combined.includes('LAB') ||
    combined.includes('PM') ||
    combined.includes('PHÒNG MÁY') ||
    combined.includes('PHONG MAY') ||
    combined.includes('BÀI TẬP') ||
    combined.includes('BT') ||
    combined.includes('TỔ TH') ||
    combined.includes('NHÓM TH')
  ) {
    return 'TH';
  }
  return 'LT';
}

/**
 * Helper to normalize cell headers for flexible Vietnamese matching
 */
function normalizeHeaderString(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast & ultra-robust Excel / CSV parser with non-blocking event-loop yielding
 * Slices large spreadsheets (thousands of rows) into micro-batches to keep UI thread 60fps responsive.
 */
export async function parseExcelOrCsvFileNonBlocking(
  file: File,
  onProgress?: (progress: number, message: string) => void,
  abortSignal?: AbortSignal
): Promise<MasterCourseSection[] | null> {
  try {
    if (abortSignal?.aborted) return null;
    onProgress?.(15, `Đang đọc dữ liệu tệp ${file.name}...`);
    await yieldToMainThread();

    const arrayBuffer = await file.arrayBuffer();
    if (abortSignal?.aborted) return null;

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return null;

    const allExtractedSections: MasterCourseSection[] = [];
    const totalSheets = workbook.SheetNames.length;

    // Iterate through all sheets to find schedule tables
    for (let sIdx = 0; sIdx < totalSheets; sIdx++) {
      if (abortSignal?.aborted) return null;
      const sheetName = workbook.SheetNames[sIdx];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      onProgress?.(
        Math.round(20 + (sIdx / totalSheets) * 30),
        `Đang phân tích Sheet: "${sheetName}"...`
      );
      await yieldToMainThread();

      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawRows || rawRows.length < 2) continue;

      // Find header row index by scanning the first 35 rows
      let headerIdx = -1;
      let colMap: { [key: string]: number } = {};

      for (let r = 0; r < Math.min(35, rawRows.length); r++) {
        const row = rawRows[r] as any[];
        if (!Array.isArray(row)) continue;

        const rowNormStr = row.map((c) => normalizeHeaderString(String(c))).join(' ');

        // Check if this row contains key timetable header concepts
        const hasCodeOrCourse =
          rowNormStr.includes('ma') ||
          rowNormStr.includes('mon') ||
          rowNormStr.includes('hoc phan') ||
          rowNormStr.includes('lop') ||
          rowNormStr.includes('course') ||
          rowNormStr.includes('subject');

        const hasTimeOrLocation =
          rowNormStr.includes('thu') ||
          rowNormStr.includes('tiet') ||
          rowNormStr.includes('phong') ||
          rowNormStr.includes('giang vien') ||
          rowNormStr.includes('cbgd') ||
          rowNormStr.includes('gv') ||
          rowNormStr.includes('room') ||
          rowNormStr.includes('day') ||
          rowNormStr.includes('period');

        if (hasCodeOrCourse && hasTimeOrLocation) {
          headerIdx = r;
          const tempColMap: { [key: string]: number } = {};

          row.forEach((cell, cIdx) => {
            const rawVal = String(cell || '').trim();
            const norm = normalizeHeaderString(rawVal);
            if (!norm) return;

            // Course Code
            if (
              norm === 'ma hp' ||
              norm === 'ma mh' ||
              norm === 'ma mon' ||
              norm.includes('ma hoc phan') ||
              norm.includes('ma mon hoc') ||
              norm.includes('course code') ||
              norm.includes('subject code') ||
              norm.includes('course id')
            ) {
              if (tempColMap['courseCode'] === undefined) tempColMap['courseCode'] = cIdx;
            }
            // Course Name
            else if (
              norm === 'ten hp' ||
              norm === 'ten mh' ||
              norm === 'ten mon' ||
              norm.includes('ten hoc phan') ||
              norm.includes('ten mon hoc') ||
              norm.includes('course name') ||
              norm.includes('subject name') ||
              norm.includes('ten mon')
            ) {
              if (tempColMap['courseName'] === undefined) tempColMap['courseName'] = cIdx;
            }
            // Class Code (Mã lớp học phần / Mã LHP)
            else if (
              norm === 'ma lhp' ||
              norm === 'ma lop' ||
              norm === 'ma lop hp' ||
              norm.includes('ma lop hoc phan') ||
              norm.includes('lop hoc phan') ||
              norm.includes('class code') ||
              norm.includes('section id') ||
              norm.includes('ma to') ||
              norm.includes('ma nhom')
            ) {
              if (tempColMap['classCode'] === undefined) tempColMap['classCode'] = cIdx;
            }
            // Class Type (LT / TH)
            else if (
              norm === 'loai' ||
              norm === 'loai hp' ||
              norm === 'loai lhp' ||
              norm === 'lt th' ||
              norm.includes('hinh thuc') ||
              norm.includes('htgd') ||
              norm === 'type'
            ) {
              if (tempColMap['classType'] === undefined) tempColMap['classType'] = cIdx;
            }
            // Group / Tổ
            else if (
              norm === 'nhom' ||
              norm === 'to' ||
              norm.includes('nhom to') ||
              norm.includes('to nhom') ||
              norm.includes('to th') ||
              norm.includes('nhom th') ||
              norm === 'group' ||
              norm === 'section' ||
              norm === 'lop'
            ) {
              if (tempColMap['group'] === undefined) tempColMap['group'] = cIdx;
            }
            // Lecturer / CBGD
            else if (
              norm.includes('giang vien') ||
              norm.includes('cbgd') ||
              norm.includes('can bo') ||
              norm.includes('ho ten gv') ||
              norm.includes('gv giang day') ||
              norm === 'gv' ||
              norm === 'gvgd' ||
              norm.includes('giao vien') ||
              norm.includes('lecturer') ||
              norm.includes('instructor') ||
              norm.includes('teacher')
            ) {
              if (tempColMap['lecturer'] === undefined) tempColMap['lecturer'] = cIdx;
            }
            // Day of Week
            else if (
              norm === 'thu' ||
              norm === 'thu hoc' ||
              norm === 'day' ||
              norm.includes('day of week') ||
              norm.includes('thu ngay')
            ) {
              if (tempColMap['dayOfWeek'] === undefined) tempColMap['dayOfWeek'] = cIdx;
            }
            // Start Period
            else if (
              norm.includes('tiet bd') ||
              norm.includes('tiet bat dau') ||
              norm.includes('tu tiet') ||
              norm.includes('bat dau') ||
              norm.includes('t bd') ||
              norm.includes('start period')
            ) {
              if (tempColMap['startPeriod'] === undefined) tempColMap['startPeriod'] = cIdx;
            }
            // End Period
            else if (
              norm.includes('tiet kt') ||
              norm.includes('tiet ket thuc') ||
              norm.includes('den tiet') ||
              norm.includes('ket thuc') ||
              norm.includes('t kt') ||
              norm.includes('end period')
            ) {
              if (tempColMap['endPeriod'] === undefined) tempColMap['endPeriod'] = cIdx;
            }
            // Single Period Column
            else if (
              norm === 'tiet' ||
              norm === 'tiet hoc' ||
              norm === 'ca' ||
              norm === 'ca hoc' ||
              norm === 'period' ||
              norm === 'periods'
            ) {
              if (tempColMap['periodCombined'] === undefined) tempColMap['periodCombined'] = cIdx;
            }
            // Duration / Số tiết
            else if (
              norm.includes('so tiet') ||
              norm.includes('thoi luong') ||
              norm.includes('duration')
            ) {
              if (tempColMap['duration'] === undefined) tempColMap['duration'] = cIdx;
            }
            // Room
            else if (
              norm === 'phong' ||
              norm === 'phong hoc' ||
              norm === 'phong may' ||
              norm.includes('dia diem') ||
              norm.includes('co so') ||
              norm === 'room' ||
              norm === 'location' ||
              norm === 'lab'
            ) {
              if (tempColMap['room'] === undefined) tempColMap['room'] = cIdx;
            }
            // Weeks
            else if (
              norm.includes('tuan') ||
              norm.includes('tuan hoc') ||
              norm.includes('lich hoc') ||
              norm.includes('weeks') ||
              norm.includes('thoi gian hoc')
            ) {
              if (tempColMap['weeks'] === undefined) tempColMap['weeks'] = cIdx;
            }
          });

          if (
            tempColMap['dayOfWeek'] !== undefined ||
            tempColMap['startPeriod'] !== undefined ||
            tempColMap['periodCombined'] !== undefined ||
            tempColMap['courseName'] !== undefined ||
            tempColMap['courseCode'] !== undefined
          ) {
            colMap = tempColMap;
            break;
          }
        }
      }

      if (headerIdx === -1) continue;

      let lastCourseCode = '';
      let lastCourseName = '';
      let lastClassCode = '';
      let lastClassType: 'LT' | 'TH' = 'LT';
      let lastGroup = 'Lớp 01';
      let lastLecturer = 'Chưa phân công';
      let lastWeeks = '1-15';
      let lastRoom = 'Chưa xếp phòng';

      const totalRows = rawRows.length;
      const CHUNK_SIZE = 150;

      for (let r = headerIdx + 1; r < totalRows; r++) {
        // Yield to event loop periodically to prevent UI thread lock
        if (r % CHUNK_SIZE === 0) {
          if (abortSignal?.aborted) return null;
          const pct = Math.round(50 + ((r - headerIdx) / (totalRows - headerIdx)) * 45);
          onProgress?.(pct, `Đang xử lý dòng ${r}/${totalRows} (${allExtractedSections.length} lớp)...`);
          await yieldToMainThread();
        }

        const row = rawRows[r] as any[];
        if (!Array.isArray(row) || row.every((c) => !c || String(c).trim() === '')) continue;

        let courseCode = colMap['courseCode'] !== undefined ? String(row[colMap['courseCode']] || '').trim() : '';
        let courseName = colMap['courseName'] !== undefined ? String(row[colMap['courseName']] || '').trim() : '';
        let classCode = colMap['classCode'] !== undefined ? String(row[colMap['classCode']] || '').trim() : '';
        let group = colMap['group'] !== undefined ? String(row[colMap['group']] || '').trim() : '';
        let lecturerRaw = colMap['lecturer'] !== undefined ? row[colMap['lecturer']] : '';
        let lecturer = lecturerRaw ? cleanLecturerName(lecturerRaw) : '';
        let roomRaw = colMap['room'] !== undefined ? row[colMap['room']] : '';
        let room = roomRaw ? cleanRoomName(roomRaw) : '';
        let weeks = colMap['weeks'] !== undefined ? String(row[colMap['weeks']] || '').trim() : '';

        const dayRaw = colMap['dayOfWeek'] !== undefined ? row[colMap['dayOfWeek']] : '';
        const startRaw = colMap['startPeriod'] !== undefined ? row[colMap['startPeriod']] : (colMap['periodCombined'] !== undefined ? row[colMap['periodCombined']] : '');
        const endRaw = colMap['endPeriod'] !== undefined ? row[colMap['endPeriod']] : '';
        const durationRaw = colMap['duration'] !== undefined ? row[colMap['duration']] : '';

        // Continuation row
        if (!courseCode && (dayRaw || startRaw || room) && lastCourseCode) {
          courseCode = lastCourseCode;
          if (!courseName) courseName = lastCourseName;
          if (!classCode) classCode = lastClassCode;
          if (!group) group = lastGroup;
          if (!lecturer || lecturer === 'Chưa phân công') lecturer = lastLecturer;
          if (!room || room === 'Chưa xếp phòng') room = lastRoom;
          if (!weeks) weeks = lastWeeks;
        }

        if (!courseCode && !courseName) continue;

        if (courseCode && !courseName) courseName = courseCode;
        if (!courseCode && courseName) {
          courseCode = extractBaseCourseCode(classCode, courseName.split(' ')[0].toUpperCase());
        } else if (courseCode) {
          courseCode = extractBaseCourseCode(classCode, courseCode);
        }

        if (!classCode) {
          const groupSuffix = (group || '01').replace(/[^\d]/g, '').padStart(2, '0');
          classCode = `2511${courseCode}${groupSuffix}`;
        }

        lastCourseCode = courseCode;
        lastCourseName = courseName;
        lastClassCode = classCode;
        lastGroup = group || 'Lớp 01';
        if (lecturer && lecturer !== 'Chưa phân công') lastLecturer = lecturer;
        if (room && room !== 'Chưa xếp phòng') lastRoom = room;
        if (weeks) lastWeeks = weeks;

        const dayOfWeek = parseDayOfWeek(dayRaw);
        const { start, end } = parsePeriods(startRaw, endRaw, durationRaw);

        const classType = detectClassType({
          classType: colMap['classType'] !== undefined ? String(row[colMap['classType']] || '') : '',
          classCode: lastClassCode,
          group: lastGroup,
          courseName: lastCourseName,
          room: room || lastRoom
        });
        lastClassType = classType;

        allExtractedSections.push({
          id: `sec_${allExtractedSections.length + 1}_${Date.now()}`,
          courseCode: lastCourseCode,
          courseName: lastCourseName,
          classCode: lastClassCode,
          classType,
          group: lastGroup,
          lecturer: lecturer || lastLecturer || 'Chưa phân công',
          dayOfWeek,
          startPeriod: start,
          endPeriod: end,
          room: room || lastRoom || 'Chưa xếp phòng',
          weeks: weeks || lastWeeks || '1-15',
          sourceFile: file.name
        });
      }
    }

    if (abortSignal?.aborted) return null;
    return allExtractedSections.length > 0 ? allExtractedSections : null;
  } catch (err) {
    console.warn('Fast non-blocking Excel parser error:', err);
    return null;
  }
}

/**
 * Synchronous / backward compatible wrapper
 */
export async function parseExcelOrCsvFile(file: File): Promise<MasterCourseSection[] | null> {
  return parseExcelOrCsvFileNonBlocking(file);
}

/**
 * Fast Text Table / Tab-separated / CSV text parser with non-blocking slicing
 */
export async function parseRawTextScheduleNonBlocking(
  text: string,
  onProgress?: (progress: number, message: string) => void
): Promise<MasterCourseSection[] | null> {
  if (!text || text.trim().length < 20) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections: MasterCourseSection[] = [];
  const total = lines.length;
  const CHUNK_SIZE = 200;

  for (let idx = 0; idx < total; idx++) {
    if (idx % CHUNK_SIZE === 0 && idx > 0) {
      onProgress?.(Math.round((idx / total) * 100), `Đang phân tích dòng ${idx}/${total}...`);
      await yieldToMainThread();
    }

    const line = lines[idx];
    const tokens = line.split(/\t| {2,}|,/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length >= 4) {
      const code = tokens[0];
      const name = tokens[1];
      let foundDay = 2;
      let foundStart = 1;
      let foundEnd = 3;
      let foundLecturer = 'Chưa phân công';
      let foundRoom = 'Chưa xếp phòng';
      let foundGroup = 'Lớp 01';

      for (let i = 2; i < tokens.length; i++) {
        const tok = tokens[i];
        if (/^(thứ|t|thu)?\s*[2-8]$/i.test(tok) || /^(hai|ba|tư|năm|sáu|bảy|nhật)$/i.test(tok)) {
          foundDay = parseDayOfWeek(tok);
        } else if (/^\d{1,2}\s*-\s*\d{1,2}$/.test(tok) || /^\d{1,2}\s*->\s*\d{1,2}$/.test(tok)) {
          const { start, end } = parsePeriods(tok);
          foundStart = start;
          foundEnd = end;
        } else if (/^(TS|ThS|PGS|GS|Thầy|Cô|GV|CBGD)/i.test(tok) || (tok.split(' ').length >= 2 && !/\d/.test(tok))) {
          foundLecturer = cleanLecturerName(tok);
        } else if (/^[A-Z]\.?\d{2,3}|Lab|PM\d|Cisco|Online|Phòng/i.test(tok)) {
          foundRoom = cleanRoomName(tok);
        } else if (/^(nhóm|tổ|lớp|group)\s*\d+/i.test(tok)) {
          foundGroup = tok;
        }
      }

      if (code && name) {
        sections.push({
          id: `raw_sec_${sections.length + 1}`,
          courseCode: code,
          courseName: name,
          classCode: `${code}_0${sections.length + 1}`,
          classType: detectClassType({ courseName: name, room: foundRoom }),
          group: foundGroup,
          lecturer: foundLecturer,
          dayOfWeek: foundDay,
          startPeriod: foundStart,
          endPeriod: foundEnd,
          room: foundRoom,
          weeks: '1-15'
        });
      }
    }
  }

  return sections.length >= 2 ? sections : null;
}

/**
 * Synchronous / backward compatible wrapper
 */
export function parseRawTextSchedule(text: string): MasterCourseSection[] | null {
  if (!text || text.trim().length < 20) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections: MasterCourseSection[] = [];

  for (const line of lines) {
    const tokens = line.split(/\t| {2,}|,/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length >= 4) {
      const code = tokens[0];
      const name = tokens[1];
      let foundDay = 2;
      let foundStart = 1;
      let foundEnd = 3;
      let foundLecturer = 'Chưa phân công';
      let foundRoom = 'Chưa xếp phòng';
      let foundGroup = 'Lớp 01';

      for (let i = 2; i < tokens.length; i++) {
        const tok = tokens[i];
        if (/^(thứ|t|thu)?\s*[2-8]$/i.test(tok) || /^(hai|ba|tư|năm|sáu|bảy|nhật)$/i.test(tok)) {
          foundDay = parseDayOfWeek(tok);
        } else if (/^\d{1,2}\s*-\s*\d{1,2}$/.test(tok) || /^\d{1,2}\s*->\s*\d{1,2}$/.test(tok)) {
          const { start, end } = parsePeriods(tok);
          foundStart = start;
          foundEnd = end;
        } else if (/^(TS|ThS|PGS|GS|Thầy|Cô|GV|CBGD)/i.test(tok) || (tok.split(' ').length >= 2 && !/\d/.test(tok))) {
          foundLecturer = cleanLecturerName(tok);
        } else if (/^[A-Z]\.?\d{2,3}|Lab|PM\d|Cisco|Online|Phòng/i.test(tok)) {
          foundRoom = cleanRoomName(tok);
        } else if (/^(nhóm|tổ|lớp|group)\s*\d+/i.test(tok)) {
          foundGroup = tok;
        }
      }

      if (code && name) {
        sections.push({
          id: `raw_sec_${sections.length + 1}`,
          courseCode: code,
          courseName: name,
          classCode: `${code}_0${sections.length + 1}`,
          classType: detectClassType({ courseName: name, room: foundRoom }),
          group: foundGroup,
          lecturer: foundLecturer,
          dayOfWeek: foundDay,
          startPeriod: foundStart,
          endPeriod: foundEnd,
          room: foundRoom,
          weeks: '1-15'
        });
      }
    }
  }

  return sections.length >= 2 ? sections : null;
}

/**
 * Detects file category for batch processing
 */
export function detectFileType(fileOrName: File | string): 'excel' | 'pdf' | 'image' | 'csv' | 'text' | 'other' {
  const name = typeof fileOrName === 'string' ? fileOrName.toLowerCase() : (fileOrName.name || '').toLowerCase();
  const type = typeof fileOrName === 'string' ? '' : (fileOrName.type || '').toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet') || type.includes('excel')) {
    return 'excel';
  }
  if (name.endsWith('.csv') || type.includes('csv')) {
    return 'csv';
  }
  if (name.endsWith('.pdf') || type === 'application/pdf') {
    return 'pdf';
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name)) {
    return 'image';
  }
  if (name.endsWith('.txt') || name.endsWith('.tsv') || name.endsWith('.json') || type.startsWith('text/')) {
    return 'text';
  }
  return 'other';
}

/**
 * Human readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Smart merge & deduplicate sections from multiple files
 */
export function mergeAndDeduplicateSections(
  existingList: MasterCourseSection[],
  incomingList: MasterCourseSection[]
): { merged: MasterCourseSection[]; addedCount: number } {
  if (!incomingList || incomingList.length === 0) {
    return { merged: existingList, addedCount: 0 };
  }

  const existingMap = new Map<string, MasterCourseSection>();

  const createKey = (s: MasterCourseSection) =>
    `${(s.courseCode || '').trim().toUpperCase()}__${(s.classCode || '').trim().toUpperCase()}__${s.dayOfWeek}__${s.startPeriod}__${s.endPeriod}__${(s.group || '').trim().toUpperCase()}`;

  existingList.forEach((sec) => {
    existingMap.set(createKey(sec), sec);
  });

  let addedCount = 0;
  const merged = [...existingList];

  incomingList.forEach((sec) => {
    const key = createKey(sec);
    if (!existingMap.has(key)) {
      existingMap.set(key, sec);
      merged.push({
        ...sec,
        id: sec.id || `merged_sec_${merged.length + 1}_${Date.now()}`
      });
      addedCount++;
    } else {
      // Enhance existing section if incoming has better room or lecturer info
      const existing = existingMap.get(key)!;
      if ((!existing.lecturer || existing.lecturer === 'Chưa phân công') && sec.lecturer && sec.lecturer !== 'Chưa phân công') {
        existing.lecturer = sec.lecturer;
      }
      if ((!existing.room || existing.room === 'Chưa xếp phòng' || existing.room === 'A.301') && sec.room && sec.room !== 'Chưa xếp phòng' && sec.room !== 'A.301') {
        existing.room = sec.room;
      }
      if (!existing.sourceFile && sec.sourceFile) {
        existing.sourceFile = sec.sourceFile;
      }
    }
  });

  return { merged, addedCount };
}
