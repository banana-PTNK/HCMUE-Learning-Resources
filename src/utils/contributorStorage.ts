import { Contributor } from '../types';
import { mockContributors } from '../data/mockData';

export const CONTRIBUTORS_UPDATED_EVENT = 'fit_contributors_updated';
export const CONTRIBUTIONS_UPDATED_EVENT = 'fit_contributions_updated';

// Local storage key for persistent caching
const STORAGE_KEY_CONTRIBUTORS = 'fit_hcmue_contributors_cache';
const STORAGE_KEY_SUBMISSIONS = 'fit_hcmue_pending_submissions_cache';

// Initialize from storage or fallback to mockContributors
function getInitialContributors(): Contributor[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONTRIBUTORS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached contributors:', e);
    }
  }
  return [...mockContributors];
}

let memoryContributors: Contributor[] = getInitialContributors();

/**
 * Retrieve public contributor list.
 */
export function getStoredContributors(): Contributor[] {
  return memoryContributors;
}

/**
 * Set in-memory and cached contributor list.
 */
export function setMemoryContributors(list: Contributor[]): void {
  memoryContributors = list;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CONTRIBUTORS, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not cache contributors:', e);
    }
    window.dispatchEvent(new CustomEvent(CONTRIBUTORS_UPDATED_EVENT, { detail: list }));
  }
}

/**
 * Helper to record local submissions cache so admin can always see them.
 */
export function getLocalCachedSubmissions(): any[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read cached submissions:', e);
    }
  }
  return [];
}

export function saveLocalCachedSubmission(submission: any): void {
  if (typeof window !== 'undefined') {
    try {
      const current = getLocalCachedSubmissions();
      // Add or update
      const filtered = current.filter((s: any) => s.id !== submission.id);
      filtered.unshift(submission);
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: filtered }));
    } catch (e) {
      console.warn('Could not cache submission:', e);
    }
  }
}

export function updateLocalCachedSubmissionFilesCount(id: string, filesCount: number): void {
  if (typeof window !== 'undefined') {
    try {
      const current = getLocalCachedSubmissions();
      const updated = current.map((s: any) => {
        if (s.id === id) {
          return { ...s, filesCount: Math.max(1, filesCount) };
        }
        return s;
      });
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.warn('Could not update cached submission filesCount:', e);
    }
  }
}

export function updateLocalCachedSubmissionStatus(id: string, status: 'pending' | 'approved' | 'rejected', adminFeedback?: string): void {
  if (typeof window !== 'undefined') {
    try {
      const current = getLocalCachedSubmissions();
      const updated = current.map((s: any) => {
        if (s.id === id) {
          return { ...s, status, adminFeedback: adminFeedback || s.adminFeedback, approvedAt: new Date().toISOString() };
        }
        return s;
      });
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.warn('Could not update cached submission:', e);
    }
  }
}

export function deleteLocalCachedSubmission(id: string): void {
  if (typeof window !== 'undefined') {
    try {
      const current = getLocalCachedSubmissions();
      const updated = current.filter((s: any) => s.id !== id);
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.warn('Could not delete cached submission:', e);
    }
  }
}
