/**
 * Subject Storage & Document Contribution Utilities
 * 
 * Manages course document storage links and generates specific Google Form
 * pre-filled or parameterized contribution URLs for subjects across FIT - HCMUE.
 */

import {
  OFFICIAL_CONTRIBUTION_FORM_URL,
  ROOT_DRIVE_FOLDER_URL,
  getDriveUrlForCourse,
  getDriveFolderIdForCourse
} from '../config/driveLinks';

export interface ContributionUrlOptions {
  /**
   * Custom Google Form base URL (defaults to official form)
   */
  formUrl?: string;
  /**
   * Name of query parameter for course code (defaults to 'course')
   */
  paramName?: string;
  /**
   * Optional course name or title to append as extra parameter
   */
  subjectName?: string;
  /**
   * Google Form pre-fill entry ID if known (e.g. 'entry.123456789')
   */
  entryFieldId?: string;
}

/**
 * Generates a specific contribution link by appending the course code
 * as a query parameter to the Google Form URL.
 * 
 * Example output:
 * https://docs.google.com/forms/d/e/.../viewform?course=COMP1011
 * or with prefill:
 * https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.12345=COMP1011
 *
 * @param courseCode The subject / course code (e.g., 'COMP1011', 'IT002')
 * @param options Optional configuration including custom form URL, query param name, etc.
 * @returns Complete Google Form URL with course code query parameter
 */
export function generateContributionFormUrl(
  courseCode?: string,
  options?: ContributionUrlOptions | string
): string {
  // Allow passing formUrl directly as a string for convenience
  const opts: ContributionUrlOptions =
    typeof options === 'string' ? { formUrl: options } : options || {};

  const baseUrl = (opts.formUrl || OFFICIAL_CONTRIBUTION_FORM_URL).trim();

  if (!courseCode || courseCode.trim().length === 0) {
    return baseUrl;
  }

  const cleanCode = courseCode.trim().toUpperCase();

  try {
    const url = new URL(baseUrl);

    // If pre-fill entry ID is provided
    if (opts.entryFieldId) {
      url.searchParams.set('usp', 'pp_url');
      url.searchParams.set(opts.entryFieldId, cleanCode);
    } else {
      // Default query parameter
      const param = opts.paramName || 'course';
      url.searchParams.set(param, cleanCode);
    }

    // Optional subject title query parameter
    if (opts.subjectName && opts.subjectName.trim()) {
      url.searchParams.set('subject_name', opts.subjectName.trim());
    }

    return url.toString();
  } catch {
    // Fallback URL formatting if URL parsing fails
    const separator = baseUrl.includes('?') ? '&' : '?';
    const param = opts.paramName || 'course';
    const extra = opts.subjectName
      ? `&subject_name=${encodeURIComponent(opts.subjectName.trim())}`
      : '';
    return `${baseUrl}${separator}${param}=${encodeURIComponent(cleanCode)}${extra}`;
  }
}

/**
 * Alias helper function for convenience: getCourseContributionUrl
 */
export const getCourseContributionUrl = generateContributionFormUrl;

/**
 * Returns both Google Drive storage URL and specific Contribution Form URL for a course
 */
export function getSubjectStorageInfo(courseCode: string, subjectName?: string) {
  return {
    courseCode: courseCode.toUpperCase().trim(),
    driveFolderUrl: getDriveUrlForCourse(courseCode),
    driveFolderId: getDriveFolderIdForCourse(courseCode),
    contributionFormUrl: generateContributionFormUrl(courseCode, { subjectName }),
    rootDriveFolderUrl: ROOT_DRIVE_FOLDER_URL
  };
}

export default {
  generateContributionFormUrl,
  getCourseContributionUrl,
  getSubjectStorageInfo
};
