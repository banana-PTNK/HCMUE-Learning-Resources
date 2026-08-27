/**
 * Google Drive Course Folder Configuration & Utility Manager
 * 
 * Centralized mapping of Course Codes to their corresponding Google Drive folder IDs & URLs.
 * Easily maintain, add, or update document storage links for subjects across FIT - HCMUE.
 */

import {
  ACTIVE_GOOGLE_SHEET_ID,
  ACTIVE_GOOGLE_SHEET_URL,
  getCachedSheetRecords,
} from '../services/googleSheetSyncService';

// Root Google Drive Folder ID for FIT HCMUE StudyVault
export const ROOT_DRIVE_FOLDER_ID = '1zJP7wImUinP4lIEMra-eMmiayhRWhQfJ';

// Full URL to the Root Google Drive Folder
export const ROOT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${ROOT_DRIVE_FOLDER_ID}?usp=drive_link`;

// Connected Google Sheet
export const GOOGLE_SHEET_ID = ACTIVE_GOOGLE_SHEET_ID;
export const GOOGLE_SHEET_URL = ACTIVE_GOOGLE_SHEET_URL;

// Google Form URL for Document Contributions
export const OFFICIAL_CONTRIBUTION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd_LfST6nUe2VxxRmZvHPcOnqKp6rQH_qFCDd9DuuqyxIGGhA/viewform';

/**
 * Mapping of Course Codes to their Google Drive Folder IDs or Folder Paths.
 * 
 * HOW TO UPDATE:
 * To point a subject to a new folder, simply replace or add the folder ID below:
 * e.g., 'COMP1011': '1zJP7wImUinP4lIEMra-eMmiayhRWhQfJ' or custom folder ID.
 */
export const COURSE_DRIVE_FOLDER_IDS: Record<string, string> = {
  // --- Môn học cơ sở ngành (Foundation) ---
  'COMP1011': '1HCMUE-FIT-COMP1011-Database',       // Cơ sở dữ liệu
  'COMP1012': '1HCMUE-FIT-COMP1012-DSA',            // Cấu trúc dữ liệu & Giải thuật
  'COMP1013': '1HCMUE-FIT-COMP1013-OOP',            // Lập trình hướng đối tượng
  'COMP1014': '1HCMUE-FIT-COMP1014-CompArch',       // Kiến trúc máy tính & Hợp ngữ
  'COMP1015': '1HCMUE-FIT-COMP1015-OS',             // Hệ điều hành
  'COMP1016': '1HCMUE-FIT-COMP1016-Networking',     // Mạng máy tính căn bản

  // --- Môn học đại cương & Toán (General & Math) ---
  'MATH101': '1HCMUE-FIT-MATH101-LinearAlgebra',    // Toán rời rạc & Đại số tuyến tính
  'MATH102': '1HCMUE-FIT-MATH102-Calculus',         // Giải tích & Xác suất thống kê

  // --- Môn học chuyên ngành (Specialized) ---
  'COMP1021': '1HCMUE-FIT-COMP1021-WebDev',         // Phát triển ứng dụng Web
  'COMP1022': '1HCMUE-FIT-COMP1022-AIML',           // Trí tuệ nhân tạo & Học máy
  'COMP1023': '1HCMUE-FIT-COMP1023-Security',       // An toàn & Bảo mật hệ thống thông tin

  // --- Môn học tự chọn (Elective) ---
  'COMP1031': '1HCMUE-FIT-COMP1031-ComputerVision', // Thị giác máy tính ứng dụng
  'COMP1032': '1HCMUE-FIT-COMP1032-NLP',            // Xử lý ngôn ngữ tự nhiên

  // --- Đồ án & Khóa luận tốt nghiệp (Capstone & Thesis) ---
  'COMP1041': '1HCMUE-FIT-COMP1041-Capstone1',      // Đồ án chuyên ngành 1
  'COMP1044': '1HCMUE-FIT-COMP1044-Thesis',         // Khóa luận tốt nghiệp cử nhân
};

/**
 * Storage key for client-side dynamic overrides (e.g. if updated via UI/testing)
 */
const STORAGE_KEY_OVERRIDES = 'fit_studyvault_drive_overrides_v1';

/**
 * Converts any Google Drive folder ID into a full web URL
 */
export function formatDriveFolderUrl(folderIdOrUrl: string): string {
  if (!folderIdOrUrl) return ROOT_DRIVE_FOLDER_URL;
  if (folderIdOrUrl.startsWith('http://') || folderIdOrUrl.startsWith('https://')) {
    return folderIdOrUrl;
  }
  return `https://drive.google.com/drive/folders/${folderIdOrUrl}`;
}

/**
 * Extracts the Google Drive Folder ID from a URL or raw ID
 */
