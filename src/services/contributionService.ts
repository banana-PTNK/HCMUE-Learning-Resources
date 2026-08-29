import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  limit,
  orderBy,
  where,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Contributor } from '../types';
import { mockContributors } from '../data/mockData';
import {
  getStoredContributors,
  setMemoryContributors,
  getLocalCachedSubmissions,
  saveLocalCachedSubmission,
  updateLocalCachedSubmissionFilesCount,
  updateLocalCachedSubmissionStatus,
  deleteLocalCachedSubmission,
  CONTRIBUTIONS_UPDATED_EVENT,
  CONTRIBUTORS_UPDATED_EVENT
} from '../utils/contributorStorage';
import {
  normalizeStudentId,
  isSameStudentId,
  matchesSearchQuery,
  formatStudentId
} from '../utils/studentIdUtils';
import { getRankLevel } from '../utils/rankingUtils';

export interface FirestoreContribution {
  id: string;
  targetSubjectCode: string;
  targetSubjectName?: string;
  customSubjectName?: string;
  assetType: string;
  materialType?: string;
  driveUrl: string;
  filesCount: number;
  contributorName: string;
  studentId: string;
  className?: string;
  email?: string;
  notes?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  approvedAt?: any;
  approvedBy?: string;
  adminFeedback?: string;
}

export interface SubmitContributionParams {
  targetSubjectCode: string;
  customSubjectName?: string;
  assetType: string;
  driveUrl: string;
  filesCount?: number;
  contributorName: string;
  studentId: string;
  className?: string;
  email?: string;
  notes?: string;
}

const CONTRIBUTIONS_COLLECTION = 'contributions';
const CONTRIBUTORS_COLLECTION = 'contributors';

/**
 * Register or update contributor in Leaderboard (BXH) when APPROVED by Admin.
 * Uses Student ID (MSSV) as the primary unique identifier for leaderboard storage.
 */
