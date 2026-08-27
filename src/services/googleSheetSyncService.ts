/**
 * Google Sheet Real-time Sync & Storage Service for FIT HCMUE StudyVault
 * 
 * Connected Google Sheet:
 * https://docs.google.com/spreadsheets/d/1iXF1dYHqOYrhwVCHWvRjqm2Hw7fnjQYC2i-3omvGygU/edit?usp=sharing
 * 
 * Parent Google Drive Folder:
 * https://drive.google.com/drive/folders/1zJP7wImUinP4lIEMra-eMmiayhRWhQfJ?usp=drive_link
 */

import { Subject, SheetCourseRecord, SubjectCategory, GradingWeights, PrerequisiteCourse, SyllabusChapter, LabExerciseOutline } from '../types';

export const DEFAULT_GOOGLE_SHEET_ID = '1iXF1dYHqOYrhwVCHWvRjqm2Hw7fnjQYC2i-3omvGygU';
export const DEFAULT_ROOT_DRIVE_FOLDER_ID = '1zJP7wImUinP4lIEMra-eMmiayhRWhQfJ';

export const ACTIVE_GOOGLE_SHEET_ID = DEFAULT_GOOGLE_SHEET_ID;
export const ACTIVE_GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_GOOGLE_SHEET_ID}/edit?usp=sharing`;
export const ACTIVE_ROOT_DRIVE_FOLDER_ID = DEFAULT_ROOT_DRIVE_FOLDER_ID;
export const ACTIVE_ROOT_DRIVE_URL = `https://drive.google.com/drive/folders/${DEFAULT_ROOT_DRIVE_FOLDER_ID}?usp=drive_link`;

const STORAGE_CACHE_KEY = 'fit_studyvault_sheet_sync_data_v2';
const STORAGE_LAST_SYNC_KEY = 'fit_studyvault_sheet_last_sync_time';
const STORAGE_CUSTOM_SHEET_ID_KEY = 'fit_studyvault_custom_sheet_id';
const STORAGE_CUSTOM_DRIVE_URL_KEY = 'fit_studyvault_custom_drive_url';

export const SHEET_SYNC_EVENT = 'fit_sheet_data_synced';

/**
 * Extracts a Google Sheet ID from URL or raw ID string
 */
export function extractGoogleSheetId(input?: string): string {
  if (!input || typeof input !== 'string') return DEFAULT_GOOGLE_SHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (trimmed.length > 15 && !trimmed.includes('/')) return trimmed;
  return DEFAULT_GOOGLE_SHEET_ID;
}

/**
 * Gets the current active Sheet ID (saved or default)
 */
export function getActiveSheetId(): string {
  if (typeof window === 'undefined') return DEFAULT_GOOGLE_SHEET_ID;
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOM_SHEET_ID_KEY);
    return saved ? extractGoogleSheetId(saved) : DEFAULT_GOOGLE_SHEET_ID;
  } catch {
    return DEFAULT_GOOGLE_SHEET_ID;
  }
}

/**
 * Saves and sets the current active Sheet ID
 */
export function setActiveSheetId(sheetIdOrUrl: string): string {
  const extracted = extractGoogleSheetId(sheetIdOrUrl);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CUSTOM_SHEET_ID_KEY, extracted);
    } catch (e) {
      console.error('Failed to save custom sheet ID:', e);
    }
  }
  return extracted;
}

/**
 * Gets the current active Drive URL
 */
export function getActiveDriveUrl(): string {
  if (typeof window === 'undefined') return ACTIVE_ROOT_DRIVE_URL;
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOM_DRIVE_URL_KEY);
    return saved || ACTIVE_ROOT_DRIVE_URL;
  } catch {
    return ACTIVE_ROOT_DRIVE_URL;
  }
}

/**
 * Sets the current active Drive URL
 */
export function setActiveDriveUrl(driveUrl: string): void {
  if (typeof window !== 'undefined' && driveUrl?.trim()) {
    try {
      localStorage.setItem(STORAGE_CUSTOM_DRIVE_URL_KEY, driveUrl.trim());
    } catch (e) {
      console.error('Failed to save custom drive URL:', e);
    }
  }
}

/**
 * Checks whether a date string is within the last N days (default 14 days)
 */
export function isDateRecent(dateStr?: string, daysLimit = 14): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  try {
    // Check various date formats (YYYY-MM-DD, DD/MM/YYYY, ISO, Date(...))
    let timestamp = Date.parse(dateStr);
    
    if (isNaN(timestamp)) {
      // Try DD/MM/YYYY or DD/MM/YYYY, HH:mm
      const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (parts) {
        timestamp = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10)).getTime();
      }
    }

    if (isNaN(timestamp)) return false;

    const diffDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= daysLimit;
  } catch {
    return false;
  }
}

/**
 * Parses Google Visualization Table JSON response
 */
