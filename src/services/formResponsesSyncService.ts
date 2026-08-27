/**
 * Google Form Responses Sync Service
 * 
 * Target Google Form Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1qLySrJx0iyb0_2_JUVTs7Ommm5w3yPcxanP9N3C_lK8/edit?usp=sharing
 * 
 * Form Structure:
 * - Col 0 (A): Timestamp (Dấu thời gian)
 * - Col 1 (B): Contributor Name (Tên người đóng góp)
 * - Col 2 (C): Student ID (MSSV)
 * - Col 3 (D): Email
 * - Col 4 (E): Description (Loại tài liệu - Mã môn học - Tên môn học - Học kỳ)
 * - Col 5 (F): Drive File Link (Link đóng góp tài liệu)
 */

import { FirestoreContribution, fetchAllContributions, submitContributionToFirestore } from './contributionService';
import subjectsData from '../data/subjects.json';
import { Subject } from '../types';

export const DEFAULT_FORM_RESPONSES_SHEET_ID = '1qLySrJx0iyb0_2_JUVTs7Ommm5w3yPcxanP9N3C_lK8';
export const DEFAULT_FORM_RESPONSES_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_FORM_RESPONSES_SHEET_ID}/edit?usp=sharing`;

const STORAGE_CUSTOM_FORM_SHEET_KEY = 'fit_studyvault_custom_form_responses_sheet_id';

export interface FormResponseRow {
  timestamp: string;
  contributorName: string;
  studentId: string;
  email: string;
  rawDescription: string;
  driveUrl: string;
  // Parsed metadata
  parsedAssetType: string;
  parsedSubjectCode: string;
  parsedSubjectName: string;
  semesterInfo?: string;
}

export interface FormSyncResult {
  totalInSheet: number;
  newImported: number;
  alreadyExisted: number;
  importedItems: FirestoreContribution[];
  errors: string[];
}

/**
 * Extracts Sheet ID from URL or raw ID
 */
export function extractFormSheetId(input?: string): string {
  if (!input || typeof input !== 'string') return DEFAULT_FORM_RESPONSES_SHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (trimmed.length > 15 && !trimmed.includes('/')) return trimmed;
  return DEFAULT_FORM_RESPONSES_SHEET_ID;
}

export function getActiveFormSheetId(): string {
  if (typeof window === 'undefined') return DEFAULT_FORM_RESPONSES_SHEET_ID;
  try {
    const saved = localStorage.getItem(STORAGE_CUSTOM_FORM_SHEET_KEY);
    return saved ? extractFormSheetId(saved) : DEFAULT_FORM_RESPONSES_SHEET_ID;
  } catch {
    return DEFAULT_FORM_RESPONSES_SHEET_ID;
  }
}

export function setActiveFormSheetId(sheetIdOrUrl: string): string {
  const extracted = extractFormSheetId(sheetIdOrUrl);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_CUSTOM_FORM_SHEET_KEY, extracted);
    } catch (e) {
      console.error('Failed to save custom form sheet ID:', e);
    }
  }
  return extracted;
}

/**
 * Smartly parse description text from Google Form into Asset Type, Subject Code, Subject Name, and Semester
 */
export function parseFormDescription(desc: string): {
  assetType: string;
  subjectCode: string;
  subjectName: string;
  semester: string;
} {
  const text = (desc || '').trim();
  const lower = text.toLowerCase();

  // 1. Detect Asset Type
  let assetType = 'document';
  if (lower.includes('đề thi') || lower.includes('đề thu') || lower.includes('kiểm tra') || lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) {
    assetType = 'exam';
  } else if (lower.includes('bài tập') || lower.includes('lab') || lower.includes('thực hành') || lower.includes('exercise') || lower.includes('assignment')) {
    assetType = 'exercise';
  } else if (lower.includes('bài giảng') || lower.includes('slide') || lower.includes('giáo trình') || lower.includes('lecture') || lower.includes('lý thuyết')) {
    assetType = 'lecture';
  } else if (lower.includes('đồ án') || lower.includes('báo cáo') || lower.includes('project') || lower.includes('tiểu luận') || lower.includes('source code')) {
    assetType = 'project';
  }

  // 2. Extract Subject Code
  const allSubjects = subjectsData as Subject[];
  let subjectCode = '';
  let subjectName = '';
  let semester = '';

  // Look for standard course codes: COMP1010, MATH1001, EDUC1002, PHYS1001, etc.
  const codeRegex = /\b([A-Z]{3,5}\d{3,5}[A-Z]?)\b/i;
  const codeMatch = text.match(codeRegex);

  if (codeMatch && codeMatch[1]) {
    subjectCode = codeMatch[1].toUpperCase();
    const matchedSubject = allSubjects.find(s => s.code.toUpperCase() === subjectCode);
    if (matchedSubject) {
      subjectName = matchedSubject.name;
    }
  }

  // If no subject code matched directly, search by subject name in text
  if (!subjectCode) {
    for (const sub of allSubjects) {
      if (lower.includes(sub.name.toLowerCase())) {
        subjectCode = sub.code;
        subjectName = sub.name;
        break;
      }
    }
  }

  // 3. Fallback: Parse parts delimited by hyphen `-` or `_`
  const parts = text.split(/[-–—]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // If we haven't found subjectName yet
    if (!subjectName) {
      for (const p of parts) {
        const found = allSubjects.find(s => s.name.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(s.name.toLowerCase()));
        if (found) {
          subjectCode = found.code;
          subjectName = found.name;
          break;
        }
      }
    }

    // Try to extract semester info e.g. HK1 2025-2026, HK2 2024_2025, 2022-2023
    for (const p of parts) {
      if (/hk\s*\d|học\s*kỳ|202\d/i.test(p)) {
        semester = p;
        break;
      }
    }
  }

  // Fallback subject code if still empty
  if (!subjectCode) {
    subjectCode = 'COMP_GENERAL';
    subjectName = text || 'Tài liệu học phần CNTT';
  }

  return { assetType, subjectCode, subjectName, semester };
}

/**
 * Parses raw CSV into FormResponseRow objects
 */
function parseCsvRows(csvText: string): FormResponseRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Simple robust CSV tokenizer supporting quoted fields
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const rows: FormResponseRow[] = [];

  // Skip header line (index 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;

    const timestamp = cols[0] || '';
    const contributorName = cols[1] || 'Sinh viên FIT HCMUE';
    const studentId = cols[2] || '';
    const email = cols[3] || '';
    const rawDescription = cols[4] || '';
    const driveUrl = cols[5] || '';

    // If driveUrl is in rawDescription or vice versa, handle gracefully
    let effectiveDriveUrl = driveUrl;
    if (!effectiveDriveUrl.startsWith('http') && rawDescription.startsWith('http')) {
      effectiveDriveUrl = rawDescription;
    }

    if (!effectiveDriveUrl && !rawDescription) continue;

    const parsed = parseFormDescription(rawDescription);

    rows.push({
      timestamp,
      contributorName: contributorName.trim() || 'Sinh viên FIT HCMUE',
      studentId: studentId.trim(),
      email: email.trim(),
      rawDescription,
      driveUrl: effectiveDriveUrl.trim(),
      parsedAssetType: parsed.assetType,
      parsedSubjectCode: parsed.subjectCode,
      parsedSubjectName: parsed.subjectName,
      semesterInfo: parsed.semester
    });
  }

  return rows;
}

/**
 * Fetches all Form responses from Google Sheets
 */
export async function fetchGoogleFormResponses(sheetIdOrUrl?: string): Promise<FormResponseRow[]> {
  const sheetId = sheetIdOrUrl ? extractFormSheetId(sheetIdOrUrl) : getActiveFormSheetId();
  
  // Try CSV export endpoint first (very fast and reliable)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from Google Sheets CSV endpoint`);
    }
    const csvText = await res.text();
    const rows = parseCsvRows(csvText);
    return rows;
  } catch (csvErr) {
    console.warn('CSV fetch failed, trying GViz endpoint:', csvErr);
    
    // Fallback: Google Visualization API
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    const gvizRes = await fetch(gvizUrl);
    if (!gvizRes.ok) {
      throw new Error(`Cannot connect to Google Sheet (${gvizRes.status})`);
    }
    const text = await gvizRes.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Invalid GViz response');
    }
    const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    const tableRows = data?.table?.rows || [];

    const rows: FormResponseRow[] = [];
    tableRows.forEach((r: any) => {
      const c = r?.c || [];
      const timestamp = c[0]?.f || c[0]?.v?.toString() || '';
      const contributorName = c[1]?.v?.toString() || 'Sinh viên FIT HCMUE';
      const studentId = c[2]?.v?.toString() || '';
      const email = c[3]?.v?.toString() || '';
      const rawDescription = c[4]?.v?.toString() || '';
      const driveUrl = c[5]?.v?.toString() || '';

      if (!driveUrl && !rawDescription) return;

      const parsed = parseFormDescription(rawDescription);

      rows.push({
        timestamp,
        contributorName: contributorName.trim() || 'Sinh viên FIT HCMUE',
        studentId: studentId.trim(),
        email: email.trim(),
        rawDescription,
        driveUrl: driveUrl.trim(),
        parsedAssetType: parsed.assetType,
        parsedSubjectCode: parsed.subjectCode,
        parsedSubjectName: parsed.subjectName,
        semesterInfo: parsed.semester
      });
    });

    return rows;
  }
}