export async function registerOrUpdateContributorInLeaderboard(
  name: string,
  studentId: string,
  className: string = '',
  subjectCode: string,
  filesCount: number = 1,
  email: string = ''
): Promise<{ contributor: Contributor; isExisting: boolean }> {
  const currentContributors = getStoredContributors();
  const normalizedName = name.trim();
  const normalizedStudentId = studentId.trim();
  const normalizedClass = className.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const code = subjectCode.toUpperCase().trim();

  // Find existing contributor primarily by Student ID (MSSV) with robust dot/format matching
  const existingIndex = currentContributors.findIndex((c) => {
    if (normalizedStudentId && c.studentId && isSameStudentId(c.studentId, normalizedStudentId)) {
      return true;
    }
    // Fallback if studentId was somehow empty in old records
    if (!c.studentId && normalizedName && c.name.trim().toLowerCase() === normalizedName.toLowerCase()) {
      return true;
    }
    return false;
  });

  let updatedContributor: Contributor;
  let isExisting = false;
  let updatedList = [...currentContributors];

  if (existingIndex >= 0) {
    isExisting = true;
    const existing = currentContributors[existingIndex];

    const updatedFiles = (existing.filesCount || 0) + filesCount;
    const rankInfo = getRankLevel(updatedFiles);

    updatedContributor = {
      ...existing,
      name: normalizedName || existing.name,
      studentId: normalizedStudentId || existing.studentId,
      className: normalizedClass || existing.className,
      email: normalizedEmail || existing.email,
      filesCount: updatedFiles,
      entriesCount: (existing.entriesCount || 0) + 1,
      badgeTitle: rankInfo.rank,
      recentUpload: `Đóng góp tài liệu môn ${code}`,
      specialty: existing.specialty || `Chuyên đề ${code}`,
      verified: true,
      lastUpdated: new Date().toISOString()
    };
    updatedList[existingIndex] = updatedContributor;
  } else {
    // Generate new official contributor entry
    const newId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedName)}`;
    const rankInfo = getRankLevel(filesCount);
    
    updatedContributor = {
      id: newId,
      name: normalizedName,
      studentId: normalizedStudentId,
      className: normalizedClass,
      email: normalizedEmail,
      avatarUrl: avatarUrl,
      badgeTitle: rankInfo.rank,
      filesCount: filesCount,
      entriesCount: 1,
      rank: updatedList.length + 1,
      specialty: `Môn ${code}`,
      recentUpload: `Đóng góp tài liệu môn ${code}`,
      verified: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    updatedList.unshift(updatedContributor);
  }

  // Sort and re-rank leaderboard dynamically based on total filesCount
  updatedList.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
  updatedList = updatedList.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  // Update in-memory & broadcast event (Always persists across renders and storage)
  setMemoryContributors(updatedList);

  // Sync to Firestore 'contributors' collection using MSSV as primary doc ID
  try {
    const docId = updatedContributor.studentId
      ? normalizeStudentId(updatedContributor.studentId)
      : updatedContributor.id;
    const contributorRef = doc(db, CONTRIBUTORS_COLLECTION, docId);
    await setDoc(contributorRef, {
      ...updatedContributor,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore contributors sync warning (saved locally):', err);
  }

  return { contributor: updatedContributor, isExisting };
}

/**
 * Submits a new contribution to Firestore (status: pending).
 */
export async function submitContributionToFirestore(
  payload: SubmitContributionParams
): Promise<{ success: boolean; id: string }> {
  const normalizedName = (payload.contributorName || '').trim();
  const normalizedStudentId = (payload.studentId || '').trim();
  const normalizedClass = (payload.className || '').trim();
  const normalizedEmail = (payload.email || '').trim().toLowerCase();
  const normalizedDriveUrl = (payload.driveUrl || '').trim();
  const filesCount = Math.max(1, Math.round(Number(payload.filesCount) || 1));
  const fallbackId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let contributorName = normalizedName;
  let className = normalizedClass;

function cleanUndefined(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

  if (normalizedStudentId) {
    // 1. Try to search locally first (instant)
    const localContributors = getStoredContributors();
    const matched = localContributors.find(
      (c) => c.studentId && isSameStudentId(c.studentId, normalizedStudentId)
    );
    if (matched) {
      if (matched.name) contributorName = matched.name.trim();
      if (matched.className) className = matched.className.trim();
    } else {
      const localSubmissions = getLocalCachedSubmissions();
      const matchedSub = localSubmissions.find(
        (s) => s.studentId && isSameStudentId(s.studentId, normalizedStudentId)
      );
      if (matchedSub) {
        if (matchedSub.contributorName) contributorName = matchedSub.contributorName.trim();
        if (matchedSub.className) className = matchedSub.className.trim();
      } else {
        // 2. Query Firestore in parallel
        try {
          const q1 = query(
            collection(db, CONTRIBUTIONS_COLLECTION),
            where('studentId', '==', normalizedStudentId),
            orderBy('createdAt', 'asc'),
            limit(1)
          );
          const q2 = query(
            collection(db, 'contributors'),
            where('studentId', '==', normalizedStudentId),
            limit(1)
          );
          
          const [snap1, snap2] = await Promise.all([
            getDocs(q1),
            getDocs(q2)
          ]);
          
          if (!snap1.empty) {
            const firstEntry = snap1.docs[0].data();
            if (firstEntry.contributorName) contributorName = String(firstEntry.contributorName).trim();
            if (firstEntry.className) className = String(firstEntry.className).trim();
          } else if (!snap2.empty) {
            const contr = snap2.docs[0].data();
            if (contr.name) contributorName = String(contr.name).trim();
            if (contr.className) className = String(contr.className).trim();
          }
        } catch (err) {
          console.warn('Failed to query previous studentId info in parallel:', err);
        }
      }
    }
  }

  const docData: FirestoreContribution = {
    id: fallbackId,
    targetSubjectCode: payload.targetSubjectCode.toUpperCase().trim(),
    customSubjectName: payload.customSubjectName?.trim() || undefined,
    assetType: payload.assetType || 'all',
    driveUrl: normalizedDriveUrl,
    filesCount,
    contributorName,
    studentId: normalizedStudentId,
    className,
    email: normalizedEmail,
    notes: (payload.notes || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // 1. ALWAYS IMMEDIATELY save to local cache & emit event so Admin page and UI update instantaneously (0ms)
  saveLocalCachedSubmission(docData);

  // 2. Persist to Server REST store (ensures cross-device / cross-session persistence)
  try {
    fetch('/api/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    }).catch((e) => console.warn('Server API save contribution warning:', e));
  } catch {}

  // 3. Perform Firestore write and update document ID if successful
  try {
    const cleanData = cleanUndefined(docData);
    delete cleanData.id; // Let Firestore assign the document ID
    const firestorePromise = addDoc(collection(db, CONTRIBUTIONS_COLLECTION), {
      ...cleanData,
      createdAt: serverTimestamp()
    });

    // Race against 5s timeout to prevent hanging on poor network
    const docRef = await Promise.race([
      firestorePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]);

    if (docRef && 'id' in docRef) {
      const updatedSub = { ...docData, id: docRef.id };
      deleteLocalCachedSubmission(fallbackId);
      saveLocalCachedSubmission(updatedSub);
      return { success: true, id: docRef.id };
    }
  } catch (err: any) {
    console.warn('Firestore addDoc warning (safely retained in persistent store):', err);
  }

  return { success: true, id: fallbackId };
}

export function getTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  if (val.seconds !== undefined) {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
  }
  const t = new Date(val).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Fetches all contributions (Pending, Approved, Rejected) for Admin Moderation.
 * Combines Server REST API, Firestore, and local submissions cache for absolute reliability.
 */
export async function fetchAllContributions(): Promise<FirestoreContribution[]> {
  const mergedMap = new Map<string, FirestoreContribution>();
  const seenDriveUrls = new Set<string>();

  // 1. Fetch from Server REST API (always reliable across all browsers/refreshes)
  try {
    const apiRes = await fetch('/api/contributions');
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && Array.isArray(json.data)) {
        json.data.forEach((item: FirestoreContribution) => {
          mergedMap.set(item.id, item);
          if (item.driveUrl) {
            seenDriveUrls.add(item.driveUrl.trim().toLowerCase());
          }
        });
      }
    }
  } catch (err) {
    console.warn('Server fetchAllContributions API warning:', err);
  }

  // 2. Fetch from Firestore
  try {
    const q = query(collection(db, CONTRIBUTIONS_COLLECTION), orderBy('createdAt', 'desc'), limit(150));
    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const item: FirestoreContribution = {
        id: docSnap.id,
        targetSubjectCode: data.targetSubjectCode || '',
        customSubjectName: data.customSubjectName || undefined,
        assetType: data.assetType || '',
        driveUrl: data.driveUrl || '',
        filesCount: data.filesCount || 1,
        contributorName: data.contributorName || '',
        studentId: data.studentId || '',
        className: data.className || '',
        email: data.email || '',
        notes: data.notes || '',
        status: data.status || 'pending',
        createdAt: data.createdAt,
        approvedAt: data.approvedAt,
        approvedBy: data.approvedBy,
        adminFeedback: data.adminFeedback
      };
      mergedMap.set(item.id, item);
      if (item.driveUrl) {
        seenDriveUrls.add(item.driveUrl.trim().toLowerCase());
      }
    });
  } catch (error) {
    console.warn('Firestore fetchAllContributions error, using cached:', error);
  }

  // 3. Merge with local cached submissions
  const localList = getLocalCachedSubmissions();
  localList.forEach((item: any) => {
    const cleanUrl = (item.driveUrl || '').trim().toLowerCase();
    if (cleanUrl && seenDriveUrls.has(cleanUrl)) {
      deleteLocalCachedSubmission(item.id);
      return;
    }
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });

  const finalResults = Array.from(mergedMap.values());

  // Sort newest first
  return finalResults.sort((a, b) => {
    return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
  });
}

/**
 * Admin action: Update filesCount for a specific contribution record.
 * If already approved, also synchronizes the delta difference to the contributor's BXH profile.
 */
export async function updateContributionFilesCount(
  contribution: FirestoreContribution,
  newFilesCount: number
): Promise<void> {
  const safeCount = Math.max(1, Math.round(Number(newFilesCount) || 1));
  const oldCount = Math.max(1, Math.round(Number(contribution.filesCount) || 1));
  const delta = safeCount - oldCount;

  // 1. Update local cache
  updateLocalCachedSubmissionFilesCount(contribution.id, safeCount);

  // 2. Update Server REST API
  try {
    fetch(`/api/contributions/${contribution.id}/files-count`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filesCount: safeCount })
    }).catch(() => {});
  } catch {}

  // 3. Update Firestore contribution record
  try {
    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, contribution.id);
    await updateDoc(docRef, {
      filesCount: safeCount
    });
  } catch (err) {
    console.warn('Firestore updateContributionFilesCount error:', err);
  }

  // 4. If contribution was already approved, synchronize the delta on Leaderboard
  if (contribution.status === 'approved' && delta !== 0) {
    await adjustContributorFilesCount(contribution.studentId, delta, 0);
  }
}

/**
 * Admin action: Approves a contribution atomically.
 * Updates the contribution document status and upserts/increments the contributor's record on the Leaderboard in a single Firestore transaction.
 */
export async function approveContribution(
  contribution: FirestoreContribution,
  adminName: string = 'Admin Khoa CNTT',
  customFilesCount?: number
): Promise<void> {
  const contributionId = contribution.id;
  const finalFilesCount = customFilesCount !== undefined ? Math.max(1, customFilesCount) : (contribution.filesCount || 1);
  const normalizedMssv = (contribution.studentId || '').trim() ? normalizeStudentId(contribution.studentId) : '';
  const contributorDocId = normalizedMssv || `contrib_${contribution.id}`;
  const subjectCode = (contribution.targetSubjectCode || '').toUpperCase().trim();
  const name = (contribution.contributorName || 'Sinh viên').trim();

  // 1. Immediately update in-memory / persistent store so Leaderboard & Admin UI update instantly
  const currentList = getStoredContributors();
  let matchedIndex = currentList.findIndex(
    (c) => (c.studentId && isSameStudentId(c.studentId, normalizedMssv)) || c.id === contributorDocId
  );
  if (matchedIndex < 0 && name) {
    matchedIndex = currentList.findIndex((c) => c.name.trim().toLowerCase() === name.toLowerCase());
  }

  let updatedList = [...currentList];
  if (matchedIndex >= 0) {
    const existing = currentList[matchedIndex];
    const newFiles = (existing.filesCount || 0) + finalFilesCount;
    const rankInfo = getRankLevel(newFiles);
    updatedList[matchedIndex] = {
      ...existing,
      name: name || existing.name,
      studentId: contribution.studentId || existing.studentId,
      className: contribution.className || existing.className,
      email: contribution.email || existing.email,
      filesCount: newFiles,
      entriesCount: (existing.entriesCount || 0) + 1,
      badgeTitle: rankInfo.rank,
      recentUpload: subjectCode ? `Đóng góp tài liệu môn ${subjectCode}` : (existing.recentUpload || 'Đóng góp tài liệu học tập'),
      specialty: existing.specialty || (subjectCode ? `Chuyên đề ${subjectCode}` : 'Tài liệu CNTT')
    };
  } else {
    const rankInfo = getRankLevel(finalFilesCount);
    const newContributor: Contributor = {
      id: contributorDocId,
      name,
      studentId: (contribution.studentId || '').trim(),
      className: (contribution.className || '').trim(),
      email: (contribution.email || '').trim().toLowerCase(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'HCMUE')}`,
      badgeTitle: rankInfo.rank,
      filesCount: finalFilesCount,
      entriesCount: 1,
      rank: currentList.length + 1,
      specialty: subjectCode ? `Môn ${subjectCode}` : 'Tài liệu CNTT',
      recentUpload: subjectCode ? `Đóng góp tài liệu môn ${subjectCode}` : 'Đóng góp tài liệu học tập',
      verified: true
    };
    updatedList.push(newContributor);
  }

  // Sort and assign ranks
  updatedList.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
  updatedList = updatedList.map((item, idx) => ({ ...item, rank: idx + 1 }));
  setMemoryContributors(updatedList);

  // Keep submission status as approved in local cache
  updateLocalCachedSubmissionStatus(contributionId, 'approved');

  // 2. Call Server REST API and await to guarantee server store persistence
  try {
    const res = await fetch(`/api/contributions/${contributionId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customFilesCount: finalFilesCount, adminName })
    });
    if (res.ok) {
      // Re-sync server contributors
      const contribRes = await fetch('/api/contributors');
      if (contribRes.ok) {
        const contribJson = await contribRes.json();
        if (contribJson && Array.isArray(contribJson.data)) {
          setMemoryContributors(contribJson.data);
        }
      }
    }
  } catch (err) {
    console.warn('Server REST approve sync warning:', err);
  }

  // 3. Perform Firestore write safely in background without blocking the UI
  try {
    const contributionRef = doc(db, CONTRIBUTIONS_COLLECTION, contributionId);
    const contributorRef = doc(db, CONTRIBUTORS_COLLECTION, contributorDocId);

    await runTransaction(db, async (transaction) => {
      const contributorDoc = await transaction.get(contributorRef);

      if (contributorDoc.exists()) {
        const existing = contributorDoc.data() as Contributor;
        const updatedFiles = (existing.filesCount || 0) + finalFilesCount;
        const rankInfo = getRankLevel(updatedFiles);

        transaction.update(contributorRef, {
          name: (contribution.contributorName || existing.name || '').trim(),
          studentId: (contribution.studentId || existing.studentId || '').trim(),
          className: (contribution.className || existing.className || '').trim(),
          email: (contribution.email || existing.email || '').trim().toLowerCase(),
          filesCount: updatedFiles,
          entriesCount: (existing.entriesCount || 0) + 1,
          badgeTitle: rankInfo.rank,
          recentUpload: subjectCode ? `Đóng góp tài liệu môn ${subjectCode}` : (existing.recentUpload || 'Đóng góp tài liệu học tập'),
          specialty: existing.specialty || (subjectCode ? `Chuyên đề ${subjectCode}` : 'Tài liệu CNTT'),
          verified: true,
          lastUpdated: serverTimestamp()
        });
      } else {
        const rankInfo = getRankLevel(finalFilesCount);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'HCMUE')}`;

        transaction.set(contributorRef, {
          id: contributorDocId,
          name,
          studentId: (contribution.studentId || '').trim(),
          className: (contribution.className || '').trim(),
          email: (contribution.email || '').trim().toLowerCase(),
          avatarUrl,
          badgeTitle: rankInfo.rank,
          filesCount: finalFilesCount,
          entriesCount: 1,
          rank: 999,
          specialty: subjectCode ? `Môn ${subjectCode}` : 'Tài liệu CNTT',
          recentUpload: subjectCode ? `Đóng góp tài liệu môn ${subjectCode}` : 'Đóng góp tài liệu học tập',
          verified: true,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }

      transaction.update(contributionRef, {
        status: 'approved',
        filesCount: finalFilesCount,
        approvedAt: serverTimestamp(),
        approvedBy: adminName
      });
    });
  } catch (err) {
    console.warn('Firestore atomic approveContribution sync warning (safely retained locally):', err);
  }
}