function parseGVizJSON(responseText: string): SheetCourseRecord[] {
  const jsonStart = responseText.indexOf('{');
  const jsonEnd = responseText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Invalid GViz JSON response format');
  }

  const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(jsonStr);
  const cols = data?.table?.cols || [];
  const rows = data?.table?.rows || [];

  // Helper to find column index by keyword in label
  const findColIdx = (keywords: string[], fallbackIdx: number): number => {
    const idx = cols.findIndex((col: any) =>
      col && col.label && keywords.some((k) => col.label.toLowerCase().includes(k.toLowerCase()))
    );
    return idx !== -1 ? idx : fallbackIdx;
  };

  const sttIdx = findColIdx(['stt', 'số thứ tự'], 0);
  const codeIdx = findColIdx(['mã môn', 'mã hp', 'mã'], 1);
  const nameIdx = findColIdx(['tên môn', 'tên học phần', 'tên'], 2);
  const categoryIdx = findColIdx(['loại môn học', 'loại môn', 'loại', 'danh mục', 'khối'], 3);
  const creditsIdx = findColIdx(['số tín chỉ', 'tín chỉ', 'số tc', 'tc', 'credits'], 4);
  const gradingIdx = findColIdx(['hệ số đánh giá', 'hệ số điểm', 'tỷ lệ điểm', 'đánh giá', 'grading', 'trọng số'], 5);
  const prereqIdx = findColIdx(['học phần tiên quyết', 'tiên quyết', 'môn học trước', 'điều kiện', 'prerequisites'], 6);
  const syllabusIdx = findColIdx(['nội dung lý thuyết', 'đề cương lý thuyết', 'đề cương tóm tắt', 'đề cương chi tiết', 'đề cương', 'lý thuyết', 'nội dung các chương', 'syllabus'], 7);
  const practicalIdx = findColIdx(['nội dung thực hành', 'đề cương thực hành', 'thực hành chi tiết', 'thực hành', 'bài lab', 'lab outline', 'lab'], 8);
  const examIdx = findColIdx(['hình thức thi', 'hình thức đánh giá', 'thi', 'exam'], 9);
  const urlIdx = findColIdx(['link google drive', 'link drive', 'drive', 'link'], 10);
  const lastUpdatedIdx = findColIdx(['lần cập nhật cuối', 'lần cập nhật', 'cập nhật', 'thời gian'], 11);
  const updatedByIdx = findColIdx(['nguồn cập nhật', 'nguồn', 'người cập nhật', 'người'], 12);
  const notesIdx = findColIdx(['ghi chú tài liệu mới', 'ghi chú', 'tài liệu mới', 'tài liệu'], 13);
  const descIdx = findColIdx(['mô tả môn học', 'mô tả học phần', 'mô tả', 'giới thiệu', 'description'], -1);

  const results: SheetCourseRecord[] = [];

  for (const row of rows) {
    const cells = row.c || [];
    const getVal = (idx: number): string => {
      if (idx < 0) return '';
      const cell = cells[idx];
      if (!cell) return '';
      if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
      if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
      return '';
    };

    const stt = getVal(sttIdx);
    const code = getVal(codeIdx);
    const name = getVal(nameIdx);
    const rawCategory = getVal(categoryIdx);
    const driveUrl = getVal(urlIdx);
    const lastUpdated = getVal(lastUpdatedIdx);
    const updatedBy = getVal(updatedByIdx);
    const notes = getVal(notesIdx);
    const creditsRaw = getVal(creditsIdx);
    const prerequisitesRaw = getVal(prereqIdx);
    const gradingWeightsRaw = getVal(gradingIdx);
    const descriptionRaw = getVal(descIdx);
    const syllabusRaw = getVal(syllabusIdx);
    const practicalOutlineRaw = getVal(practicalIdx);
    const examFormatRaw = getVal(examIdx);

    // Skip empty rows without code or name
    if (!code && !name) continue;

    results.push({
      stt: stt || undefined,
      code: code.toUpperCase().trim(),
      name: name.trim() || code.toUpperCase().trim(),
      category: rawCategory.trim(),
      driveUrl: driveUrl.trim() || ACTIVE_ROOT_DRIVE_URL,
      lastUpdated: lastUpdated.trim(),
      updatedBy: updatedBy.trim() || 'Hệ thống',
      notes: notes.trim(),
      creditsRaw: creditsRaw || undefined,
      prerequisitesRaw: prerequisitesRaw || undefined,
      gradingWeightsRaw: gradingWeightsRaw || undefined,
      descriptionRaw: descriptionRaw || undefined,
      syllabusRaw: syllabusRaw || undefined,
      practicalOutlineRaw: practicalOutlineRaw || undefined,
      examFormatRaw: examFormatRaw || undefined,
      isRecent: isDateRecent(lastUpdated)
    });
  }

  return results;
}

