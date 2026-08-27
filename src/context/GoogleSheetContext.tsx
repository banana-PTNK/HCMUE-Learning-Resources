import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subject, SheetCourseRecord } from '../types';
import { mockSubjects } from '../data/mockData';
import {
  fetchCourseRecordsFromSheet,
  getCachedSheetRecords,
  mergeSubjectsWithSheet,
  getLastSyncTime,
  getActiveSheetId,
  setActiveSheetId,
  getActiveDriveUrl,
  setActiveDriveUrl,
  ACTIVE_ROOT_DRIVE_FOLDER_ID,
  SHEET_SYNC_EVENT,
  isDateRecent,
  resolveSubjectCategory,
  parseCreditsInfo,
  parseGradingWeightsInfo,
  parsePrerequisitesInfo,
  parseSyllabusInfo,
  parsePracticalOutlineInfo
} from '../services/googleSheetSyncService';

interface GoogleSheetContextType {
  subjects: Subject[];
  sheetRecords: SheetCourseRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: string | null;
  errorMessage: string | null;
  refreshSheet: (customSheetIdOrUrl?: string) => Promise<SheetCourseRecord[]>;
  updateSheetSource: (sheetIdOrUrl: string, driveUrl?: string) => Promise<SheetCourseRecord[]>;
  getSubjectByCode: (code: string) => Subject | undefined;
  getCourseDriveMetadata: (code: string) => {
    driveUrl: string;
    lastUpdated: string;
    updatedBy: string;
    notes?: string;
    isRecent: boolean;
  };
  sheetId: string;
  sheetUrl: string;
  rootDriveUrl: string;
  rootDriveFolderId: string;
}

const GoogleSheetContext = createContext<GoogleSheetContextType | undefined>(undefined);

