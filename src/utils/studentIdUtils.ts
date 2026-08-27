/**
 * Student ID & Text Search Normalization Utilities
 * Supports flexible student ID formats (dots, dashes, spaces, raw numbers, etc.)
 */

/**
 * Normalizes student ID (MSSV) by removing dots, spaces, dashes, slashes, underscores.
 * Example: "51.01.104.105" -> "5101104105"
 *          "48-01-104-088" -> "4801104088"
 *          "51 01 104 105" -> "5101104105"
 */
export function normalizeStudentId(id?: string | null): string {
  if (!id) return '';
  return String(id).replace(/[\s.\-_/\\,;:|]/g, '').toLowerCase().trim();
}

/**
 * Strips Vietnamese diacritics / accents for seamless name search.
 * Example: "Nguyễn Văn An" -> "nguyen van an"
 */
export function removeVietnameseAccents(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Checks if two student IDs represent the same student.
 */
export function isSameStudentId(idA?: string | null, idB?: string | null): boolean {
  if (!idA || !idB) return false;
  const normA = normalizeStudentId(idA);
  const normB = normalizeStudentId(idB);
  if (normA && normB && normA === normB) return true;
  return idA.trim().toLowerCase() === idB.trim().toLowerCase();
}

/**
 * Formats a raw 10-digit student ID into standard dot format XX.XX.XXX.XXX if applicable.
 * Example: "5101104105" -> "51.01.104.105"
 */
export function formatStudentId(id?: string | null): string {
  if (!id) return '';
  const clean = normalizeStudentId(id);
  // Match standard 10-digit HCMUE MSSV format (e.g. 51.01.104.105, 48.01.104.088)
  const match = clean.match(/^(\d{2})(\d{2})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
  }
  return id.trim();
}

export interface SearchableEntity {
  studentId?: string | null;
  contributorName?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string | null;
  targetSubjectCode?: string | null;
  specialty?: string | null;
  notes?: string | null;
}

/**
 * Smart search matcher that checks MSSV (with or without dots), accents, email, subject code, etc.
 */
export function matchesSearchQuery(entity: SearchableEntity, rawQuery: string): boolean {
  const query = (rawQuery || '').trim();
  if (!query) return true;

  const qLower = query.toLowerCase();
  const qNormId = normalizeStudentId(query);
  const qNoAccents = removeVietnameseAccents(query);

  const studentId = (entity.studentId || '').trim();
  const normStudentId = normalizeStudentId(studentId);
  const name = (entity.contributorName || entity.name || '').trim();
  const nameNoAccents = removeVietnameseAccents(name);
  const email = (entity.email || '').trim().toLowerCase();
  const className = (entity.className || '').trim();
  const classNoAccents = removeVietnameseAccents(className);
  const subjectCode = (entity.targetSubjectCode || entity.specialty || '').trim().toLowerCase();
  const subjectCodeNorm = subjectCode.replace(/[\s.\-_]/g, '');

  // 1. Direct substring match
  if (
    studentId.toLowerCase().includes(qLower) ||
    name.toLowerCase().includes(qLower) ||
    email.includes(qLower) ||
    className.toLowerCase().includes(qLower) ||
    subjectCode.includes(qLower)
  ) {
    return true;
  }

  // 2. Normalized Student ID match (dots removed)
  // e.g. user types "5101104105" or "51.01.104.105" or "51 01 104"
  if (qNormId.length >= 2) {
    if (normStudentId && (normStudentId.includes(qNormId) || qNormId.includes(normStudentId))) {
      return true;
    }
    // Student ID in email (e.g. 5101104105@student.hcmue.edu.vn)
    if (email && normalizeStudentId(email).includes(qNormId)) {
      return true;
    }
  }

  // 3. Accent-free Name match
  if (qNoAccents && nameNoAccents.includes(qNoAccents)) {
    return true;
  }

  // 4. Accent-free Class match
  if (qNoAccents && classNoAccents.includes(qNoAccents)) {
    return true;
  }

  // 5. Normalized Subject Code match (e.g. user types "comp1012" matching "COMP 1012")
  if (qLower && subjectCodeNorm.includes(qLower.replace(/[\s.\-_]/g, ''))) {
    return true;
  }

  return false;
}