/**
 * Parses Google Sheets CSV Export as fallback
 */
function parseCSV(csvText: string): SheetCourseRecord[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results: SheetCourseRecord[] = [];

  const findIdx = (keywords: string[], fallbackIdx: number) => {
    const idx = headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
    return idx !== -1 ? idx : fallbackIdx;
  };

  const codeIdx = findIdx(['Mã môn', 'Mã HP', 'Mã'], 1);
  const nameIdx = findIdx(['Tên môn', 'Tên học phần', 'Tên'], 2);
  const categoryIdx = findIdx(['Loại môn', 'Loại', 'Danh mục', 'Khối'], 3);
  const urlIdx = findIdx(['Link Google Drive', 'Drive', 'Link'], 4);
  const updateIdx = findIdx(['Lần cập nhật', 'Cập nhật', 'Thời gian'], 5);
  const sourceIdx = findIdx(['Nguồn cập nhật', 'Nguồn', 'Người cập nhật'], 6);
  const noteIdx = findIdx(['Ghi chú', 'Tài liệu'], 7);
  const creditsIdx = findIdx(['Số tín chỉ', 'Tín chỉ', 'Số TC', 'TC', 'Credits'], 8);
  const prereqIdx = findIdx(['Học phần tiên quyết', 'Tiên quyết', 'Môn học trước', 'Điều kiện', 'Prerequisites'], 9);
  const gradingIdx = findIdx(['Hệ số đánh giá', 'Hệ số điểm', 'Tỷ lệ điểm', 'Đánh giá', 'Grading'], 10);
  const descIdx = findIdx(['Mô tả môn học', 'Mô tả học phần', 'Mô tả', 'Giới thiệu'], 11);
  const syllabusIdx = findIdx(['Đề cương tóm tắt', 'Đề cương lý thuyết', 'Đề cương chi tiết', 'Đề cương', 'Nội dung các chương', 'Syllabus'], 12);
  const practicalIdx = findIdx(['Đề cương thực hành', 'Thực hành chi tiết', 'Nội dung thực hành', 'Bài lab', 'Lab outline', 'Lab'], 13);
  const examIdx = findIdx(['Hình thức thi', 'Hình thức đánh giá', 'Thi'], 14);

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    if (!currentLine) continue;

    const values: string[] = [];
    let insideQuotes = false;
    let currentValue = '';

    for (const char of currentLine) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const code = (codeIdx >= 0 ? values[codeIdx] : values[1]) || '';
    const name = (nameIdx >= 0 ? values[nameIdx] : values[2]) || '';
    const rawCategory = (categoryIdx >= 0 ? values[categoryIdx] : values[3]) || '';
    const driveUrl = (urlIdx >= 0 ? values[urlIdx] : values[4]) || '';
    const lastUpdated = (updateIdx >= 0 ? values[updateIdx] : values[5]) || '';
    const updatedBy = (sourceIdx >= 0 ? values[sourceIdx] : values[6]) || '';
    const notes = (noteIdx >= 0 ? values[noteIdx] : values[7]) || '';
    const creditsRaw = (creditsIdx >= 0 ? values[creditsIdx] : '') || '';
    const prerequisitesRaw = (prereqIdx >= 0 ? values[prereqIdx] : '') || '';
    const gradingWeightsRaw = (gradingIdx >= 0 ? values[gradingIdx] : '') || '';
    const descriptionRaw = (descIdx >= 0 ? values[descIdx] : '') || '';
    const syllabusRaw = (syllabusIdx >= 0 ? values[syllabusIdx] : '') || '';
    const practicalOutlineRaw = (practicalIdx >= 0 ? values[practicalIdx] : '') || '';
    const examFormatRaw = (examIdx >= 0 ? values[examIdx] : '') || '';

    if (!code && !name) continue;

    results.push({
      stt: values[0] || i,
      code: code.toUpperCase().trim(),
      name: name.trim() || code.toUpperCase().trim(),
      category: rawCategory.trim(),
      driveUrl: driveUrl.trim() || ACTIVE_ROOT_DRIVE_URL,
      lastUpdated: lastUpdated.trim(),
      updatedBy: updatedBy.trim() || 'Hệ thống',
      notes: notes.trim(),
      creditsRaw: creditsRaw || undefined,
      prerequisitesRaw: prerequisitesRaw || undefined,
      gradingWeightsRaw: gradingWeightsRaw || undefined,
      descriptionRaw: descriptionRaw || undefined,
      syllabusRaw: syllabusRaw || undefined,
      practicalOutlineRaw: practicalOutlineRaw || undefined,
      examFormatRaw: examFormatRaw || undefined,
      isRecent: isDateRecent(lastUpdated)
    });
  }

  return results;
}

/**
 * Fetches course records from the connected Google Sheet
 */
