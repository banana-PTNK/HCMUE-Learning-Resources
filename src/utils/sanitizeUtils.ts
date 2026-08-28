/**
 * Utility functions for text sanitization in StudyVault
 */

/**
 * Sanitizes schedule and timing strings by stripping duplicate/stray/trailing commas and extra whitespace.
 * E.g., turns "Thứ 2 (Tiết 1-3), ," into "Thứ 2 (Tiết 1-3)"
 */
export function sanitizeScheduleString(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/,\s*,+/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/^\s*,/g, '')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