export const GoogleSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheetId, setSheetId] = useState<string>(() => getActiveSheetId());
  const [rootDriveUrl, setRootDriveUrl] = useState<string>(() => getActiveDriveUrl());
  const [sheetRecords, setSheetRecords] = useState<SheetCourseRecord[]>(() => getCachedSheetRecords());
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const cached = getCachedSheetRecords();
    return mergeSubjectsWithSheet(mockSubjects, cached);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTimeState] = useState<string | null>(() => getLastSyncTime());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshSheet = useCallback(async (customSheetIdOrUrl?: string): Promise<SheetCourseRecord[]> => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    setErrorMessage(null);
    try {
      const targetId = customSheetIdOrUrl ? setActiveSheetId(customSheetIdOrUrl) : getActiveSheetId();
      setSheetId(targetId);
      const records = await fetchCourseRecordsFromSheet(targetId);
      setSheetRecords(records);
      const merged = mergeSubjectsWithSheet(mockSubjects, records);
      setSubjects(merged);
      setSyncStatus('success');
      const now = new Date().toISOString();
      setLastSyncTimeState(now);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SHEET_SYNC_EVENT, { detail: { count: records.length, timestamp: now } }));
      }
      return records;
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ Google Sheet:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Không thể đồng bộ với Google Sheets');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateSheetSource = useCallback(async (newSheetIdOrUrl: string, newDriveUrl?: string) => {
    if (newDriveUrl) {
      setActiveDriveUrl(newDriveUrl);
      setRootDriveUrl(newDriveUrl);
    }
    return refreshSheet(newSheetIdOrUrl);
  }, [refreshSheet]);

  // Initial load: fetch in background on mount
  useEffect(() => {
    let isMounted = true;
    const initialSync = async () => {
      setIsLoading(true);
      try {
        const records = await fetchCourseRecordsFromSheet(getActiveSheetId());
        if (isMounted && records.length > 0) {
          setSheetRecords(records);
          setSubjects(mergeSubjectsWithSheet(mockSubjects, records));
          setLastSyncTimeState(getLastSyncTime());
        }
      } catch (err) {
        console.warn('Background sheet sync failed, using cached:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initialSync();

    return () => {
      isMounted = false;
    };
  }, []);

  const getSubjectByCode = useCallback(
    (code: string): Subject | undefined => {
      if (!code) return undefined;
      const normalized = decodeURIComponent(code).toUpperCase().trim();
      const normalizedId = decodeURIComponent(code).toLowerCase().trim();
      
      // 1. Try finding in merged subjects by code or id
      const directMatch = subjects.find(
        (s) => s.code.toUpperCase().trim() === normalized || s.id.toLowerCase().trim() === normalizedId
      );
      if (directMatch) return directMatch;

      // 2. Try finding from raw sheet records
      const sheetMatch = sheetRecords.find(
        (r) => r.code.toUpperCase().trim() === normalized
      );
      if (sheetMatch) {
        const { category, categoryName } = resolveSubjectCategory(
          sheetMatch.category,
          sheetMatch.code,
          sheetMatch.name
        );

        const creditsInfo = parseCreditsInfo(sheetMatch.creditsRaw);
        const gradingWeights = parseGradingWeightsInfo(sheetMatch.gradingWeightsRaw);
        const prerequisites = parsePrerequisitesInfo(sheetMatch.prerequisitesRaw);
        const syllabus = parseSyllabusInfo(sheetMatch.syllabusRaw, sheetMatch.name);
        const practicalOutline = parsePracticalOutlineInfo(sheetMatch.practicalOutlineRaw, sheetMatch.name);
        const description = sheetMatch.descriptionRaw?.trim() || sheetMatch.notes || `Tài liệu học phần ${sheetMatch.name} (${sheetMatch.code})`;
        const examFormat = sheetMatch.examFormatRaw?.trim() || 'Thi tập trung';

        return {
          id: sheetMatch.code.toLowerCase().replace(/[^a-z0-9]/g, ''),
          code: sheetMatch.code,
          name: sheetMatch.name,
          englishName: '',
          category,
          categoryName,
          semester: 'Học kỳ chính',
          credits: creditsInfo.credits,
          theoryHours: creditsInfo.theoryHours,
          practicalHours: creditsInfo.practicalHours,
          description,
          driveUrl: sheetMatch.driveUrl,
          lastUpdated: sheetMatch.lastUpdated || new Date().toISOString().split('T')[0],
          updatedBy: sheetMatch.updatedBy || 'Google Sheet',
          updateNotes: sheetMatch.notes,
          isCustomFromSheet: true,
          gradingWeights,
          prerequisites,
          syllabus,
          practicalOutline,
          examFormat,
          resourcesCount: { slides: 10, exams: 4, labs: 4, projects: 2 }
        };
      }

      return undefined;
    },
    [subjects, sheetRecords]
  );

  const getCourseDriveMetadata = useCallback(
    (code: string) => {
      const normalized = code.toUpperCase().trim();
      const sheetMatch = sheetRecords.find((r) => r.code.toUpperCase().trim() === normalized);
      const subject = subjects.find((s) => s.code.toUpperCase().trim() === normalized);

      const driveUrl = sheetMatch?.driveUrl || subject?.driveUrl || rootDriveUrl;
      const lastUpdated = sheetMatch?.lastUpdated || subject?.lastUpdated || '2026-08-22';
      const updatedBy = sheetMatch?.updatedBy || subject?.updatedBy || 'Google Sheets';
      const notes = sheetMatch?.notes || subject?.updateNotes || undefined;
      const isRecent = sheetMatch?.isRecent || isDateRecent(lastUpdated);

      return {
        driveUrl,
        lastUpdated,
        updatedBy,
        notes,
        isRecent
      };
    },
    [sheetRecords, subjects, rootDriveUrl]
  );

  return (
    <GoogleSheetContext.Provider
      value={{
        subjects,
        sheetRecords,
        isLoading,
        isSyncing,
        syncStatus,
        lastSyncTime,
        errorMessage,
        refreshSheet,
        updateSheetSource,
        getSubjectByCode,
        getCourseDriveMetadata,
        sheetId,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`,
        rootDriveUrl,
        rootDriveFolderId: ACTIVE_ROOT_DRIVE_FOLDER_ID
      }}
    >
      {children}
    </GoogleSheetContext.Provider>
  );
};

export const useGoogleSheet = (): GoogleSheetContextType => {
  const context = useContext(GoogleSheetContext);
  if (!context) {
    throw new Error('useGoogleSheet must be used within a GoogleSheetProvider');
  }
  return context;
};
