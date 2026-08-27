/**
 * Subject Storage Mapping & Google Drive Folder ID Configuration
 * 
 * Maps subject/course codes (e.g., 'CS101', 'COMP1011', 'MATH101') to their unique 
 * Google Drive folder IDs, enabling centralized maintenance of document storage links.
 */

// Default root Google Drive folder ID for FIT HCMUE StudyVault
export const DEFAULT_ROOT_DRIVE_FOLDER_ID = '1zJP7wImUinP4lIEMra-eMmiayhRWhQfJ';

// Full URL to root drive folder
export const DEFAULT_ROOT_DRIVE_URL = `https://drive.google.com/drive/folders/${DEFAULT_ROOT_DRIVE_FOLDER_ID}?usp=drive_link`;

/**
 * Configuration mapping of Subject Codes to their unique Google Drive Folder IDs
 */
export const subjectDriveFolderMap: Record<string, string> = {
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

  // --- Alias & Common Code Mappings ---
  'CS101': '1HCMUE-FIT-COMP1011-Database',
  'IT001': '1HCMUE-FIT-COMP1012-DSA',
  'IT002': '1HCMUE-FIT-COMP1013-OOP',
};

// Constant alias for subjectDriveFolderMap
export const SUBJECT_DRIVE_FOLDER_MAP = subjectDriveFolderMap;

/**
 * Safely retrieves the Google Drive Folder ID for a subject code.
 * 
 * @param subjectCode The course/subject code (e.g., 'CS101', 'COMP1011', 'math101')
 * @param fallbackId Optional custom fallback ID if the subject code is not found in the mapping
 * @returns The unique Google Drive folder ID, fallbackId, or DEFAULT_ROOT_DRIVE_FOLDER_ID
 */
export function getSubjectDriveFolderId(
  subjectCode?: string | null,
  fallbackId: string = DEFAULT_ROOT_DRIVE_FOLDER_ID
): string {
  if (!subjectCode || typeof subjectCode !== 'string') {
    return fallbackId;
  }

  const normalizedCode = subjectCode.trim().toUpperCase();

  if (Object.prototype.hasOwnProperty.call(subjectDriveFolderMap, normalizedCode)) {
    const folderId = subjectDriveFolderMap[normalizedCode];
    if (folderId && folderId.trim().length > 0) {
      return folderId.trim();
    }
  }

  return fallbackId;
}

/**
 * Safely retrieves the complete Google Drive URL for a subject code.
 * 
 * @param subjectCode The course/subject code (e.g., 'CS101', 'COMP1011')
 * @param fallbackUrl Optional custom fallback URL
 * @returns Full Google Drive folder URL
 */
export function getSubjectDriveFolderUrl(
  subjectCode?: string | null,
  fallbackUrl?: string
): string {
  const folderId = getSubjectDriveFolderId(subjectCode);
  if (!folderId || folderId === DEFAULT_ROOT_DRIVE_FOLDER_ID) {
    return fallbackUrl || DEFAULT_ROOT_DRIVE_URL;
  }
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/**
 * Checks if a subject code has a registered Google Drive folder ID in the configuration.
 * 
 * @param subjectCode The course/subject code
 * @returns true if configured, false otherwise
 */
export function hasSubjectFolderId(subjectCode?: string | null): boolean {
  if (!subjectCode || typeof subjectCode !== 'string') {
    return false;
  }
  const normalizedCode = subjectCode.trim().toUpperCase();
  return Boolean(subjectDriveFolderMap[normalizedCode]);
}

/**
 * Returns a clone of all subject code to Drive folder ID mappings.
 */
export function getAllSubjectDriveFolderMappings(): Record<string, string> {
  return { ...subjectDriveFolderMap };
}

export default {
  DEFAULT_ROOT_DRIVE_FOLDER_ID,
  DEFAULT_ROOT_DRIVE_URL,
  subjectDriveFolderMap,
  SUBJECT_DRIVE_FOLDER_MAP,
  getSubjectDriveFolderId,
  getSubjectDriveFolderUrl,
  hasSubjectFolderId,
  getAllSubjectDriveFolderMappings
};
