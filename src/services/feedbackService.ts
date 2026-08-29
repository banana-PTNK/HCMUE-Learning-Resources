import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs
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
export const FEEDBACKS_UPDATED_EVENT = 'fithcmue_feedbacks_updated';

/**
 * Submits a new user feedback with background Server API and Firestore sync.
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

  // 1. Save to Server REST API
  try {
    fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFeedback)
    }).catch(() => {});
  } catch {}

  // 2. Persist to Firestore in background
  try {
    const colRef = collection(db, FEEDBACKS_COLLECTION);
    addDoc(colRef, {
      type: newFeedback.type,
      title: newFeedback.title,
      content: newFeedback.content,
      userName: newFeedback.userName,
      userEmail: newFeedback.userEmail,
      studentId: newFeedback.studentId,
      rating: newFeedback.rating,
      status: 'unread',
      createdAt: serverTimestamp()
    }).catch(err => {
      console.warn('Background Firestore addDoc for feedback error:', err);
    });
  } catch (err) {
    console.warn('Firestore addDoc initialization for feedback error:', err);
  }

  return newFeedback;
}

/**
 * Fetches all feedbacks from Server REST API and Firestore.
 */
export async function fetchAllFeedbacks(): Promise<UserFeedback[]> {
  const map = new Map<string, UserFeedback>();

  // 1. Server REST API
  try {
    const res = await fetch('/api/feedbacks');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        json.data.forEach((f: UserFeedback) => map.set(f.id, f));
      }
    }
  } catch {}

  // 2. Firestore
  try {
    const colRef = collection(db, FEEDBACKS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    snapshot.forEach((d) => {
      const data = d.data();
      let dateStr = new Date().toISOString();
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        dateStr = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        dateStr = data.createdAt;
      }

      map.set(d.id, {
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
  } catch (err) {
    console.warn('Firestore fetchAllFeedbacks error:', err);
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Subscribe to all feedbacks in real-time from Server API and Firestore.
 */
export function subscribeToFeedbacks(
  callback: (feedbacks: UserFeedback[]) => void,
  maxLimit = 100
): () => void {
  // Immediate delivery
  fetchAllFeedbacks().then(callback).catch(() => {});

  // Periodic polling every 5s
  const intervalId = setInterval(() => {
    fetchAllFeedbacks().then(callback).catch(() => {});
  }, 5000);

  const colRef = collection(db, FEEDBACKS_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(maxLimit));

  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
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
      callback(list);
    }, (err) => {
      console.warn('Real-time feedbacks subscription error:', err);
    });
  } catch {}

  return () => {
    clearInterval(intervalId);
    unsubscribeFirestore();
  };
}

/**
 * Updates status of a feedback item.
 */
export async function updateFeedbackStatus(
  id: string,
  status: 'unread' | 'read' | 'resolved',
  adminNote?: string
): Promise<void> {
  // Server REST API
  try {
    fetch(`/api/feedbacks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote })
    }).catch(() => {});
  } catch {}

  // Firestore
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
  // Server REST API
  try {
    fetch(`/api/feedbacks/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}

  // Firestore
  try {
    const docRef = doc(db, FEEDBACKS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete feedback in Firestore:', err);
  }
}