export function extractDriveFolderId(urlOrId: string): string {
  if (!urlOrId) return ROOT_DRIVE_FOLDER_ID;
  const match = urlOrId.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (!urlOrId.includes('/') && !urlOrId.includes(':')) {
    return urlOrId.trim();
  }
  return ROOT_DRIVE_FOLDER_ID;
}

/**
 * Get all runtime overrides saved in localStorage (if any)
 */
function getLocalOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Returns the Google Drive folder URL for a specific course code.
 * 
 * Priority:
 * 1. Local custom override in localStorage (if set)
 * 2. Static COURSE_DRIVE_FOLDER_IDS mapping
 * 3. Optional fallback URL provided by caller (e.g. from subjects.json)
 * 4. ROOT_DRIVE_FOLDER_URL
 */
export function getDriveUrlForCourse(courseCode: string, fallbackUrl?: string): string {
  if (!courseCode && !fallbackUrl) return ROOT_DRIVE_FOLDER_URL;
  
  const normalizedCode = (courseCode || '').toUpperCase().trim();
  const overrides = getLocalOverrides();

  // 1. Priority 1: User runtime local override (if explicitly modified)
  if (normalizedCode && overrides[normalizedCode]) {
    return formatDriveFolderUrl(overrides[normalizedCode]);
  }

  // 2. Priority 2: Direct driveUrl passed from subject (which was merged with live Google Sheet)
  if (fallbackUrl && fallbackUrl.trim().length > 0 && fallbackUrl !== ROOT_DRIVE_FOLDER_URL) {
    return formatDriveFolderUrl(fallbackUrl);
  }

  // 3. Priority 3: Check live Google Sheet cached records for direct folder link
  if (normalizedCode) {
    const sheetRecords = getCachedSheetRecords();
    const sheetMatch = sheetRecords.find(r => r.code.toUpperCase().trim() === normalizedCode);
    if (sheetMatch && sheetMatch.driveUrl && sheetMatch.driveUrl.trim().length > 0 && sheetMatch.driveUrl !== ROOT_DRIVE_FOLDER_URL) {
      return formatDriveFolderUrl(sheetMatch.driveUrl);
    }
  }

  // 4. Priority 4: Static COURSE_DRIVE_FOLDER_IDS mapping
  if (normalizedCode) {
    const folderId = COURSE_DRIVE_FOLDER_IDS[normalizedCode];
    if (folderId) {
      return formatDriveFolderUrl(folderId);
    }
  }

  // 5. Priority 5: Fallback to fallbackUrl if exists
  if (fallbackUrl && fallbackUrl.trim().length > 0) {
    return formatDriveFolderUrl(fallbackUrl);
  }

  // 6. Default: Root Drive Folder
  return ROOT_DRIVE_FOLDER_URL;
}

/**
 * Returns the Google Drive folder ID for a course code.
 */
export function getDriveFolderIdForCourse(courseCode: string): string {
  const url = getDriveUrlForCourse(courseCode);
  return extractDriveFolderId(url);
}

/**
 * Helper to update or override a course's Drive link at runtime.
 */
export function setCourseDriveFolderOverride(courseCode: string, folderIdOrUrl: string): void {
  if (typeof window === 'undefined' || !courseCode) return;
  try {
    const normalizedCode = courseCode.toUpperCase().trim();
    const current = getLocalOverrides();
    current[normalizedCode] = folderIdOrUrl.trim();
    localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save drive folder override:', err);
  }
}

/**
 * Resets a course's Drive link override back to default.
 */
export function resetCourseDriveFolderOverride(courseCode: string): void {
  if (typeof window === 'undefined' || !courseCode) return;
  try {
    const normalizedCode = courseCode.toUpperCase().trim();
    const current = getLocalOverrides();
    delete current[normalizedCode];
    localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to reset drive folder override:', err);
  }
}

/**
 * Returns the complete dictionary of Course Code -> Full Drive URL (including any active overrides).
 */
export function getAllCourseDriveUrls(): Record<string, string> {
  const result: Record<string, string> = {};
  const overrides = getLocalOverrides();

  // Populate base mapping
  for (const [code, folderId] of Object.entries(COURSE_DRIVE_FOLDER_IDS)) {
    result[code] = formatDriveFolderUrl(folderId);
  }

  // Apply overrides
  for (const [code, overrideVal] of Object.entries(overrides)) {
    result[code] = formatDriveFolderUrl(overrideVal);
  }

  return result;
}

export default {
  ROOT_DRIVE_FOLDER_ID,
  ROOT_DRIVE_FOLDER_URL,
  OFFICIAL_CONTRIBUTION_FORM_URL,
  COURSE_DRIVE_FOLDER_IDS,
  getDriveUrlForCourse,
  getDriveFolderIdForCourse,
  formatDriveFolderUrl,
  extractDriveFolderId,
  setCourseDriveFolderOverride,
  resetCourseDriveFolderOverride,
  getAllCourseDriveUrls
};