export async function fetchCourseRecordsFromSheet(
  sheetId: string = ACTIVE_GOOGLE_SHEET_ID
): Promise<SheetCourseRecord[]> {
  try {
    // Try Google Visualization API first
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    const response = await fetch(gvizUrl);

    if (response.ok) {
      const text = await response.text();
      const records = parseGVizJSON(text);
      if (records.length > 0) {
        saveRecordsToLocalStorage(records);
        return records;
      }
    }
  } catch (gvizError) {
    console.warn('GViz fetch failed, trying CSV export:', gvizError);
  }

  // Fallback: CSV Export
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    const response = await fetch(csvUrl);

    if (response.ok) {
      const text = await response.text();
      const records = parseCSV(text);
      if (records.length > 0) {
        saveRecordsToLocalStorage(records);
        return records;
      }
    }
  } catch (csvError) {
    console.error('Failed to fetch from Google Sheets CSV:', csvError);
  }

  // If network failed, return cached data
  return getCachedSheetRecords();
}

/**
 * Saves fetched records to localStorage
 */
function saveRecordsToLocalStorage(records: SheetCourseRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(records));
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Failed to cache sheet data:', e);
  }
}

/**
 * Reads cached records from localStorage
 */
export function getCachedSheetRecords(): SheetCourseRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!cached) return [];
    const parsed: SheetCourseRecord[] = JSON.parse(cached);
    return parsed.map(r => ({
      ...r,
      isRecent: isDateRecent(r.lastUpdated)
    }));
  } catch {
    return [];
  }
}

/**
 * Gets the timestamp string of the last sync
 */
export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
}

/**
 * Helper to resolve and normalize subject category from raw string or code/name
 */
export function resolveSubjectCategory(
  rawCategory?: string,
  code: string = '',
  name: string = ''
): { category: SubjectCategory; categoryName: string } {
  const norm = (rawCategory || '').toLowerCase().trim();

  if (
    norm.includes('đại cương') ||
    norm.includes('dai cuong') ||
    norm.includes('general') ||
    norm.includes('toán') ||
    norm.includes('chính trị') ||
    norm.includes('triết') ||
    norm.includes('pháp luật') ||
    norm.includes('thể chất') ||
    norm.includes('quốc phòng')
  ) {
    return { category: 'general', categoryName: 'Môn học đại cương' };
  }

  if (
    norm.includes('cơ sở') ||
    norm.includes('co so') ||
    norm.includes('foundation')
  ) {
    return { category: 'foundation', categoryName: 'Môn học cơ sở ngành' };
  }

  if (
    norm.includes('chuyên ngành') ||
    norm.includes('chuyen nganh') ||
    norm.includes('specialized') ||
    norm.includes('chuyên sâu')
  ) {
    return { category: 'specialized', categoryName: 'Môn học chuyên ngành' };
  }

  if (
    norm.includes('tự chọn') ||
    norm.includes('tu chon') ||
    norm.includes('elective')
  ) {
    return { category: 'elective', categoryName: 'Môn học tự chọn' };
  }

  if (
    norm.includes('tốt nghiệp') ||
    norm.includes('tot nghiep') ||
    norm.includes('thực tập') ||
    norm.includes('khóa luận') ||
    norm.includes('đồ án') ||
    norm.includes('capstone')
  ) {
    return { category: 'capstone', categoryName: 'Đồ án & Khóa luận tốt nghiệp' };
  }

  // Fallback to infer from code or name
  const upperCode = code.toUpperCase();
  const lowerName = name.toLowerCase();

  if (
    upperCode.startsWith('MATH') ||
    upperCode.startsWith('POLI') ||
    upperCode.startsWith('PHYS') ||
    upperCode.startsWith('ENGL') ||
    upperCode.startsWith('PHIL') ||
    lowerName.includes('toán') ||
    lowerName.includes('đại số') ||
    lowerName.includes('giải tích') ||
    lowerName.includes('triết học') ||
    lowerName.includes('chủ nghĩa xã hội') ||
    lowerName.includes('kinh tế chính trị') ||
    lowerName.includes('tư tưởng hồ chí minh') ||
    lowerName.includes('pháp luật')
  ) {
    return { category: 'general', categoryName: 'Môn học đại cương' };
  }

  if (
    upperCode.startsWith('COMP104') ||
    lowerName.includes('khóa luận') ||
    lowerName.includes('tốt nghiệp') ||
    lowerName.includes('thực tập doanh nghiệp')
  ) {
    return { category: 'capstone', categoryName: 'Đồ án & Khóa luận tốt nghiệp' };
  }

  if (
    upperCode.startsWith('COMP103') ||
    lowerName.includes('tự chọn') ||
    lowerName.includes('chuyên đề')
  ) {
    return { category: 'elective', categoryName: 'Môn học tự chọn' };
  }

  if (
    upperCode.startsWith('COMP102') ||
    lowerName.includes('trí tuệ nhân tạo') ||
    lowerName.includes('web') ||
    lowerName.includes('bảo mật') ||
    lowerName.includes('di động') ||
    lowerName.includes('mạng máy tính nâng cao')
  ) {
    return { category: 'specialized', categoryName: 'Môn học chuyên ngành' };
  }

  return { category: 'foundation', categoryName: 'Môn học cơ sở ngành' };
}