/**
 * Admin action: Directly update or adjust any contributor details on the official Leaderboard.
 */
export async function updateContributorRecord(
  studentIdOrId: string,
  updates: Partial<Contributor>
): Promise<Contributor> {
  const currentContributors = getStoredContributors();
  const normalizedKey = (studentIdOrId || '').trim();

  let index = currentContributors.findIndex((c) => c.id && c.id === studentIdOrId);
  if (index < 0) {
    index = currentContributors.findIndex(
      (c) => (c.studentId && isSameStudentId(c.studentId, normalizedKey)) || c.id === studentIdOrId
    );
  }
  if (index < 0 && updates.name) {
    index = currentContributors.findIndex(
      (c) => c.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
    );
  }

  let updated: Contributor;
  let updatedList = [...currentContributors];

  if (index >= 0) {
    const existing = currentContributors[index];
    const newFilesCount = updates.filesCount !== undefined ? Math.max(0, Number(updates.filesCount) || 0) : existing.filesCount;
    updated = {
      ...existing,
      ...updates,
      filesCount: newFilesCount,
      entriesCount: updates.entriesCount !== undefined ? Math.max(0, Number(updates.entriesCount) || 0) : existing.entriesCount,
      badgeTitle: updates.badgeTitle !== undefined ? updates.badgeTitle : (updates.filesCount !== undefined ? getRankLevel(newFilesCount).rank : existing.badgeTitle)
    };
    updatedList[index] = updated;
  } else {
    // Upsert as new entry if not existing in current list
    const filesCount = Math.max(0, Number(updates.filesCount) || 1);
    updated = {
      id: studentIdOrId || `contrib-${Date.now()}`,
      rank: updates.rank || (currentContributors.length + 1),
      name: updates.name || 'Sinh viên đóng góp',
      studentId: updates.studentId || (normalizedKey.includes('.') ? normalizedKey : ''),
      className: updates.className || '',
      filesCount,
      entriesCount: Math.max(1, Number(updates.entriesCount) || 1),
      badgeTitle: updates.badgeTitle || getRankLevel(filesCount).rank,
      specialty: updates.specialty || 'Học liệu CNTT',
      email: updates.email || '',
      ...updates
    };
    updatedList.unshift(updated);
  }

  // Sort and re-rank leaderboard dynamically based on total filesCount
  updatedList.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
  updatedList = updatedList.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  setMemoryContributors(updatedList);

  // Sync to Firestore
  try {
    const docId = (updated.studentId && updated.studentId.trim())
      ? normalizeStudentId(updated.studentId)
      : (updated.id || `contrib-${Date.now()}`);
    const contributorRef = doc(db, CONTRIBUTORS_COLLECTION, docId);
    await setDoc(contributorRef, {
      ...updated,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore updateContributorRecord sync warning:', err);
  }

  return updated;
}

/**
 * Admin quick action: Add delta to a contributor's filesCount and entriesCount on Leaderboard.
 */
export async function adjustContributorFilesCount(
  studentIdOrId: string,
  deltaFiles: number,
  deltaEntries: number = 0
): Promise<void> {
  const currentContributors = getStoredContributors();
  const normalizedKey = (studentIdOrId || '').trim();

  const index = currentContributors.findIndex(
    (c) => (c.studentId && isSameStudentId(c.studentId, normalizedKey)) || c.id === studentIdOrId
  );

  if (index >= 0) {
    const existing = currentContributors[index];
    const newFiles = Math.max(0, (existing.filesCount || 0) + deltaFiles);
    const newEntries = Math.max(0, (existing.entriesCount || 0) + deltaEntries);

    await updateContributorRecord(studentIdOrId, {
      filesCount: newFiles,
      entriesCount: newEntries
    });
  }
}

/**
 * Admin action: Add a custom student / user directly to the Leaderboard.
 */
export async function addCustomContributorToLeaderboard(
  data: Partial<Contributor>
): Promise<Contributor> {
  const currentContributors = getStoredContributors();
  const name = (data.name || 'Sinh viên CNTT').trim();
  const studentId = (data.studentId || '').trim();
  const className = (data.className || '').trim();
  const filesCount = Math.max(0, Number(data.filesCount) || 1);
  const entriesCount = Math.max(1, Number(data.entriesCount) || 1);
  const newId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const avatarUrl = data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  const newContributor: Contributor = {
    id: newId,
    name,
    studentId,
    className,
    email: data.email || '',
    avatarUrl,
    badgeTitle: data.badgeTitle || 'Đóng góp viên Tích cực',
    filesCount,
    entriesCount,
    rank: currentContributors.length + 1,
    specialty: data.specialty || 'Tài liệu Chuyên ngành',
    recentUpload: data.recentUpload || 'Đóng góp tài liệu học tập',
    verified: true
  };

  const updatedList = [newContributor, ...currentContributors];
  setMemoryContributors(updatedList);

  try {
    const docId = newContributor.studentId || newContributor.id;
    const contributorRef = doc(db, CONTRIBUTORS_COLLECTION, docId);
    await setDoc(contributorRef, {
      ...newContributor,
      lastUpdated: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore addCustomContributorToLeaderboard warning:', err);
  }

  return newContributor;
}

/**
 * Admin action: Delete a contributor record from the Leaderboard.
 */
export async function deleteContributorFromLeaderboard(studentIdOrId: string): Promise<void> {
  const currentContributors = getStoredContributors();
  const normalizedKey = (studentIdOrId || '').trim();

  let filtered = currentContributors.filter(
    (c) => !(c.studentId && isSameStudentId(c.studentId, normalizedKey)) && c.id !== studentIdOrId
  );

  // Sort and re-rank leaderboard dynamically based on total filesCount after deletion
  filtered.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
  filtered = filtered.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  setMemoryContributors(filtered);

  try {
    const cleanId = (studentIdOrId || '').trim();
    if (cleanId) {
      const docId = cleanId.includes('.') || cleanId.length === 10
        ? normalizeStudentId(cleanId)
        : cleanId;
      const docRef = doc(db, CONTRIBUTORS_COLLECTION, docId);
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn('Firestore deleteContributorFromLeaderboard warning:', err);
  }
}

/**
 * Admin action: Approves a contribution.
 * Automatically adds the student to the official permanent leaderboard!
 */
export async function approveContributionOld(
  contribution: FirestoreContribution,
  adminName: string = 'Admin Khoa CNTT'
): Promise<void> {
  await approveContribution(contribution, adminName);
}

/**
 * Admin action: Rejects a contribution with reason and prepares email notification content.
 */
export async function rejectContribution(
  contributionId: string,
  reason: string = 'Xin lỗi vì tài liệu không phù hợp hoặc tài liệu đã được xuất hiện trước đó.'
): Promise<void> {
  // Remove from local cache so it disappears immediately
  deleteLocalCachedSubmission(contributionId);

  // Call Server REST API
  try {
    fetch(`/api/contributions/${contributionId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminFeedback: reason })
    }).catch(() => {});
  } catch {}

  // Update Firestore
  try {
    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, contributionId);
    await updateDoc(docRef, {
      status: 'rejected',
      adminFeedback: reason
    });
  } catch (err) {
    console.warn('Firestore rejectContribution update error:', err);
  }
}

/**
 * Admin action: Deletes a contribution record.
 */
export async function deleteContribution(contributionId: string): Promise<void> {
  // Update local cache
  deleteLocalCachedSubmission(contributionId);

  // Call Server REST API
  try {
    fetch(`/api/contributions/${contributionId}`, {
      method: 'DELETE'
    }).catch(() => {});
  } catch {}

  // Update Firestore
  try {
    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, contributionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteContribution error:', err);
  }
}

/**
 * Searches submissions by Student ID (MSSV), email, or name.
 * Handles both dotted (51.01.104.105) and non-dotted (5101104105) MSSV formats seamlessly.
 * Allows any student to check their review status, feedback, and approvals.
 */
export async function searchContributionsByStudent(query: string): Promise<FirestoreContribution[]> {
  const all = await fetchAllContributions();
  const q = (query || '').trim();
  if (!q) return [];

  return all.filter((item) => {
    return matchesSearchQuery({
      studentId: item.studentId,
      contributorName: item.contributorName,
      email: item.email,
      className: item.className,
      targetSubjectCode: item.targetSubjectCode,
      notes: item.notes
    }, q);
  });
}

/**
 * Subscribe to Hall of Fame Contributors in real-time (both local events, Server API, and Firestore).
 */
export function subscribeToContributors(
  callback: (contributors: Contributor[]) => void,
  maxLimit = 100
): () => void {
  // Emit initial memory state immediately
  callback(getStoredContributors());

  // Background server fetch
  const syncWithServer = async () => {
    try {
      const res = await fetch('/api/contributors');
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setMemoryContributors(json.data);
          callback(json.data);
        }
      }
    } catch {}
  };
  syncWithServer();
  const intervalId = setInterval(syncWithServer, 5000);

  // Listen to local in-app updates
  const handleLocalUpdate = (e: any) => {
    if (e?.detail) {
      callback(e.detail);
    } else {
      callback(getStoredContributors());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CONTRIBUTORS_UPDATED_EVENT, handleLocalUpdate);
  }

  const q = query(
    collection(db, CONTRIBUTORS_COLLECTION),
    orderBy('filesCount', 'desc'),
    limit(maxLimit)
  );

  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const list: Contributor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Contributor;
        list.push({ ...data, id: docSnap.id });
      });

      // Merge with existing base contributors to ensure no entries are lost
      const baseContributors = getStoredContributors();
      const map = new Map<string, Contributor>();
      baseContributors.forEach(c => {
        const key = c.studentId ? normalizeStudentId(c.studentId) : c.id;
        map.set(key, c);
      });
      list.forEach(c => {
        const key = c.studentId ? normalizeStudentId(c.studentId) : c.id;
        map.set(key, c);
      });
      const mergedList = Array.from(map.values())
        .sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
      
      // Dynamic ranking mapping
      const rankedList = mergedList.map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));
      setMemoryContributors(rankedList);
      callback(rankedList);
    }, (err) => {
      console.warn('Real-time contributors subscription error:', err);
    });
  } catch (err) {
    console.warn('Could not initialize contributors Firestore listener:', err);
  }

  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener(CONTRIBUTORS_UPDATED_EVENT, handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
}

/**
 * Subscribe to all contributions in real-time (both local events, Server API polling, and Firestore).
 */
export function subscribeToContributions(
  callback: (contributions: FirestoreContribution[]) => void,
  maxLimit = 150
): () => void {
  // Helper to get and deliver combined list
  const deliverCurrentMerged = async () => {
    try {
      const list = await fetchAllContributions();
      callback(list);
    } catch {
      const localList = getLocalCachedSubmissions();
      const sorted = [...localList].sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      callback(sorted);
    }
  };

  // Immediate delivery
  deliverCurrentMerged();

  // Background polling every 3.5 seconds ensures instantaneous synchronization across tabs and users
  const intervalId = setInterval(() => {
    deliverCurrentMerged();
  }, 3500);

  // Listen to local update events
  const handleLocalUpdate = () => {
    deliverCurrentMerged();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(CONTRIBUTIONS_UPDATED_EVENT, handleLocalUpdate);
  }

  const q = query(
    collection(db, CONTRIBUTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const firestoreResults: FirestoreContribution[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreResults.push({
          id: docSnap.id,
          targetSubjectCode: data.targetSubjectCode || '',
          customSubjectName: data.customSubjectName || undefined,
          assetType: data.assetType || '',
          driveUrl: data.driveUrl || '',
          filesCount: data.filesCount || 1,
          contributorName: data.contributorName || '',
          studentId: data.studentId || '',
          className: data.className || '',
          email: data.email || '',
          notes: data.notes || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
          adminFeedback: data.adminFeedback
        });
      });

      // Merge with local cached submissions
      const localList = getLocalCachedSubmissions();
      const mergedMap = new Map<string, FirestoreContribution>();
      const seenDriveUrls = new Set<string>();

      // Add firestore items first
      firestoreResults.forEach((item) => {
        mergedMap.set(item.id, item);
        if (item.driveUrl) {
          seenDriveUrls.add(item.driveUrl.trim().toLowerCase());
        }
      });

      // Merge local items if not already present and not matching any Firestore item by driveUrl
      localList.forEach((item: any) => {
        const cleanUrl = (item.driveUrl || '').trim().toLowerCase();
        if (cleanUrl && seenDriveUrls.has(cleanUrl)) {
          deleteLocalCachedSubmission(item.id);
          return;
        }
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      });

      const finalResults = Array.from(mergedMap.values());
      const sorted = finalResults.sort((a, b) => {
        return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      });

      callback(sorted);
    }, (err) => {
      console.warn('Real-time contributions subscription error:', err);
    });
  } catch (err) {
    console.warn('Could not initialize contributions Firestore listener:', err);
  }

  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener(CONTRIBUTIONS_UPDATED_EVENT, handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
}

/**
 * Fetch verified Hall of Fame Contributors from Server API and durable Firestore with SWR cache.
 */
export async function fetchContributorsFromFirestore(maxLimit = 100): Promise<Contributor[]> {
  const map = new Map<string, Contributor>();

  // 1. Fetch from Server REST API
  try {
    const res = await fetch('/api/contributors');
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        json.data.forEach((c: Contributor) => {
          const key = c.studentId ? normalizeStudentId(c.studentId) : c.id;
          map.set(key, c);
        });
      }
    }
  } catch {}

  // 2. Fetch from Firestore
  try {
    const q = query(
      collection(db, CONTRIBUTORS_COLLECTION),
      orderBy('filesCount', 'desc'),
      limit(maxLimit)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Contributor;
        const item = { ...data, id: docSnap.id };
        const key = item.studentId ? normalizeStudentId(item.studentId) : item.id;
        map.set(key, item);
      });
    }
  } catch (err) {
    console.warn('Firestore contributors fetch failed, using stored:', err);
  }

  // 3. Merge with base memory contributors
  const baseContributors = getStoredContributors();
  baseContributors.forEach(c => {
    const key = c.studentId ? normalizeStudentId(c.studentId) : c.id;
    if (!map.has(key)) {
      map.set(key, c);
    }
  });

  const mergedList = Array.from(map.values())
    .sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));

  const rankedList = mergedList.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
  setMemoryContributors(rankedList);
  return rankedList;
}

/**
 * Offline-First Background Sync:
 * Automatically uploads unsynced local cached submissions to Firestore.
 */
export async function syncOfflineSubmissions(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;

  const localSubmissions = getLocalCachedSubmissions();
  const unsynced = localSubmissions.filter((s: any) => String(s.id).startsWith('sub_'));

  if (unsynced.length === 0) return 0;

  let syncCount = 0;
  for (const sub of unsynced) {
    try {
      const docRef = await addDoc(collection(db, CONTRIBUTIONS_COLLECTION), {
        ...sub,
        createdAt: serverTimestamp()
      });

      // Successfully synced. Update local cache by swapping temp sub_ ID with docRef.id
      deleteLocalCachedSubmission(sub.id);
      
      const syncedSub = {
        ...sub,
        id: docRef.id
      };
      saveLocalCachedSubmission(syncedSub);
      syncCount++;
    } catch (err) {
      console.warn('Failed to sync offline submission:', sub.id, err);
      break; // Exit if network fails again
    }
  }

  return syncCount;
}

