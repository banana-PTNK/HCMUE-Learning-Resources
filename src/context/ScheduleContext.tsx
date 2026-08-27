import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MasterCourseSection, ScheduleConstraints, TimetableSolution } from '../types';
import { solveTimetableCSP, isVLESection } from '../utils/schedulerCsp';
import { mergeAndDeduplicateSections } from '../utils/scheduleParser';

export interface BatchFileItem {
  id: string;
  name: string;
  size: number;
  type: 'excel' | 'pdf' | 'image' | 'csv' | 'text' | 'unknown';
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  message: string;
  extractedCount: number;
  error?: string;
  file?: File;
}

interface ScheduleContextType {
  // Navigation Stage (1: Catalog, 2: Select & Constraints, 3: Solutions, 4: Matrix)
  activeStage: number;
  setActiveStage: (stage: number) => void;

  // Master Catalog
  masterCatalog: MasterCourseSection[];
  setMasterCatalog: React.Dispatch<React.SetStateAction<MasterCourseSection[]>>;
  activeSourceFiles: string[];
  setActiveSourceFiles: React.Dispatch<React.SetStateAction<string[]>>;
  activeUploadedFileName: string | null;
  setActiveUploadedFileName: React.Dispatch<React.SetStateAction<string | null>>;

  // Stage 2: Selection & Constraints
  selectedCourseCodes: string[];
  setSelectedCourseCodes: React.Dispatch<React.SetStateAction<string[]>>;
  toggleCourseSelection: (courseCode: string) => void;
  selectAllCourses: (codes: string[]) => void;
  clearAllCourses: () => void;
  constraints: ScheduleConstraints;
  setConstraints: React.Dispatch<React.SetStateAction<ScheduleConstraints>>;

  // Stage 3 & 4: Solutions & Active Schedule
  solutions: TimetableSolution[];
  setSolutions: React.Dispatch<React.SetStateAction<TimetableSolution[]>>;
  selectedSolutionIndex: number;
  setSelectedSolutionIndex: (index: number) => void;
  activeScheduleSections: MasterCourseSection[];
  setActiveScheduleSections: React.Dispatch<React.SetStateAction<MasterCourseSection[]>>;

  // Batch Uploader Persistence State
  fileQueue: BatchFileItem[];
  setFileQueue: React.Dispatch<React.SetStateAction<BatchFileItem[]>>;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  overallProgress: number;
  setOverallProgress: (val: number) => void;
  currentProcessingIdx: number;
  setCurrentProcessingIdx: (val: number) => void;
  batchStats: { totalExtracted: number; successFiles: number; failedFiles: number } | null;
  setBatchStats: (val: { totalExtracted: number; successFiles: number; failedFiles: number } | null) => void;
  batchMode: 'merge' | 'replace';
  setBatchMode: (mode: 'merge' | 'replace') => void;

