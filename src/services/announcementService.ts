import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Announcement } from '../types';
import { mockAnnouncements } from '../data/mockData';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const STORAGE_KEY_ANNOUNCEMENTS = 'fit_hcmue_announcements_cache';
export const ANNOUNCEMENTS_UPDATED_EVENT = 'fit_announcements_updated';

// Initialize announcements from cache or fallback
function getInitialAnnouncements(): Announcement[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached announcements:', e);
    }
  }
  return [...mockAnnouncements];
}

let memoryAnnouncements: Announcement[] = getInitialAnnouncements();

export function getStoredAnnouncements(): Announcement[] {
  return memoryAnnouncements;
}

export function setMemoryAnnouncements(list: Announcement[]): void {
  memoryAnnouncements = list;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not cache announcements:', e);
    }
    window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_UPDATED_EVENT, { detail: list }));
  }
}

/**
 * Fetch announcements from Server API and Firestore with local fallback
 */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  // 1. Try Server REST API first
  try {
    const res = await fetch('/api/announcements');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        setMemoryAnnouncements(json.data);
        return json.data;
      }
    }
  } catch {}

  // 2. Try Firestore fallback
  try {
    const snapshot = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION));
    if (!snapshot.empty) {
      const list: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Announcement;
        list.push({ ...data, id: docSnap.id });
      });
      // Sort newest first by isoDate
      list.sort((a, b) => new Date(b.isoDate || 0).getTime() - new Date(a.isoDate || 0).getTime());
      setMemoryAnnouncements(list);
      return list;
    }
  } catch (error) {
    console.warn('Firestore fetch announcements failed, using cached:', error);
  }

  return getStoredAnnouncements();
}

/**
 * Add or update an announcement (Admin action)
 */
export async function saveAnnouncement(announcement: Omit<Announcement, 'id'> & { id?: string }): Promise<Announcement> {
  const currentList = getStoredAnnouncements();
  const id = announcement.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const fullAnnouncement: Announcement = {
    ...announcement,
    id,
    isoDate: announcement.isoDate || new Date().toISOString().split('T')[0],
    date: announcement.date || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  };

  const existingIndex = currentList.findIndex((a) => a.id === id);
  let updatedList: Announcement[];

  if (existingIndex >= 0) {
    updatedList = [...currentList];
    updatedList[existingIndex] = fullAnnouncement;
  } else {
    updatedList = [fullAnnouncement, ...currentList];
  }

  setMemoryAnnouncements(updatedList);

  // Sync to Server REST API
  try {
    fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullAnnouncement)
    }).catch(() => {});
  } catch {}

  // Sync to Firestore
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await setDoc(docRef, {
      ...fullAnnouncement,
      lastModified: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveAnnouncement error (saved locally):', err);
  }

  return fullAnnouncement;
}

/**
 * Delete an announcement (Admin action)
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const currentList = getStoredAnnouncements();
  const updatedList = currentList.filter((a) => a.id !== id);
  setMemoryAnnouncements(updatedList);

  // Sync to Server REST API
  try {
    fetch(`/api/announcements/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  // Sync to Firestore
  try {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteAnnouncement error:', err);
  }
}
