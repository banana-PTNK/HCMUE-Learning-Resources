import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MasterCourseSection, ScheduleConstraints, TimetableSolution, BatchFileItem } from '../types';
import { solveTimetableCSP, isVLESection } from '../utils/schedulerCsp';
import { mergeAndDeduplicateSections, detectFileType } from '../utils/scheduleParser';
import { TkbParallelQueue, QueueMetrics } from '../utils/tkbParallelQueue';

export type { BatchFileItem };

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

  // Background Decoupled Batch Uploader & Parallel Queue State
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
  queueMetrics: QueueMetrics | null;
  concurrency: number;
  setConcurrency: (c: number) => void;

  // Queue Operations
  addFilesToQueue: (files: FileList | File[], customPrompt?: string) => Promise<void>;
  retryFailedItems: () => Promise<void>;
  cancelQueue: () => void;
  removeQueueItem: (id: string) => void;
  clearQueue: () => void;

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

// High-precision sanitization and normalization for university course sections
function isHeaderOrNoiseString(val: string): boolean {
  if (!val || typeof val !== 'string') return true;
  const upper = val.trim().toUpperCase();
  if (upper.length < 2) return true;
  const noiseTokens = [
    'STT', 'SỐ THỨ TỰ', 'SO THU TU',
    'MÃ HP', 'MA HP', 'MÃ HỌC PHẦN', 'MA HOC PHAN', 'MÃ MÔN', 'MA MON',
    'MÃ LHP', 'MA LHP', 'MÃ LỚP HỌC PHẦN', 'MA LOP HOC PHAN', 'MÃ LỚP', 'MA LOP',
    'TÊN HP', 'TEN HP', 'TÊN HỌC PHẦN', 'TEN HOC PHAN', 'TÊN MÔN', 'TEN MON', 'TÊN MÔN HỌC', 'TEN MON HOC',
    'THỜI KHÓA BIỂU', 'THOI KHOA BIEU', 'LỊCH HỌC', 'LICH HOC', 'TIMETABLE', 'SCHEDULE',
    'HỌC KỲ', 'HOC KY', 'SEMESTER', 'NĂM HỌC', 'NAM HOC', 'TRƯỜNG ĐẠI HỌC', 'TRUONG DAI HOC',
    'KHOA CNTT', 'KHOA TOÁN', 'PHÒNG ĐÀO TẠO', 'PHONG DAO TAO',
    'GIẢNG VIÊN', 'GIANG VIEN', 'CBGD', 'CÁN BỘ GIẢNG DẠY', 'CAN BO GIANG DAY',
    'PHÒNG', 'PHONG', 'PHÒNG HỌC', 'PHONG HOC', 'ĐỊA ĐIỂM', 'DIA DIEM', 'ROOM',
    'THỨ', 'THU', 'TIẾT', 'TIET', 'TIẾT BĐ', 'TIẾT KT', 'TUẦN', 'TUAN', 'GHI CHÚ', 'GHI CHU',
    'SỐ TC', 'SO TC', 'SỐ TÍN CHỈ', 'SO TIN CHI', 'CREDITS', 'TOTAL'
  ];
  return noiseTokens.some((t) => upper === t || upper === `${t}:` || upper === `${t}.`);
}

