import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserFeedback {
  id: string;
  type: 'feature' | 'bug' | 'content' | 'general';
  title: string;
  content: string;
  userName?: string;
  userEmail?: string;
  studentId?: string;
  rating?: number; // 1 to 5
  status: 'unread' | 'read' | 'resolved';
  createdAt: string;
  adminNote?: string;
}

export type NewFeedbackInput = Omit<UserFeedback, 'id' | 'createdAt' | 'status'>;

const FEEDBACKS_COLLECTION = 'feedbacks';
const LOCAL_FEEDBACK_STORAGE_KEY = 'hcmue_studyvault_feedbacks_cache';
export const FEEDBACKS_UPDATED_EVENT = 'fithcmue_feedbacks_updated';

// Local storage fallback helper
export function getLocalFeedbacks(): UserFeedback[] {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedbacks(feedbacks: UserFeedback[]) {
  try {
    localStorage.setItem(LOCAL_FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FEEDBACKS_UPDATED_EVENT, { detail: feedbacks }));
    }
  } catch (err) {
    console.error('Failed to save feedback to local cache:', err);
  }
}

/**
 * Submits a new user feedback with ultra-fast optimistic response and background Firestore sync.
 */
export async function submitUserFeedback(input: NewFeedbackInput): Promise<UserFeedback> {
  const newFeedback: UserFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: input.type || 'general',
    title: (input.title || '').trim() || 'Góp ý hệ thống',
    content: (input.content || '').trim(),
    userName: (input.userName || '').trim() || 'Sinh viên FIT HCMUE',
    userEmail: (input.userEmail || '').trim() || '',
    studentId: (input.studentId || '').trim() || '',
    rating: input.rating || 5,
    status: 'unread',
    createdAt: new Date().toISOString()
  };

  // 1. Instantly save to local cache & emit custom event (< 1ms)
  try {
    const currentList = getLocalFeedbacks();
    const updatedList = [newFeedback, ...currentList.filter(f => f.id !== newFeedback.id)];
    saveLocalFeedbacks(updatedList);
  } catch (err) {
    console.warn('Feedback local storage save error:', err);
  }

  // 2. Persist to Firestore in background without blocking the UI
  (async () => {
    try {
      const colRef = collection(db, FEEDBACKS_COLLECTION);
      await addDoc(colRef, {
        type: newFeedback.type,
        title: newFeedback.title,
        content: newFeedback.content,
        userName: newFeedback.userName,
        userEmail: newFeedback.userEmail,
        studentId: newFeedback.studentId,
        rating: newFeedback.rating,
        status: 'unread',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Background Firestore sync for feedback noted (cached locally):', err);
    }
  })();

  return newFeedback;
}

/**
 * Fetches all feedbacks from Firestore for the admin dashboard with local cache fallback.
 */
export async function fetchAllFeedbacks(): Promise<UserFeedback[]> {
  try {
    const colRef = collection(db, FEEDBACKS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const list: UserFeedback[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        let dateStr = new Date().toISOString();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          dateStr = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          dateStr = data.createdAt;
        }

        list.push({
          id: d.id,
          type: data.type || 'general',
          title: data.title || 'Góp ý',
          content: data.content || '',
          userName: data.userName || 'Sinh viên',
          userEmail: data.userEmail || '',
          studentId: data.studentId || '',
          rating: data.rating || 5,
          status: data.status || 'unread',
          createdAt: dateStr,
          adminNote: data.adminNote || ''
        });
      });

      saveLocalFeedbacks(list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore fetch feedbacks error, using local cache:', err);
  }

  return getLocalFeedbacks();
}

/**
 * Updates status of a feedback item (unread, read, resolved).
 */
export async function updateFeedbackStatus(
  id: string,
  status: 'unread' | 'read' | 'resolved',
  adminNote?: string
): Promise<void> {
  // Update local cache
  const currentList = getLocalFeedbacks();
  const updatedList = currentList.map((fb) =>
    fb.id === id ? { ...fb, status, ...(adminNote !== undefined ? { adminNote } : {}) } : fb
  );
  saveLocalFeedbacks(updatedList);

  // Update Firestore
  try {
    const docRef = doc(db, FEEDBACKS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      ...(adminNote !== undefined ? { adminNote } : {})
    });
  } catch (err) {
    console.warn('Failed to update feedback status in Firestore:', err);
  }
}

/**
 * Deletes a feedback item.
 */
export async function deleteFeedback(id: string): Promise<void> {
  const currentList = getLocalFeedbacks();
  const updatedList = currentList.filter((fb) => fb.id !== id);
  saveLocalFeedbacks(updatedList);

  try {
    const docRef = doc(db, FEEDBACKS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete feedback in Firestore:', err);
  }
}