/**
 * Synchronizes Google Form Responses into Firestore Contributions
 * Prevents duplicating entries based on Drive URL and StudentID+Timestamp
 */
export async function syncGoogleFormResponsesToContributions(
  sheetIdOrUrl?: string
): Promise<FormSyncResult> {
  const result: FormSyncResult = {
    totalInSheet: 0,
    newImported: 0,
    alreadyExisted: 0,
    importedItems: [],
    errors: []
  };

  try {
    // 1. Fetch form responses from Sheet
    const formRows = await fetchGoogleFormResponses(sheetIdOrUrl);
    result.totalInSheet = formRows.length;

    if (formRows.length === 0) {
      return result;
    }

    // 2. Fetch existing contributions to avoid duplicates
    const existingContribs = await fetchAllContributions();

    // Map existing items by driveUrl or combination of studentId + rawDescription
    const existingUrls = new Set(existingContribs.map(c => c.driveUrl.trim().toLowerCase()).filter(Boolean));
    const existingSignatures = new Set(
      existingContribs.map(c => `${c.studentId || ''}_${c.targetSubjectCode || ''}_${c.contributorName || ''}`.toLowerCase())
    );

    // 3. Process each form row
    for (const row of formRows) {
      const normalizedDriveUrl = row.driveUrl.trim().toLowerCase();
      const signature = `${row.studentId}_${row.parsedSubjectCode}_${row.contributorName}`.toLowerCase();

      // Check if already imported
      const isDuplicate = 
        (normalizedDriveUrl && existingUrls.has(normalizedDriveUrl)) ||
        (existingSignatures.has(signature) && existingUrls.has(normalizedDriveUrl));

      if (isDuplicate) {
        result.alreadyExisted++;
        continue;
      }

      // Create new pending contribution
      const submitRes = await submitContributionToFirestore({
        targetSubjectCode: row.parsedSubjectCode,
        customSubjectName: row.parsedSubjectName,
        assetType: row.parsedAssetType,
        driveUrl: row.driveUrl,
        filesCount: 1,
        contributorName: row.contributorName,
        studentId: row.studentId,
        className: '',
        email: row.email,
        notes: `[Google Form] ${row.rawDescription}${row.timestamp ? ` (Gửi lúc: ${row.timestamp})` : ''}`
      });

      if (submitRes.success) {
        result.newImported++;
        existingUrls.add(normalizedDriveUrl);
        existingSignatures.add(signature);
        
        result.importedItems.push({
          id: submitRes.id,
          targetSubjectCode: row.parsedSubjectCode,
          targetSubjectName: row.parsedSubjectName,
          assetType: row.parsedAssetType,
          driveUrl: row.driveUrl,
          filesCount: 1,
          contributorName: row.contributorName,
          studentId: row.studentId,
          email: row.email,
          notes: `[Google Form] ${row.rawDescription}`,
          status: 'pending',
          createdAt: row.timestamp || new Date().toISOString()
        });
      }
    }

    return result;
  } catch (err: any) {
    console.error('Error syncing Google Form responses:', err);
    result.errors.push(err?.message || 'Không thể kết nối hoặc đồng bộ Google Form Sheet.');
    return result;
  }
}