/**
 * Helper to parse credits, theory, practical hours from raw string
 * Supported formats:
 * - "3" -> 3 credits (2 LT + 1 TH)
 * - "3 (2 LT + 1 TH)" or "3 (2LT, 1TH)" or "3 (LT: 2, TH: 1)"
 * - "4 (3 LT + 1 TH)"
 */
export function parseCreditsInfo(raw?: string): { credits: number; theoryHours: number; practicalHours: number } {
  if (!raw || !raw.trim()) {
    return { credits: 3, theoryHours: 2, practicalHours: 1 };
  }
  const str = raw.trim();
  const ltMatch = str.match(/(\d+)\s*(?:lt|lý thuyết|ly thuyet)/i);
  const thMatch = str.match(/(\d+)\s*(?:th|thực hành|thuc hanh)/i);
  const numMatch = str.match(/^(\d+)/) || str.match(/(\d+)\s*(?:tín chỉ|tc|credits)/i);

  const lt = ltMatch ? parseInt(ltMatch[1], 10) : 0;
  const th = thMatch ? parseInt(thMatch[1], 10) : 0;
  const total = numMatch ? parseInt(numMatch[1], 10) : (lt + th || 3);

  if (lt === 0 && th === 0) {
    if (total === 4) return { credits: 4, theoryHours: 3, practicalHours: 1 };
    if (total === 2) return { credits: 2, theoryHours: 2, practicalHours: 0 };
    return { credits: total, theoryHours: Math.max(1, total - 1), practicalHours: Math.min(1, total > 1 ? 1 : 0) };
  }

  return {
    credits: total || (lt + th),
    theoryHours: lt || total,
    practicalHours: th
  };
}

/**
 * Helper to parse grading weights from raw string
 * Supported formats:
 * - "30% QT, 70% CK" or "30% Quá trình, 70% Cuối kỳ"
 * - "10% CC, 20% GK, 30% TH, 40% CK"
 * - "30/70" or "30-70" (QT / CK)
 * - "20/30/50" (QT / GK / CK)
 * - "10/20/30/40" (QT / GK / TH / CK)
 */