function cleanLecturerName(raw: any): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim()
    .replace(/^[-–—:;,.]+/, '')
    .replace(/[-–—:;,.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const lower = str.toLowerCase();
  if (
    !str ||
    str.length < 2 ||
    lower === '-' ||
    lower === '--' ||
    lower === '...' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'n/a' ||
    lower === 'chưa phân công' ||
    lower === 'chua phan cong' ||
    lower === 'chưa có' ||
    lower === 'chua co' ||
    lower === 'chưa xếp' ||
    lower === 'chua xep' ||
    isHeaderOrNoiseString(str)
  ) {
    return '';
  }
  return str;
}

function cleanRoomName(raw: any): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim()
    .replace(/^[-–—:;,.]+/, '')
    .replace(/[-–—:;,.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const lower = str.toLowerCase();
  if (
    !str ||
    str.length < 2 ||
    lower === '-' ||
    lower === '--' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'n/a' ||
    lower === 'chưa xếp phòng' ||
    lower === 'chua xep phong' ||
    lower === 'chưa có' ||
    lower === 'chua co' ||
    isHeaderOrNoiseString(str)
  ) {
    return '';
  }
  return str;
}

export function validateAndFilterSections(sections: MasterCourseSection[]): MasterCourseSection[] {
  if (!Array.isArray(sections)) return [];
  return sections.filter((s) => {
    if (!s) return false;
    
    // 1. Course Name (MUST be present, valid length, not noise)
    const courseName = (s.courseName || '').trim();
    if (!courseName || courseName.length < 2 || isHeaderOrNoiseString(courseName)) return false;

    // 2. Course Code & Class Code
    const courseCode = (s.courseCode || '').trim();
    const classCode = (s.classCode || '').trim();
    if (!courseCode && !classCode) return false;
    if (courseCode && isHeaderOrNoiseString(courseCode)) return false;
    if (classCode && isHeaderOrNoiseString(classCode)) return false;

    // 3. Day of week (MUST be 2..8)
    const day = Number(s.dayOfWeek);
    if (isNaN(day) || day < 2 || day > 8) return false;

    // 4. Periods (MUST be 1..12 and start <= end)
    const start = Number(s.startPeriod);
    const end = Number(s.endPeriod);
    if (isNaN(start) || start < 1 || start > 12) return false;
    if (isNaN(end) || end < start || end > 12) return false;

    // 5. Lecturer (MUST be present, valid, and not empty/placeholder)
    const lecturer = cleanLecturerName(s.lecturer);
    if (!lecturer) return false;

    // 6. Room (MUST be present, valid, and not empty/placeholder)
    const room = cleanRoomName(s.room);
    if (!room) return false;

    return true;
  });
}

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage if available
  const [activeStage, setActiveStage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.masterCatalog) && parsed.masterCatalog.length > 0) {
          return typeof parsed.activeStage === 'number' ? parsed.activeStage : 1;
        }
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
          return validateAndFilterSections(parsed.masterCatalog);
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
      freeFridayAfternoon: false,
      compactDays: true,
      preferredShift: 'all',
      preferredPeriod: 'all',
      avoidSplitDays: false
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
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [concurrency, setConcurrencyState] = useState<number>(4);

  // Background Parallel Queue Worker Singleton (Persistent across page & step transitions)
  const parallelQueueRef = useRef<TkbParallelQueue | null>(null);

  const getQueue = useCallback(() => {
    if (!parallelQueueRef.current) {
      parallelQueueRef.current = new TkbParallelQueue({ concurrency });
    }
    return parallelQueueRef.current;
  }, [concurrency]);

  const setConcurrency = useCallback((newConcurrency: number) => {
    setConcurrencyState(newConcurrency);
    if (parallelQueueRef.current) {
      parallelQueueRef.current.setConcurrency(newConcurrency);
    }
  }, []);

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

  // Batch completion handler
  const handleBatchComplete = useCallback(
    (newSections: MasterCourseSection[], sourceFileNames: string[], mode: 'merge' | 'replace') => {
      const validatedNew = validateAndFilterSections(newSections);
      if (mode === 'replace') {
        setMasterCatalog(validatedNew);
        setActiveSourceFiles(sourceFileNames);
        setActiveUploadedFileName(sourceFileNames.join(', '));
        const allCourseCodes = Array.from(new Set(validatedNew.map((s) => s.courseCode))).filter(Boolean);
        setSelectedCourseCodes(allCourseCodes);
      } else {
        const { merged } = mergeAndDeduplicateSections(masterCatalog, validatedNew);
        const validatedMerged = validateAndFilterSections(merged);
        setMasterCatalog(validatedMerged);
        setActiveSourceFiles((prev) => Array.from(new Set([...prev, ...sourceFileNames])));
        setActiveUploadedFileName(sourceFileNames[sourceFileNames.length - 1] || 'Đã nạp tệp TKB');
        const allCourseCodes = Array.from(new Set(validatedMerged.map((s) => s.courseCode))).filter(Boolean);
        setSelectedCourseCodes(allCourseCodes);
      }
    },
    [masterCatalog]
  );

  // Background Parallel Queue Executor
  const startBackgroundExecution = useCallback(
    async (itemsToProcess: BatchFileItem[], customPrompt?: string) => {
      const pendingItems = itemsToProcess.filter((i) => i.status === 'queued' || i.status === 'error');
      if (pendingItems.length === 0) return;

      setIsProcessing(true);
      setOverallProgress(0);

      const queue = getQueue();
      if (customPrompt) {
        // queue supports customPrompt if needed
      }

      queue.setCallbacks({
        onItemProgress: (id, progress, message, status) => {
          setFileQueue((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    progress,
                    message,
                    status: status || it.status
                  }
                : it
            )
          );
        },
        onItemComplete: (id, sections) => {
          setFileQueue((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    status: 'done',
                    progress: 100,
                    extractedCount: sections.length,
                    message: `✓ Đã trích xuất ${sections.length} lớp học phần`
                  }
                : it
            )
          );
        },
        onItemError: (id, error) => {
          setFileQueue((prev) =>
            prev.map((it) =>
              it.id === id
                ? {
                    ...it,
                    status: 'error',
                    progress: 100,
                    extractedCount: 0,
                    error,
                    message: '⚠️ ' + error
                  }
                : it
            )
          );
        },
        onMetricsUpdate: (metrics) => {
          setQueueMetrics(metrics);
          setOverallProgress(metrics.overallProgress);
        },
        onQueueComplete: (results) => {
          setIsProcessing(false);
          setOverallProgress(100);

          setBatchStats({
            totalExtracted: results.sections.length,
            successFiles: results.successFiles.length,
            failedFiles: results.failedFiles.length
          });

          if (results.sections.length > 0) {
            handleBatchComplete(results.sections, results.successFiles, batchMode);
          }
        }
      });

      const initialSections = batchMode === 'merge' ? masterCatalog : [];
      await queue.addAndStart(itemsToProcess, initialSections);
    },
    [getQueue, batchMode, masterCatalog, handleBatchComplete]
  );

  // Add files to queue and start processing immediately in background
  const addFilesToQueue = useCallback(
    async (files: FileList | File[], customPrompt?: string) => {
      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      const newItems: BatchFileItem[] = fileList.map((file) => {
        const detectedType = detectFileType(file.name);
        return {
          id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          size: file.size,
          type: detectedType as BatchFileItem['type'],
          status: 'queued',
          progress: 0,
          message: 'Đang xếp hàng đợi xử lý...',
          extractedCount: 0,
          file
        };
      });

      const updatedQueue = [...fileQueue, ...newItems];
      setFileQueue(updatedQueue);
      await startBackgroundExecution(updatedQueue, customPrompt);
    },
    [fileQueue, startBackgroundExecution]
  );

  // Retry failed items in queue
  const retryFailedItems = useCallback(async () => {
    const resetQueue = fileQueue.map((it) =>
      it.status === 'error'
        ? {
            ...it,
            status: 'queued' as const,
            progress: 0,
            message: 'Đang xếp hàng thử lại...',
            error: undefined
          }
        : it
    );
    setFileQueue(resetQueue);
    await startBackgroundExecution(resetQueue);
  }, [fileQueue, startBackgroundExecution]);

  // Cancel running queue
  const cancelQueue = useCallback(() => {
    if (parallelQueueRef.current) {
      parallelQueueRef.current.cancelAll();
    }
    setIsProcessing(false);
    setFileQueue((prev) =>
      prev.map((it) =>
        it.status === 'processing' || it.status === 'queued'
          ? { ...it, status: 'error', message: 'Đã hủy xử lý' }
          : it
      )
    );
  }, []);

  // Remove single item from queue
  const removeQueueItem = useCallback(
    (id: string) => {
      if (parallelQueueRef.current) {
        parallelQueueRef.current.cancelItem(id);
      }
      setFileQueue((prev) => prev.filter((i) => i.id !== id));
    },
    []
  );

  // Clear entire queue
  const clearQueue = useCallback(() => {
    if (parallelQueueRef.current) {
      parallelQueueRef.current.cancelAll();
    }
    setIsProcessing(false);
    setFileQueue([]);
    setBatchStats(null);
    setOverallProgress(0);
    setQueueMetrics(null);
  }, []);

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

      const generated = solveTimetableCSP(masterCatalog, codes, appliedConstraints, 10);
      setSolutions(generated);

      if (generated.length > 0) {
        setSelectedSolutionIndex(0);
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
    clearQueue();
  }, [clearQueue]);

  // Reset entire state
  const handleResetAll = useCallback(() => {
    setActiveStage(1);
    setMasterCatalog([]);
    setActiveSourceFiles([]);
    setActiveUploadedFileName(null);
    setSelectedCourseCodes([]);
    setSolutions([]);
    setActiveScheduleSections([]);
    clearQueue();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
  }, [clearQueue]);

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
        queueMetrics,
        concurrency,
        setConcurrency,
        addFilesToQueue,
        retryFailedItems,
        cancelQueue,
        removeQueueItem,
        clearQueue,
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
