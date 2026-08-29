import { Contributor } from '../types';
import { mockContributors } from '../data/mockData';

export const CONTRIBUTORS_UPDATED_EVENT = 'fit_contributors_updated';
export const CONTRIBUTIONS_UPDATED_EVENT = 'fit_contributions_updated';

// Persistent memory storage (in-memory only, absolutely no localStorage)
let memoryContributors: Contributor[] = [...mockContributors];
let memorySubmissions: any[] = [];

/**
 * Retrieve public contributor list.
 */
export function getStoredContributors(): Contributor[] {
  return memoryContributors;
}

/**
 * Set in-memory contributor list.
 */
export function setMemoryContributors(list: Contributor[]): void {
  memoryContributors = list;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTRIBUTORS_UPDATED_EVENT, { detail: list }));
  }
}

/**
 * Helper to record local submissions cache in memory (absolutely no localStorage)
 */
export function getLocalCachedSubmissions(): any[] {
  return memorySubmissions;
}

export function saveLocalCachedSubmission(submission: any): void {
  const filtered = memorySubmissions.filter((s: any) => s.id !== submission.id);
  filtered.unshift(submission);
  memorySubmissions = filtered;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: filtered }));
  }
}

export function updateLocalCachedSubmissionFilesCount(id: string, filesCount: number): void {
  const updated = memorySubmissions.map((s: any) => {
    if (s.id === id) {
      return { ...s, filesCount: Math.max(1, filesCount) };
    }
    return s;
  });
  memorySubmissions = updated;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
  }
}

export function updateLocalCachedSubmissionStatus(id: string, status: 'pending' | 'approved' | 'rejected', adminFeedback?: string): void {
  const updated = memorySubmissions.map((s: any) => {
    if (s.id === id) {
      return { ...s, status, adminFeedback: adminFeedback || s.adminFeedback, approvedAt: new Date().toISOString() };
    }
    return s;
  });
  memorySubmissions = updated;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
  }
}

export function deleteLocalCachedSubmission(id: string): void {
  const updated = memorySubmissions.filter((s: any) => s.id !== id);
  memorySubmissions = updated;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONTRIBUTIONS_UPDATED_EVENT, { detail: updated }));
  }
}