export function parseGradingWeightsInfo(raw?: string): GradingWeights {
  const defaultWeights: GradingWeights = { process: 0.3, midterm: null, practical: 0.3, final: 0.4 };
  if (!raw || !raw.trim()) return defaultWeights;

  const str = raw.toLowerCase().trim();

  // Check labeled format
  const qtMatch = str.match(/(\d+)(?:%|\s*phần trăm)?\s*(?:qt|quá trình|chuyên cần|cc)/i);
  const gkMatch = str.match(/(\d+)(?:%|\s*phần trăm)?\s*(?:gk|giữa kỳ|giua ky)/i);
  const thMatch = str.match(/(\d+)(?:%|\s*phần trăm)?\s*(?:th|thực hành|thuc hanh|bài tập lớn|btl)/i);
  const ckMatch = str.match(/(\d+)(?:%|\s*phần trăm)?\s*(?:ck|cuối kỳ|cuoi ky|thi)/i);

  if (qtMatch || gkMatch || thMatch || ckMatch) {
    const qt = qtMatch ? parseInt(qtMatch[1], 10) / 100 : 0;
    const gk = gkMatch ? parseInt(gkMatch[1], 10) / 100 : null;
    const th = thMatch ? parseInt(thMatch[1], 10) / 100 : null;
    const ck = ckMatch ? parseInt(ckMatch[1], 10) / 100 : 0;

    return {
      process: qt || 0.3,
      midterm: gk,
      practical: th,
      final: ck || Math.max(0.1, 1 - (qt || 0) - (gk || 0) - (th || 0))
    };
  }

  // Check slash or hyphen format
  const parts = str.split(/[/\\-]/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
  if (parts.length === 2) {
    const p1 = parts[0] > 1 ? parts[0] / 100 : parts[0];
    const p2 = parts[1] > 1 ? parts[1] / 100 : parts[1];
    return { process: p1, midterm: null, practical: null, final: p2 };
  } else if (parts.length === 3) {
    const p1 = parts[0] > 1 ? parts[0] / 100 : parts[0];
    const p2 = parts[1] > 1 ? parts[1] / 100 : parts[1];
    const p3 = parts[2] > 1 ? parts[2] / 100 : parts[2];
    return { process: p1, midterm: p2, practical: null, final: p3 };
  } else if (parts.length >= 4) {
    const p1 = parts[0] > 1 ? parts[0] / 100 : parts[0];
    const p2 = parts[1] > 1 ? parts[1] / 100 : parts[1];
    const p3 = parts[2] > 1 ? parts[2] / 100 : parts[2];
    const p4 = parts[3] > 1 ? parts[3] / 100 : parts[3];
    return { process: p1, midterm: p2, practical: p3, final: p4 };
  }

  return defaultWeights;
}

/**
 * Helper to parse prerequisite courses from raw string
 * Supported formats:
 * - "COMP1800, MATH1001"
 * - "COMP1800 (Cơ sở toán), MATH1001 (Giải tích 1)"
 * - "Học trước: MATH1001; Tiên quyết: COMP1800"
 */
export function parsePrerequisitesInfo(raw?: string): {
  previousCourses: PrerequisiteCourse[];
  prerequisiteCourses: PrerequisiteCourse[];
} {
  if (
    !raw ||
    !raw.trim() ||
    raw.trim() === '-' ||
    raw.trim() === '--' ||
    raw.trim() === '—' ||
    raw.toLowerCase().includes('không') ||
    raw.toLowerCase().includes('none')
  ) {
    return { previousCourses: [], prerequisiteCourses: [] };
  }

  const items = raw.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
  const prereqs: PrerequisiteCourse[] = [];
  const previous: PrerequisiteCourse[] = [];

  for (const item of items) {
    if (item === '-' || item === '--' || item === '—' || item.toLowerCase() === 'không') continue;
    const isPrev = item.toLowerCase().includes('học trước') || item.toLowerCase().includes('trước');
    const clean = item.replace(/(?:tiên quyết|học trước|trước|prereq):?/gi, '').trim();

    const match = clean.match(/^([A-Za-z0-9_]+)(?:\s*\((.*?)\))?$/);
    if (match) {
      const code = match[1].toUpperCase();
      const name = match[2] ? match[2].trim() : code;
      if (isPrev) {
        previous.push({ code, name });
      } else {
        prereqs.push({ code, name });
      }
    } else if (clean && clean !== '-') {
      prereqs.push({ code: clean.toUpperCase(), name: clean });
    }
  }

  return { previousCourses: previous, prerequisiteCourses: prereqs };
}

/**
 * Helper to parse syllabus outline from raw string
 * Supported formats:
 * - Multi-line (Alt+Enter in Sheet) or separated by semicolon ;
 * - "Chương 1: Tiêu đề chương | Topic 1, Topic 2 | Mô tả chi tiết"
 * - "Chương 1: Tiêu đề; Chương 2: Tiêu đề..."
 */
export function parseSyllabusInfo(raw?: string, courseName?: string): SyllabusChapter[] {
  if (!raw || !raw.trim()) {
    return [
      {
        chapter: 1,
        title: `Tổng quan môn học ${courseName || ''}`,
        description: 'Tài liệu, giáo trình, bài giảng và hướng dẫn học tập theo đề cương.'
      }
    ];
  }

  const lines = raw.split(/[\n\r;]+/).map(l => l.trim()).filter(Boolean);
  const chapters: SyllabusChapter[] = [];

  lines.forEach((line, idx) => {
    let chNum = idx + 1;
    let title = line;
    let description = '';
    let topics: string[] = [];

    const chMatch = line.match(/^(?:chương|ch|bài|phần|chapter)\s*(\d+)[:\.\-]\s*(.*)$/i);
    if (chMatch) {
      chNum = parseInt(chMatch[1], 10);
      title = chMatch[2].trim();
    }

    if (title.includes('|')) {
      const subParts = title.split('|').map(s => s.trim());
      title = subParts[0];
      if (subParts[1]) {
        topics = subParts[1].split(',').map(t => t.trim()).filter(Boolean);
      }
      if (subParts[2]) {
        description = subParts[2];
      } else {
        description = `Nội dung trọng tâm của Chương ${chNum}: ${title}.`;
      }
    } else {
      description = `Nội dung trọng tâm của Chương ${chNum}: ${title}.`;
    }

    chapters.push({
      chapter: chNum,
      title: title || `Chương ${chNum}`,
      description: description,
      topics: topics.length > 0 ? topics : undefined
    });
  });

  return chapters;
}

/**
 * Helper to parse practical / lab outline from raw string
 * Supported formats:
 * - Multi-line (Alt+Enter in Sheet) or separated by semicolon ;
 * - "Bài 1: Làm quen với môi trường | VS Code, GCC | Cài đặt và cấu hình"
 * - "Lab 1: Cài đặt công cụ; Lab 2: Lập trình hàm..."
 */
export function parsePracticalOutlineInfo(raw?: string, courseName?: string): LabExerciseOutline[] | undefined {
  if (!raw || !raw.trim()) {
    return undefined;
  }

  const clean = raw.trim().toLowerCase();
  if (
    clean === 'không có' ||
    clean === 'không' ||
    clean === '-' ||
    clean === '--' ||
    clean === '—' ||
    clean === 'none' ||
    clean === 'null' ||
    clean.startsWith('không có')
  ) {
    return undefined;
  }

  const lines = raw.split(/[\n\r;]+/).map(l => l.trim()).filter(Boolean);
  const labs: LabExerciseOutline[] = [];

  lines.forEach((line, idx) => {
    let labNum = idx + 1;
    let title = line;
    let description = '';
    let toolsOrTech: string[] = [];

    const labMatch = line.match(/^(?:bài\s*(?:thực\s*hành|th|lab)?|lab)\s*(\d+)[:\.\-]\s*(.*)$/i);
    if (labMatch) {
      labNum = parseInt(labMatch[1], 10);
      title = labMatch[2].trim();
    }

    if (title.includes('|')) {
      const subParts = title.split('|').map(s => s.trim());
      title = subParts[0];
      if (subParts[1]) {
        toolsOrTech = subParts[1].split(',').map(t => t.trim()).filter(Boolean);
      }
      if (subParts[2]) {
        description = subParts[2];
      } else {
        description = `Yêu cầu và hướng dẫn thực hành cho Bài ${labNum}: ${title}.`;
      }
    } else {
      description = `Yêu cầu và hướng dẫn thực hành cho Bài ${labNum}: ${title}.`;
    }

    labs.push({
      labNumber: labNum,
      title: title || `Bài thực hành ${labNum}`,
      description,
      toolsOrTech: toolsOrTech.length > 0 ? toolsOrTech : undefined
    });
  });

  return labs.length > 0 ? labs : undefined;
}

/**
 * Merges the base subjects JSON list with live data from Google Sheets.
 * If a subject is defined in the sheet:
 * - Updates name, category, categoryName
 * - Updates driveUrl
 * - Updates lastUpdated
 * - Updates updatedBy
 * - Updates updateNotes
 * - Updates credits, gradingWeights, prerequisites, syllabus, practicalOutline, description, examFormat if present
 * If the subject does NOT exist in base subjects, creates a new subject object!
 */
export function mergeSubjectsWithSheet(
  baseSubjects: Subject[],
  sheetRecords: SheetCourseRecord[]
): Subject[] {
  if (!sheetRecords || sheetRecords.length === 0) {
    return baseSubjects;
  }

  const recordMap = new Map<string, SheetCourseRecord>();
  sheetRecords.forEach(r => {
    if (r.code) {
      recordMap.set(r.code.toUpperCase().trim(), r);
    }
  });

  const updatedBase = baseSubjects.map(sub => {
    const code = sub.code.toUpperCase().trim();
    const sheetData = recordMap.get(code);

    if (sheetData) {
      recordMap.delete(code); // Mark as merged
      const resolvedCat = sheetData.category
        ? resolveSubjectCategory(sheetData.category, code, sheetData.name || sub.name)
        : { category: sub.category, categoryName: sub.categoryName };

      const creditsInfo = sheetData.creditsRaw ? parseCreditsInfo(sheetData.creditsRaw) : null;
      const gradingWeights = sheetData.gradingWeightsRaw ? parseGradingWeightsInfo(sheetData.gradingWeightsRaw) : sub.gradingWeights;
      const prerequisites = sheetData.prerequisitesRaw ? parsePrerequisitesInfo(sheetData.prerequisitesRaw) : sub.prerequisites;
      const syllabus = sheetData.syllabusRaw !== undefined ? parseSyllabusInfo(sheetData.syllabusRaw, sheetData.name || sub.name) : sub.syllabus;
      const practicalOutline = sheetData.practicalOutlineRaw !== undefined ? parsePracticalOutlineInfo(sheetData.practicalOutlineRaw, sheetData.name || sub.name) : sub.practicalOutline;
      const description = sheetData.descriptionRaw?.trim() || sub.description;
      const examFormat = sheetData.examFormatRaw?.trim() || sub.examFormat;

      return {
        ...sub,
        name: sheetData.name || sub.name,
        category: resolvedCat.category,
        categoryName: resolvedCat.categoryName,
        driveUrl: sheetData.driveUrl || sub.driveUrl,
        lastUpdated: sheetData.lastUpdated || sub.lastUpdated,
        updatedBy: sheetData.updatedBy || 'Google Sheet Admin',
        updateNotes: sheetData.notes || undefined,
        description,
        examFormat,
        credits: creditsInfo ? creditsInfo.credits : sub.credits,
        theoryHours: creditsInfo ? creditsInfo.theoryHours : sub.theoryHours,
        practicalHours: creditsInfo ? creditsInfo.practicalHours : sub.practicalHours,
        gradingWeights,
        prerequisites,
        syllabus,
        practicalOutline
      };
    }
    return sub;
  });

  // Any remaining records in recordMap are brand new courses from Google Sheet!
  const newSubjectsFromSheet: Subject[] = [];
  recordMap.forEach((record, code) => {
    if (!code) return;
    const { category, categoryName } = resolveSubjectCategory(record.category, code, record.name);
    const creditsInfo = parseCreditsInfo(record.creditsRaw);
    const gradingWeights = parseGradingWeightsInfo(record.gradingWeightsRaw);
    const prerequisites = parsePrerequisitesInfo(record.prerequisitesRaw);
    const syllabus = parseSyllabusInfo(record.syllabusRaw, record.name);
    const practicalOutline = parsePracticalOutlineInfo(record.practicalOutlineRaw, record.name);
    const description = record.descriptionRaw?.trim() || record.notes || `Tài liệu học tập học phần ${record.name} (${code})`;
    const examFormat = record.examFormatRaw?.trim() || 'Thi tập trung';

    newSubjectsFromSheet.push({
      id: code.toLowerCase().replace(/[^a-z0-9]/g, ''),
      code: code,
      name: record.name,
      englishName: '',
      category,
      categoryName,
      semester: 'Học kỳ chính',
      credits: creditsInfo.credits,
      theoryHours: creditsInfo.theoryHours,
      practicalHours: creditsInfo.practicalHours,
      description,
      driveUrl: record.driveUrl || ACTIVE_ROOT_DRIVE_URL,
      lastUpdated: record.lastUpdated || new Date().toISOString().split('T')[0],
      updatedBy: record.updatedBy || 'Google Sheets',
      updateNotes: record.notes,
      isCustomFromSheet: true,
      gradingWeights,
      prerequisites,
      syllabus,
      practicalOutline,
      examFormat,
      resourcesCount: {
        slides: 10,
        exams: 4,
        labs: 4,
        projects: 2
      }
    });
  });

  return [...newSubjectsFromSheet, ...updatedBase];
}

/**
 * Returns Google Apps Script templates for Google Sheets automation
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATES = {
  scanDriveFolders: `/**
 * Tự động quét toàn bộ thư mục con từ Google Drive vào Google Sheet này
 * 1. Vào Tiện ích mở rộng (Extensions) -> Apps Script
 * 2. Dán đoạn mã này vào và bấm Chạy (Run)
 */
function scanAllDriveFoldersToSheet() {
  var parentFolderId = "${ACTIVE_ROOT_DRIVE_FOLDER_ID}";
  var folder = DriveApp.getFolderById(parentFolderId);
  var subFolders = folder.getFolders();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Xóa các dòng cũ nếu cần, hoặc ghi tiếp
  var data = sheet.getDataRange().getValues();
  var existingCodes = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][1]) existingCodes[String(data[i][1]).trim().toUpperCase()] = i + 1;
  }
  
  var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm");
  var count = 0;
  
  while (subFolders.hasNext()) {
    var sub = subFolders.next();
    var folderName = sub.getName();
    var folderUrl = sub.getUrl();
    var lastUpdated = Utilities.formatDate(sub.getLastUpdated(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm");
    
    // Tự động phân tách Mã môn (ví dụ: COMP1011 - Cơ sở dữ liệu)
    var code = folderName.split(/[-_:]/)[0].trim().toUpperCase();
    var name = folderName.includes('-') ? folderName.split('-').slice(1).join('-').trim() : folderName;
    
    if (existingCodes[code]) {
      var row = existingCodes[code];
      sheet.getRange(row, 4).setValue(folderUrl);
      sheet.getRange(row, 5).setValue(lastUpdated);
    } else {
      var newRow = sheet.getLastRow() + 1;
      sheet.appendRow([newRow - 1, code, name, folderUrl, lastUpdated, "Drive Auto-Scan", "Quét tự động từ Drive"]);
    }
    count++;
  }
  
  SpreadsheetApp.getUi().alert("Đã đồng bộ xong " + count + " thư mục từ Google Drive!");
}`,

  autoTimestampOnEdit: `/**
 * Tự động điền ngày giờ cập nhật khi có người sửa link Drive hoặc nội dung
 */
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();
  
  // Bỏ qua dòng tiêu đề
  if (row <= 1) return;
  
  // Nếu sửa cột Mã môn, Link Drive hoặc Ghi chú (cột 2, 3, 4, 7)
  if (col === 2 || col === 3 || col === 4 || col === 7) {
    var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm");
    sheet.getRange(row, 5).setValue(now); // Ghi vào Cột 5 (Lần cập nhật cuối)
    if (!sheet.getRange(row, 6).getValue()) {
      sheet.getRange(row, 6).setValue("Chỉnh sửa thủ công");
    }
  }
}`
};
