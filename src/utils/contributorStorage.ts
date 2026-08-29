import { Contributor } from '../types';
import { mockContributors } from '../data/mockData';

export const CONTRIBUTORS_UPDATED_EVENT = 'fit_contributors_updated';
export const CONTRIBUTIONS_UPDATED_EVENT = 'fit_contributions_updated';

const SUBMISSIONS_STORAGE_KEY = 'fit_studyvault_cached_submissions';
const CONTRIBUTORS_STORAGE_KEY = 'fit_studyvault_cached_contributors';

function loadStoredContributors(): Contributor[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(CONTRIBUTORS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return [...mockContributors];
}

function loadStoredSubmissions(): any[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

// Persistent storage synced to localStorage and memory
let memoryContributors: Contributor[] = loadStoredContributors();
let memorySubmissions: any[] = loadStoredSubmissions();

/**
 * Retrieve public contributor list.
 */
export function getStoredContributors(): Contributor[] {
  return memoryContributors;
}

/**
 * Set in-memory contributor list and persist.
 */
export function setMemoryContributors(list: Contributor[]): void {
  memoryContributors = list;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONTRIBUTORS_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent(CONTRIBUTORS_UPDATED_EVENT, { detail: list }));
    }
  } catch {}
}

/**
 * Helper to record local submissions cache in memory and storage
 */
export function getLocalCachedSubmissions(): any[] {
  return memorySubmissions;
}

export function saveLocalCachedSubmission(submission: any): void {
  const filtered = memorySubmissions.filter((s: any) => s.id !== submission.id);
  filtered.unshift(submission);
  memorySubmissions = filtered;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: filtered }));
    }
  } catch {}
}

export function updateLocalCachedSubmissionFilesCount(id: string, filesCount: number): void {
  const updated = memorySubmissions.map((s: any) => {
    if (s.id === id) {
      return { ...s, filesCount: Math.max(1, filesCount) };
    }
    return s;
  });
  memorySubmissions = updated;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    }
  } catch {}
}

export function updateLocalCachedSubmissionStatus(id: string, status: 'pending' | 'approved' | 'rejected', adminFeedback?: string): void {
  const updated = memorySubmissions.map((s: any) => {
    if (s.id === id) {
      return { ...s, status, adminFeedback: adminFeedback || s.adminFeedback, approvedAt: new Date().toISOString() };
    }
    return s;
  });
  memorySubmissions = updated;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    }
  } catch {}
}

export function deleteLocalCachedSubmission(id: string): void {
  const updated = memorySubmissions.filter((s: any) => s.id !== id);
  memorySubmissions = updated;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
    }
  } catch {}
}