  // Actions
  runScheduler: (customSelectedCodes?: string[], customConstraints?: ScheduleConstraints) => void;
  applySolution: (index: number) => void;
  handleBatchComplete: (
    newSections: MasterCourseSection[],
    sourceFileNames: string[],
    mode: 'merge' | 'replace'
  ) => void;
  handleRemoveFile: (fileName: string) => void;
  handleClearAllFiles: () => void;
  handleResetAll: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hcmue_studyvault_schedule_state_v2';

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage if available
  const [activeStage, setActiveStage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return typeof parsed.activeStage === 'number' ? parsed.activeStage : 1;
      }
    } catch (e) {}
    return 1;
  });

  const [masterCatalog, setMasterCatalog] = useState<MasterCourseSection[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.masterCatalog)) {
          return parsed.masterCatalog;
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeSourceFiles, setActiveSourceFiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.activeSourceFiles)) {
          return parsed.activeSourceFiles;
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeUploadedFileName, setActiveUploadedFileName] = useState<string | null>(null);

  const [selectedCourseCodes, setSelectedCourseCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.selectedCourseCodes)) {
          return parsed.selectedCourseCodes;
        }
      }
    } catch (e) {}
    return [];
  });

  const [constraints, setConstraints] = useState<ScheduleConstraints>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.constraints && typeof parsed.constraints === 'object') {
          return parsed.constraints;
        }
      }
    } catch (e) {}
    return {
      avoidSaturday: true,
      avoidSunday: true,
      avoidEarlyMorning: false,
      avoidLateAfternoon: false,
      freeFridayAfternoon: true,
      compactDays: true,
      preferredPeriod: 'all'
    };
  });

  const [solutions, setSolutions] = useState<TimetableSolution[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.solutions)) {
          return parsed.solutions;
        }
      }
    } catch (e) {}
    return [];
  });

  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return typeof parsed.selectedSolutionIndex === 'number' ? parsed.selectedSolutionIndex : 0;
      }
    } catch (e) {}
    return 0;
  });

  const [activeScheduleSections, setActiveScheduleSections] = useState<MasterCourseSection[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.activeScheduleSections)) {
          return parsed.activeScheduleSections;
        }
      }
    } catch (e) {}
    return [];
  });

  // Batch Queue & Processing State
  const [fileQueue, setFileQueue] = useState<BatchFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentProcessingIdx, setCurrentProcessingIdx] = useState(-1);
  const [batchStats, setBatchStats] = useState<{ totalExtracted: number; successFiles: number; failedFiles: number } | null>(null);
  const [batchMode, setBatchMode] = useState<'merge' | 'replace'>('merge');

  // 2. Persist core schedule states to localStorage debounce
  useEffect(() => {
    try {
      const stateToSave = {
        activeStage,
        masterCatalog,
        activeSourceFiles,
        selectedCourseCodes,
        constraints,
        solutions,
        selectedSolutionIndex,
        activeScheduleSections
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Lỗi lưu trữ cục bộ TKB:', e);
    }
  }, [
    activeStage,
    masterCatalog,
    activeSourceFiles,
    selectedCourseCodes,
    constraints,
    solutions,
    selectedSolutionIndex,
    activeScheduleSections
  ]);

  // Run CSP Scheduler
  const runScheduler = useCallback(
    (customSelectedCodes?: string[], customConstraints?: ScheduleConstraints) => {
      const codes = customSelectedCodes || selectedCourseCodes;
      const appliedConstraints = customConstraints || constraints;

      if (codes.length === 0 || masterCatalog.length === 0) {
        setSolutions([]);
        setActiveScheduleSections([]);
        return;
      }

      const generated = solveTimetableCSP(masterCatalog, codes, appliedConstraints, 7);
      setSolutions(generated);

      if (generated.length > 0) {
        setSelectedSolutionIndex(0);
        // Exclude VLE sections from visual schedule
        const initialSections = generated[0].sections.filter((s) => !isVLESection(s));
        setActiveScheduleSections(initialSections);
      } else {
        setActiveScheduleSections([]);
      }
    },
    [masterCatalog, selectedCourseCodes, constraints]
  );

  // Apply a specific solution by index
  const applySolution = useCallback(
    (index: number) => {
      if (solutions[index]) {
        setSelectedSolutionIndex(index);
        const filteredSections = solutions[index].sections.filter((s) => !isVLESection(s));
        setActiveScheduleSections(filteredSections);
      }
    },
    [solutions]
  );

  // Selection helpers
  const toggleCourseSelection = useCallback((courseCode: string) => {
    setSelectedCourseCodes((prev) => {
      const next = prev.includes(courseCode) ? prev.filter((c) => c !== courseCode) : [...prev, courseCode];
      return next;
    });
  }, []);

  const selectAllCourses = useCallback((codes: string[]) => {
    setSelectedCourseCodes(codes);
  }, []);

  const clearAllCourses = useCallback(() => {
    setSelectedCourseCodes([]);
  }, []);

  // Batch completion handler
  const handleBatchComplete = useCallback(
    (newSections: MasterCourseSection[], sourceFileNames: string[], mode: 'merge' | 'replace') => {
      if (mode === 'replace') {
        setMasterCatalog(newSections);
        setActiveSourceFiles(sourceFileNames);
        setActiveUploadedFileName(sourceFileNames.join(', '));
        const allCourseCodes = Array.from(new Set(newSections.map((s) => s.courseCode))).filter(Boolean);
        setSelectedCourseCodes(allCourseCodes);
      } else {
        const { merged } = mergeAndDeduplicateSections(masterCatalog, newSections);
        setMasterCatalog(merged);
        setActiveSourceFiles((prev) => Array.from(new Set([...prev, ...sourceFileNames])));
        setActiveUploadedFileName(sourceFileNames[sourceFileNames.length - 1] || 'Đã nạp tệp TKB');
        const allCourseCodes = Array.from(new Set(merged.map((s) => s.courseCode))).filter(Boolean);
        setSelectedCourseCodes(allCourseCodes);
      }
    },
    [masterCatalog]
  );

  // Remove a source file and its associated sections
  const handleRemoveFile = useCallback(
    (fileName: string) => {
      const updatedCatalog = masterCatalog.filter((sec) => sec.sourceFile !== fileName);
      setMasterCatalog(updatedCatalog);
      const updatedFiles = activeSourceFiles.filter((f) => f !== fileName);
      setActiveSourceFiles(updatedFiles);

      const remainingCourseCodes = new Set(updatedCatalog.map((s) => s.courseCode));
      setSelectedCourseCodes((prev) => prev.filter((c) => remainingCourseCodes.has(c)));

      const filteredActive = activeScheduleSections.filter((sec) => sec.sourceFile !== fileName);
      setActiveScheduleSections(filteredActive);
    },
    [masterCatalog, activeSourceFiles, activeScheduleSections]
  );

  // Clear all files
  const handleClearAllFiles = useCallback(() => {
    setMasterCatalog([]);
    setActiveSourceFiles([]);
    setActiveUploadedFileName(null);
    setSelectedCourseCodes([]);
    setSolutions([]);
    setActiveScheduleSections([]);
    setFileQueue([]);
    setBatchStats(null);
  }, []);

  // Reset entire state
  const handleResetAll = useCallback(() => {
    setActiveStage(1);
    setMasterCatalog([]);
    setActiveSourceFiles([]);
    setActiveUploadedFileName(null);
    setSelectedCourseCodes([]);
    setSolutions([]);
    setActiveScheduleSections([]);
    setFileQueue([]);
    setBatchStats(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
  }, []);

  return (
    <ScheduleContext.Provider
      value={{
        activeStage,
        setActiveStage,
        masterCatalog,
        setMasterCatalog,
        activeSourceFiles,
        setActiveSourceFiles,
        activeUploadedFileName,
        setActiveUploadedFileName,
        selectedCourseCodes,
        setSelectedCourseCodes,
        toggleCourseSelection,
        selectAllCourses,
        clearAllCourses,
        constraints,
        setConstraints,
        solutions,
        setSolutions,
        selectedSolutionIndex,
        setSelectedSolutionIndex,
        activeScheduleSections,
        setActiveScheduleSections,
        fileQueue,
        setFileQueue,
        isProcessing,
        setIsProcessing,
        overallProgress,
        setOverallProgress,
        currentProcessingIdx,
        setCurrentProcessingIdx,
        batchStats,
        setBatchStats,
        batchMode,
        setBatchMode,
        runScheduler,
        applySolution,
        handleBatchComplete,
        handleRemoveFile,
        handleClearAllFiles,
        handleResetAll
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
