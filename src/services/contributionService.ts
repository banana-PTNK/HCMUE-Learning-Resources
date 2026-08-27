import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
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
  deleteLocalCachedSubmission
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
  customSubjectName?: string;
  assetType: string;
  driveUrl: string;
  filesCount: number;
  contributorName: string;
  studentId: string;
  className?: string;
  email?: string;
  notes?: string;
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

  // Update in-memory & broadcast event (Always persists across renders and storage)
  setMemoryContributors(updatedList);

  // Sync to Firestore 'contributors' collection using MSSV as primary doc ID
  try {
    const docId = updatedContributor.studentId || updatedContributor.id;
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

  const docData: FirestoreContribution = {
    id: fallbackId,
    targetSubjectCode: payload.targetSubjectCode.toUpperCase().trim(),
    customSubjectName: payload.customSubjectName?.trim() || undefined,
    assetType: payload.assetType,
    driveUrl: normalizedDriveUrl,
    filesCount,
    contributorName: normalizedName,
    studentId: normalizedStudentId,
    className: normalizedClass,
    email: normalizedEmail,
    notes: (payload.notes || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  let createdId = fallbackId;

  // 1. Try to add directly to Firestore
  try {
    const docRef = await addDoc(collection(db, CONTRIBUTIONS_COLLECTION), {
      ...docData,
      createdAt: serverTimestamp()
    });
    createdId = docRef.id;
    docData.id = createdId;
  } catch (firestoreErr) {
    console.warn('Direct Firestore addDoc error (falling back to local cache):', firestoreErr);
  }

  // 2. Save to local submissions cache so Admin sees it immediately in real-time
  saveLocalCachedSubmission(docData);

  return { success: true, id: createdId };
}

/**
 * Fetches all contributions (Pending, Approved, Rejected) for Admin Moderation.
 * Combines Firestore results with local submissions cache for instant reliability.
 */
export async function fetchAllContributions(): Promise<FirestoreContribution[]> {
  const firestoreResults: FirestoreContribution[] = [];

  try {
    const snapshot = await getDocs(collection(db, CONTRIBUTIONS_COLLECTION));
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
  } catch (error) {
    console.warn('Firestore fetchAllContributions error, using cached:', error);
  }

  // Merge with local cached submissions
  const localList = getLocalCachedSubmissions();
  const mergedMap = new Map<string, FirestoreContribution>();

  // Add firestore items first
  firestoreResults.forEach((item) => {
    mergedMap.set(item.id, item);
  });

  // Merge local items if not already present
  localList.forEach((item: any) => {
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  });

  const finalResults = Array.from(mergedMap.values());

  // Sort newest first
  return finalResults.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
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

  // 2. Update Firestore contribution record
  try {
    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, contribution.id);
    await updateDoc(docRef, {
      filesCount: safeCount
    });
  } catch (err) {
    console.warn('Firestore updateContributionFilesCount error:', err);
  }

  // 3. If contribution was already approved, synchronize the delta on Leaderboard
  if (contribution.status === 'approved' && delta !== 0) {
    await adjustContributorFilesCount(contribution.studentId, delta, 0);
  }
}

/**
 * Admin action: Approves a contribution.
 * Automatically adds the student to the official permanent leaderboard!
 * Allows specifying custom filesCount if admin reviewed and adjusted it.
 */
export async function approveContribution(
  contribution: FirestoreContribution,
  adminName: string = 'Admin Khoa CNTT',
  customFilesCount?: number
): Promise<void> {
  const contributionId = contribution.id;
  const finalFilesCount = customFilesCount !== undefined ? Math.max(1, customFilesCount) : (contribution.filesCount || 1);

  // Update local cache
  updateLocalCachedSubmissionStatus(contributionId, 'approved');
  if (customFilesCount !== undefined) {
    updateLocalCachedSubmissionFilesCount(contributionId, finalFilesCount);
  }

  // Update Firestore
  try {
    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, contributionId);
    await updateDoc(docRef, {
      status: 'approved',
      filesCount: finalFilesCount,
      approvedAt: serverTimestamp(),
      approvedBy: adminName
    });
  } catch (err) {
    console.warn('Firestore approveContribution update error:', err);
  }

  // Cập nhật người dùng lên Bảng Xếp Hạng chính thức bền vững theo MSSV
  await registerOrUpdateContributorInLeaderboard(
    contribution.contributorName,
    contribution.studentId,
    contribution.className || '',
    contribution.targetSubjectCode,
    finalFilesCount,
    contribution.email || ''
  );
}

/**
 * Admin action: Directly update or adjust any contributor details on the official Leaderboard.
 */
export async function updateContributorRecord(
  studentIdOrId: string,
  updates: Partial<Contributor>
): Promise<Contributor | null> {
  const currentContributors = getStoredContributors();
  const normalizedKey = (studentIdOrId || '').trim();

  const index = currentContributors.findIndex(
    (c) => (c.studentId && isSameStudentId(c.studentId, normalizedKey)) || c.id === studentIdOrId
  );

  if (index < 0) return null;

  const existing = currentContributors[index];
  const updated: Contributor = {
    ...existing,
    ...updates,
    filesCount: updates.filesCount !== undefined ? Math.max(0, updates.filesCount) : existing.filesCount,
    entriesCount: updates.entriesCount !== undefined ? Math.max(0, updates.entriesCount) : existing.entriesCount,
  };

  const updatedList = [...currentContributors];
  updatedList[index] = updated;

  setMemoryContributors(updatedList);

  // Sync to Firestore
  try {
    const docId = updated.studentId || updated.id;
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

  const filtered = currentContributors.filter(
    (c) => !(c.studentId && isSameStudentId(c.studentId, normalizedKey)) && c.id !== studentIdOrId
  );

  setMemoryContributors(filtered);

  try {
    const docRef = doc(db, CONTRIBUTORS_COLLECTION, studentIdOrId);
    await deleteDoc(docRef);
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
  // Update local cache
  updateLocalCachedSubmissionStatus(contributionId, 'rejected', reason);

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
 * Fetch verified Hall of Fame Contributors from durable Firestore or cache.
 */
export async function fetchContributorsFromFirestore(): Promise<Contributor[]> {
  try {
    const snapshot = await getDocs(collection(db, CONTRIBUTORS_COLLECTION));
    if (!snapshot.empty) {
      const list: Contributor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Contributor;
        list.push({ ...data, id: docSnap.id });
      });
      if (list.length > 0) {
        // Merge with existing base contributors to ensure no entries are lost
        const baseContributors = getStoredContributors();
        const map = new Map<string, Contributor>();
        baseContributors.forEach(c => map.set(c.studentId || c.id, c));
        list.forEach(c => map.set(c.studentId || c.id, c));
        const mergedList = Array.from(map.values());
        setMemoryContributors(mergedList);
        return mergedList;
      }
    }
  } catch (err) {
    console.warn('Firestore contributors fetch failed, using stored:', err);
  }
  return getStoredContributors();
}
