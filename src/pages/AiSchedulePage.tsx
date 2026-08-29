import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Layers,
  Filter,
  Sliders,
  Copy,
  Printer,
  ChevronRight,
  Check,
  Search,
  BookOpen,
  Info,
  Clock,
  MapPin,
  User,
  Zap,
  HelpCircle,
  Edit2,
  Plus,
  Trash2,
  Monitor,
  Hash,
  FileText,
  X,
  Image as ImageIcon,
  FileDown,
  Share2,
  Camera,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MasterCourseSection, ScheduleConstraints, TimetableSolution } from '../types';
import { parseMasterScheduleAI } from '../services/aiService';
import { solveTimetableCSP, COURSE_COLORS, hasTimeClash } from '../utils/schedulerCsp';
import { downloadICSFile } from '../utils/icsExport';
import { useToast } from '../context/ToastContext';
import {
  exportTimetableToPng,
  exportTimetableToPdf,
  copyTimetableImageToClipboard
} from '../utils/timetableExporter';
import { InteractiveTimetableMatrix } from '../components/InteractiveTimetableMatrix';
import { BatchScheduleUploader } from '../components/BatchScheduleUploader';
import { SubjectSelectStep } from '../components/SubjectSelectStep';
import { ConstraintSettingsStep } from '../components/ConstraintSettingsStep';
import { ScheduleOptions } from '../components/ScheduleOptions';
import {
  parseExcelOrCsvFile,
  parseRawTextSchedule,
  mergeAndDeduplicateSections,
  extractBaseCourseCode
} from '../utils/scheduleParser';
import { useSchedule } from '../context/ScheduleContext';
import masterSampleJson from '../data/masterScheduleSample.json';

// Helper to compress image before upload to drastically speed up AI processing
async function compressImageFile(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = ((e.target?.result as string) || '').split(',')[1] || '';
          return resolve({ base64: raw, mimeType: file.type || 'image/jpeg' });
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        const raw = ((e.target?.result as string) || '').split(',')[1] || '';
        resolve({ base64: raw, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Prompt Engineering Generator for AI Schedule Parsing
 * Formulates detailed instructions sent to Gemini API to guarantee 100% precision
 * for Lecturer Names, Room Codes, and Class Codes across various Vietnamese university TKB formats.
 * Enforces a strict relational join between table segments using 'STT' or 'Mã lớp' as Primary Key.
 */
export function buildMasterScheduleExtractionPrompt(options?: {
  universityPreset?: string;
  customCues?: string;
}): string {
  const presetStr = options?.universityPreset
    ? `Quy chuẩn tài liệu / trường: "${options.universityPreset}".`
    : 'Quy chuẩn: Tài liệu Thời khóa biểu đại học (HCMUE, ĐHQG-HCM, ĐHBK, HCMUTE, UEH, HUST, v.v.).';

  return [
    `=== HỆ THỐNG TRÍCH XUẤT THỜI KHÓA BIỂU QUAN HỆ CHUYÊN SÂU (GEMINI AI) ===`,
    presetStr,
    `BẠN LÀ CHUYÊN GIA TRÍCH XUẤT VÀ GHÉP NỐI DỮ LIỆU THỜI KHÓA BIỂU ĐẠI HỌC TỪ FILE PDF/EXCEL/BẢNG ẢNH CÓ CẤU TRÚC PHÂN TÁCH CỘT HOẶC NHIỀU KHỐI TRANG.`,
    ``,
    `NGUYÊN TẮC BẮT BUỘC: THỰC HIỆN RELATIONAL JOIN TUYỆT ĐỐI THEO KHÓA CHÍNH 'STT' HOẶC 'MÃ LỚP HỌC PHẦN'`,
    `1. Nhận diện cấu trúc bảng quan hệ phân tách nhiều khối (Multi-segment Table):`,
    `   - Trong các tài liệu TKB PDF hoặc bảng biểu in, dữ liệu của một lớp học phần thường bị chia cắt thành 3 khối bảng lặp lại cột "STT" (Số thứ tự) hoặc "Mã LHP":`,
    `     * Phân đoạn 1 (Định danh môn học): STT, Mã HP (courseCode), Mã LHP (classCode), Tên môn học (courseName), Số TC (credits).`,
    `     * Phân đoạn 2 (Thời gian biểu): STT, Thứ (dayOfWeek: 2-7, CN là 8), Tiết bắt đầu (startPeriod: 1-12), Tiết kết thúc (endPeriod: 1-12).`,
    `     * Phân đoạn 3 (Địa điểm & Nhân sự): STT, Phòng học (room), Giảng viên / CBGD (lecturer).`,
    `2. RÀNG BUỘC GHÉP NỐI QUAN HỆ CHẶT CHẼ (STRICT ROW-LEVEL INTEGRITY):`,
    `   - Dùng STT (Số thứ tự) làm KHÓA CHÍNH (PRIMARY KEY) để JOIN chính xác tất cả các phân đoạn thuộc cùng một STT = k thành một bản ghi hoàn chỉnh:`,
    `     Row(STT = k, Segment 1) ⨝ Row(STT = k, Segment 2) ⨝ Row(STT = k, Segment 3).`,
    `   - Dữ liệu Giảng viên và Phòng học ở dòng STT = k BẮT BUỘC phải map đúng 100% vào Mã LHP và Tên môn ở dòng STT = k.`,
    `   - TUYỆT ĐỐI CẤM LỆCH DÒNG / LỆCH CỘT (NO ROW DRIFT / NO COLUMN MISALIGNMENT):`,
    `     Nếu một ô Giảng viên hoặc Phòng học bị trống/gạch ngang (-), BẮT BUỘC gán giá trị placeholder tương ứng ("Chưa phân công" / "Chưa xếp phòng") tại đúng STT đó.`,
    `     Tuyệt đối KHÔNG ĐƯỢC trượt hoặc dồn dữ liệu của STT sau lên STT trước.`,
    ``,
    `3. XỬ LÝ LỚP HỌC CÓ NHIỀU BUỔI / CA TRONG TUẦN (Lý thuyết + Thực hành hoặc 2 buổi/tuần):`,
    `   - Khi cùng một STT hoặc cùng một Mã LHP có 2 dòng lịch học (Ví dụ: Buổi 1 Thứ 2 Tiết 1-3 tại A.302 do GV A dạy; Buổi 2 Thứ 5 Tiết 7-9 tại Lab 1 do GV B dạy):`,
    `     + Tách thành 2 đối tượng JSON độc lập trong mảng trả về.`,
    `     + Cả 2 đối tượng đều mang chung STT, courseCode, classCode, courseName, credits.`,
    `     + Khớp chính xác Giảng viên (lecturer), Phòng học (room), Thứ (dayOfWeek), Tiết học (startPeriod, endPeriod) tương ứng với từng buổi học.`,
    ``,
    `4. QUY TẮC BẮT BUỘC CHO TÊN GIẢNG VIÊN (lecturer):`,
    `   - Quét từ các cột: "CBGD", "Giảng viên", "Cán bộ giảng dạy", "GV", "Giáo viên phụ trách", "Instructor".`,
    `   - Giữ nguyên 100% đầy đủ họ tên kèm toàn bộ chức danh học hàm/học vị ghi trong tài liệu (Ví dụ: "TS. Nguyễn Trần Phi Phượng", "PGS.TS Lê Hoàng Nam", "ThS. Trịnh Huy Hoàng", "Lê Trần Trí Thức (TG)", "Nguyễn Thị Huỳnh Trâm (GV mời)"...).`,
    `   - Tuyệt đối không thay đổi tên, không cắt ngắn, không bịa tên nếu tài liệu đã có. Nếu ô trống, gán "Chưa phân công".`,
    ``,
    `5. QUY TẮC BẮT BUỘC CHO PHÒNG HỌC (room):`,
    `   - Quét từ các cột: "Phòng", "Phòng học", "Địa điểm", "Room", "Cơ sở", "Lab", "PM", "Giảng đường".`,
    `   - Trích xuất CHÍNH XÁC ký hiệu phòng thực tế (Ví dụ: "D.207 LVS", "B.114", "A.414", "I.203", "I.102", "C.305", "Lab 1 (D.101)", "PM3", "Online", "HT.A"...).`,
    `   - Không gán phòng giả định. Nếu ô trống, gán "Chưa xếp phòng".`,
    ``,
    `6. QUY TẮC MÃ LỚP HỌC PHẦN (classCode) & MÃ HỌC PHẦN (courseCode):`,
    `   - "courseCode": Mã môn học cơ sở (Ví dụ: "COMP1801", "COMP1010", "MATH1005").`,
    `   - "classCode": Mã lớp học phần duy nhất (Ví dụ: "COMP180101", "COMP101001", "2411COMP101001").`,
    `   - "classType": "LT" (Lý thuyết) hoặc "TH" (Thực hành/Phòng máy).`,
    `   - "dayOfWeek": Thứ 2 = 2, Thứ 3 = 3, ..., Thứ 7 = 7, Chủ Nhật = 8.`,
    `   - "startPeriod" / "endPeriod": Số nguyên từ 1 đến 12.`,
    `   - "weeks": Chuỗi tuần học (Ví dụ: "1-15", "1-10,12-16").`,
    options?.customCues ? `GHI CHÚ BỔ SUNG TỪ NGƯỜI DÙNG: ${options.customCues}` : ''
  ].filter(Boolean).join('\n');
}

interface AiSchedulePageProps {
  onNavigate?: (path: string) => void;
}

export interface GroupedMasterClass {
  key: string;
  classCode: string;
  courseCode: string;
  courseName: string;
  classType: string;
  group?: string;
  credits?: number;
  weeks?: string;
  sourceFile?: string;
  lecturers: string[];
  sessions: {
    dayOfWeek: number;
    startPeriod: number;
    endPeriod: number;
    room: string;
    classType?: string;
    lecturer?: string;
    weeks?: string;
  }[];
  originalSections: MasterCourseSection[];
}

const AiSchedulePageComponent: React.FC<AiSchedulePageProps> = ({ onNavigate }) => {
  const { toast } = useToast();

  const {
    activeStage,
    setActiveStage,
    masterCatalog,
    setMasterCatalog,
    activeUploadedFileName,
    setActiveUploadedFileName,
    activeSourceFiles,
    setActiveSourceFiles,
    selectedCourseCodes,
    setSelectedCourseCodes,
    constraints,
    setConstraints,
    solutions,
    setSolutions,
    selectedSolutionIndex,
    setSelectedSolutionIndex,
    activeScheduleSections,
    setActiveScheduleSections,
    runScheduler,
    handleBatchComplete: ctxBatchComplete,
    handleRemoveFile: ctxRemoveFile,
    handleClearAllFiles: ctxClearAllFiles,
    handleResetAll: ctxResetAll,
    isProcessing: queueProcessing,
    overallProgress: queueProgress,
    fileQueue,
    queueMetrics
  } = useSchedule();

  // Search filter for master catalog
  const [catalogSearch, setCatalogSearch] = useState('');
  const [classTypeFilter, setClassTypeFilter] = useState<'all' | 'LT' | 'TH'>('all');

  // Modal for editing/adding sections
  const [editingSection, setEditingSection] = useState<{ index: number | null; data: MasterCourseSection } | null>(null);

  // Processing & Toast status
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');
  const [rawUniversityPreset, setRawUniversityPreset] = useState<string>('HCMUE - ĐH Sư Phạm TP.HCM');
  const [rawCustomCues, setRawCustomCues] = useState<string>('');
  const [showRawInputModal, setShowRawInputModal] = useState(false);

  // Extract unique courses in catalog
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, { code: string; name: string; sectionCount: number; hasLab: boolean }>();
    masterCatalog.forEach((sec) => {
      const code = sec.courseCode || extractBaseCourseCode(sec.classCode);
      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          code: code,
          name: sec.courseName,
          sectionCount: 1,
          hasLab: sec.classType === 'TH'
        });
      } else {
        existing.sectionCount += 1;
        if (sec.classType === 'TH') existing.hasLab = true;
      }
    });
    return Array.from(map.values());
  }, [masterCatalog]);

  // Reset to default sample catalog
  const handleResetSampleCatalog = useCallback(() => {
    const sampleData = masterSampleJson as MasterCourseSection[];
    setMasterCatalog(sampleData);
    setActiveUploadedFileName(null);
    setActiveSourceFiles([]);
    const sampleCodes = ['COMP1801', 'COMP1800', 'COMP1010', 'COMP1016', 'COMP1017'];
    setSelectedCourseCodes(sampleCodes);
    runScheduler(sampleCodes, constraints);
    setStatusMessage('Đã khôi phục danh mục thời khóa biểu mẫu Khoa CNTT - HCMUE.');
  }, [constraints, runScheduler, setActiveSourceFiles, setActiveUploadedFileName, setMasterCatalog, setSelectedCourseCodes]);

  // Handle Batch Files Completion
  const handleBatchComplete = useCallback((
    incomingSections: MasterCourseSection[],
    sourceFileNames: string[],
    mode: 'merge' | 'replace'
  ) => {
    ctxBatchComplete(incomingSections, sourceFileNames, mode);
  }, [ctxBatchComplete]);

  // Section Add / Edit Handlers
  const handleSaveSection = useCallback((savedData: MasterCourseSection, targetIndex: number | null) => {
    let updated: MasterCourseSection[];
    if (targetIndex !== null && targetIndex >= 0 && targetIndex < masterCatalog.length) {
      updated = masterCatalog.map((item, idx) => (idx === targetIndex ? savedData : item));
    } else {
      updated = [savedData, ...masterCatalog];
    }
    setMasterCatalog(updated);
    setEditingSection(null);
    runScheduler(selectedCourseCodes, constraints, updated);
    setStatusMessage(targetIndex !== null ? `Đã cập nhật lớp học phần "${savedData.classCode}"!` : `Đã thêm lớp học phần mới "${savedData.classCode}"!`);
  }, [constraints, masterCatalog, runScheduler, selectedCourseCodes]);

  const handleDeleteSection = useCallback((indexToDelete: number) => {
    const deletedItem = masterCatalog[indexToDelete];
    const updated = masterCatalog.filter((_, idx) => idx !== indexToDelete);
    setMasterCatalog(updated);
    runScheduler(selectedCourseCodes, constraints, updated);
    setStatusMessage(`Đã xóa lớp học phần "${deletedItem?.classCode || 'đã chọn'}".`);
  }, [constraints, masterCatalog, runScheduler, selectedCourseCodes]);

  // Xóa toàn bộ các buổi học của mã lớp học phần khỏi danh mục TKB tổng
  const handleDeleteGroupedClass = useCallback((classCodeToDelete: string, courseCode?: string) => {
    const targetClass = (classCodeToDelete || '').trim().toUpperCase();
    const updated = masterCatalog.filter((s) => {
      if (targetClass && s.classCode) {
        return (s.classCode || '').trim().toUpperCase() !== targetClass;
      }
      return s.courseCode !== courseCode;
    });
    setMasterCatalog(updated);

    // Xóa khỏi TKB đang xếp nếu lớp này đang có trong lịch
    const updatedActive = activeScheduleSections.filter((s) => {
      if (targetClass && s.classCode) {
        return (s.classCode || '').trim().toUpperCase() !== targetClass;
      }
      return s.courseCode !== courseCode;
    });
    setActiveScheduleSections(updatedActive);

    // Kiểm tra xem môn học này còn lớp học phần nào khác trong danh mục không
    const remainingCodes = new Set(updated.map((s) => s.courseCode || extractBaseCourseCode(s.classCode)));
    const updatedSelected = selectedCourseCodes.filter((c) => remainingCodes.has(c));
    setSelectedCourseCodes(updatedSelected);

    if (updated.length > 0 && updatedSelected.length > 0) {
      runScheduler(updatedSelected, constraints, updated);
    } else {
      setSolutions([]);
    }
    toast.info(`Đã xóa lớp học phần "${classCodeToDelete || courseCode}" khỏi danh mục TKB tổng.`);
  }, [activeScheduleSections, constraints, masterCatalog, runScheduler, selectedCourseCodes, toast]);

  // Xóa một tệp nguồn cụ thể và tự động loại bỏ tất cả các môn/lớp thuộc tệp đó
  const handleRemoveSourceFile = useCallback((fileNameToRemove: string) => {
    // 1. Cập nhật danh sách tệp nguồn
    const updatedSourceFiles = activeSourceFiles.filter((f) => f !== fileNameToRemove);
    setActiveSourceFiles(updatedSourceFiles);
    setActiveUploadedFileName(updatedSourceFiles.length > 0 ? updatedSourceFiles.join(', ') : null);

    // 2. Xóa tất cả các lớp học phần xuất phát từ tệp này khỏi masterCatalog
    const updatedCatalog = masterCatalog.filter((sec) => sec.sourceFile !== fileNameToRemove);
    setMasterCatalog(updatedCatalog);

    // 3. Xóa các buổi học thuộc tệp này khỏi TKB đang xếp
    const updatedActive = activeScheduleSections.filter((sec) => sec.sourceFile !== fileNameToRemove);
    setActiveScheduleSections(updatedActive);

    // 4. Cập nhật lại danh sách môn đã chọn nếu môn đó không còn lớp nào trong catalog
    const remainingCodes = new Set(updatedCatalog.map((sec) => sec.courseCode || extractBaseCourseCode(sec.classCode)));
    const updatedSelected = selectedCourseCodes.filter((c) => remainingCodes.has(c));
    setSelectedCourseCodes(updatedSelected);

    // 5. Tự động tính toán lại phương án
    if (updatedCatalog.length > 0 && updatedSelected.length > 0) {
      runScheduler(updatedSelected, constraints, updatedCatalog);
    } else {
      setSolutions([]);
      if (updatedCatalog.length === 0) {
        setActiveScheduleSections([]);
      }
    }

    toast.info(`Đã xóa tệp "${fileNameToRemove}" và tự động loại bỏ các môn trong tệp khỏi TKB tổng.`);
  }, [activeScheduleSections, activeSourceFiles, constraints, masterCatalog, runScheduler, selectedCourseCodes, toast]);

  // Làm sạch toàn bộ dữ liệu TKB
  const handleClearAllCatalogData = useCallback(() => {
    setMasterCatalog([]);
    setActiveSourceFiles([]);
    setActiveUploadedFileName(null);
    setSelectedCourseCodes([]);
    setSolutions([]);
    setActiveScheduleSections([]);
    toast.info('Đã xóa sạch toàn bộ danh mục và dữ liệu Thời khóa biểu.');
  }, [toast]);

  // Thêm trực tiếp lớp học phần vào Thời khóa biểu đang xem & Tự động kiểm tra phát hiện trùng lịch chính xác
  const handleAddSectionDirectlyToSchedule = useCallback((secToAdd: MasterCourseSection | MasterCourseSection[]) => {
    const rawList = Array.isArray(secToAdd) ? secToAdd : [secToAdd];
    const firstItem = rawList[0];
    if (!firstItem) return;

    const baseCourseCode = extractBaseCourseCode(firstItem.classCode, firstItem.courseCode);
    const targetClassCode = (firstItem.classCode || '').trim().toUpperCase();

    // Lấy toàn bộ các buổi của lớp học phần này
    let sectionsToInsert: MasterCourseSection[] = [];
    if (Array.isArray(secToAdd) && secToAdd.length > 1) {
      sectionsToInsert = secToAdd;
    } else {
      sectionsToInsert = masterCatalog.filter((s) => {
        if (targetClassCode && s.classCode) {
          return (s.classCode || '').trim().toUpperCase() === targetClassCode;
        }
        return (
          extractBaseCourseCode(s.classCode, s.courseCode) === baseCourseCode &&
          s.group === firstItem.group
        );
      });
    }

    if (sectionsToInsert.length === 0) {
      sectionsToInsert = rawList;
    }

    // Lọc bỏ các buổi học cũ của CÙNG MÔN HỌC (hoặc cùng mã lớp) trong TKB đang xếp
    const otherSectionsInSchedule = activeScheduleSections.filter((s) => {
      const sBaseCode = extractBaseCourseCode(s.classCode, s.courseCode);
      const sClassCode = (s.classCode || '').trim().toUpperCase();
      if (sClassCode && targetClassCode && sClassCode === targetClassCode) return false;
      if (sBaseCode && baseCourseCode && sBaseCode === baseCourseCode) return false;
      return true;
    });

    // Kiểm tra xung đột trùng giờ CHỈ VỚI CÁC MÔN HỌC KHÁC trong TKB
    const clashingPairs: { addedSec: MasterCourseSection; activeSec: MasterCourseSection }[] = [];
    for (const addSec of sectionsToInsert) {
      const roomUpper = (addSec.room || '').toUpperCase();
      if (roomUpper.includes('ONLINE') || roomUpper.includes('VLE') || addSec.dayOfWeek < 2 || addSec.startPeriod <= 0) {
        continue;
      }
      for (const actSec of otherSectionsInSchedule) {
        if (hasTimeClash(addSec, actSec)) {
          clashingPairs.push({ addedSec: addSec, activeSec: actSec });
        }
      }
    }

    // Cập nhật thời khóa biểu đang xem
    const newActive = [...otherSectionsInSchedule, ...sectionsToInsert];
    setActiveScheduleSections(newActive);

    // Đảm bảo môn học được chọn trong danh sách
    if (baseCourseCode && !selectedCourseCodes.includes(baseCourseCode)) {
      setSelectedCourseCodes((prev) => [...prev, baseCourseCode]);
    }

    if (clashingPairs.length > 0) {
      const p = clashingPairs[0];
      const dayLabel = p.addedSec.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${p.addedSec.dayOfWeek}`;
      toast.warning(
        `⚠️ Cảnh báo trùng lịch: Môn "${p.addedSec.courseName}" (${p.addedSec.classCode}) bị trùng giờ ${dayLabel} (Tiết ${p.addedSec.startPeriod}-${p.addedSec.endPeriod}) với môn "${p.activeSec.courseName}" (${p.activeSec.classCode})!`
      );
    } else {
      toast.success(`✨ Đã thêm môn "${firstItem.courseName}" (${firstItem.classCode}) vào Thời khóa biểu (Không bị trùng lịch)!`);
    }
  }, [activeScheduleSections, masterCatalog, selectedCourseCodes, toast]);

  // Toggle selection of a course
  const toggleCourseSelection = useCallback((code: string) => {
    let next: string[];
    if (selectedCourseCodes.includes(code)) {
      next = selectedCourseCodes.filter((c) => c !== code);
    } else {
      next = [...selectedCourseCodes, code];
    }
    setSelectedCourseCodes(next);
    runScheduler(next, constraints);
  }, [constraints, runScheduler, selectedCourseCodes]);

  // Select all or clear all
  const handleSelectAllCourses = useCallback(() => {
    const allCodes = uniqueCourses.map((c) => c.code);
    setSelectedCourseCodes(allCodes);
    runScheduler(allCodes, constraints);
  }, [constraints, runScheduler, uniqueCourses]);

  const handleClearAllCourses = useCallback(() => {
    setSelectedCourseCodes([]);
    setSolutions([]);
    setActiveScheduleSections([]);
  }, []);

  // Apply a solution to the active matrix
  const handleApplySolution = useCallback((index: number) => {
    setSelectedSolutionIndex(index);
    if (solutions[index]) {
      setActiveScheduleSections(solutions[index].sections);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    }
  }, [solutions]);

  // Copy registration codes (Mã đăng ký học phần) to clipboard for university portal
  const handleCopyClassCodes = useCallback(() => {
    const codes = activeScheduleSections.map((s) => s.classCode).join(', ');
    navigator.clipboard.writeText(codes);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }, [activeScheduleSections]);

  // Download .ics file
  const handleDownloadICS = useCallback(() => {
    downloadICSFile(activeScheduleSections, 'ThoiKhoaBieu_HCMUE_FitVault.ics');
  }, [activeScheduleSections]);

  // Export timetable as High-Res PNG Image (2x Retina)
  const handleExportPng = useCallback(async () => {
    setIsExportingPng(true);
    setStatusMessage('Đang kết xuất ảnh PNG độ nét cao (2x Retina)...');
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const res = await exportTimetableToPng(
        'timetable-render-canvas',
        `ThoiKhoaBieu_HCMUE_${dateStr}.png`,
        { theme: 'dark' }
      );
      if (res.success) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setStatusMessage('Đã tải xuống ảnh thời khóa biểu (PNG) chất lượng cao thành công!');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage('Không thể tạo ảnh PNG: ' + (res.error || 'Lỗi không xác định'));
      }
    } catch (err: any) {
      setStatusMessage('Lỗi khi xuất ảnh: ' + err.message);
    } finally {
      setIsExportingPng(false);
    }
  }, []);

  // Export timetable as Landscape A4 PDF
  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    setStatusMessage('Đang tạo tệp PDF A4 chuẩn thời khóa biểu...');
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const res = await exportTimetableToPdf(
        'timetable-render-canvas',
        activeScheduleSections,
        `ThoiKhoaBieu_HCMUE_${dateStr}.pdf`,
        {
          semesterTitle: 'TRƯỜNG ĐẠI HỌC SƯ PHẠM TP.HCM - THỜI KHÓA BIỂU HỌC KỲ'
        }
      );
      if (res.success) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setStatusMessage('Đã xuất và tải về tệp PDF thời khóa biểu chuẩn A4 thành công!');
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage('Không thể tạo file PDF: ' + (res.error || 'Lỗi không xác định'));
      }
    } catch (err: any) {
      setStatusMessage('Lỗi khi xuất PDF: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  }, [activeScheduleSections]);

  // Copy timetable image directly to clipboard
  const handleCopyImage = useCallback(async () => {
    setIsCopyingImage(true);
    setStatusMessage('Đang sao chép ảnh TKB vào bộ nhớ tạm...');
    try {
      const ok = await copyTimetableImageToClipboard('timetable-render-canvas');
      if (ok) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        setStatusMessage('Đã copy ảnh thời khóa biểu vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo, Messenger, Word.');
        setTimeout(() => setStatusMessage(null), 4500);
      } else {
        setStatusMessage('Trình duyệt chưa hỗ trợ copy ảnh trực tiếp. Vui lòng bấm "Xuất ảnh PNG" để tải ảnh!');
        setTimeout(() => setStatusMessage(null), 4500);
      }
    } catch (err: any) {
      setStatusMessage('Không thể copy ảnh: ' + err.message);
    } finally {
      setIsCopyingImage(false);
    }
  }, []);

  // Print schedule
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Memoized class type counts
  const classTypeCounts = React.useMemo(() => {
    let lt = 0;
    let th = 0;
    for (const s of masterCatalog) {
      if (s.classType === 'LT') lt++;
      else if (s.classType === 'TH') th++;
    }
    return { lt, th };
  }, [masterCatalog]);

  // Filtered master courses for preview table (memoized to avoid re-filtering on theme switch)
  const filteredCatalog = React.useMemo(() => {
    const searchLower = catalogSearch.trim().toLowerCase();
    return masterCatalog.filter((s) => {
      const matchesSearch =
        !searchLower ||
        s.courseName.toLowerCase().includes(searchLower) ||
        s.courseCode.toLowerCase().includes(searchLower) ||
        s.classCode.toLowerCase().includes(searchLower) ||
        s.lecturer.toLowerCase().includes(searchLower) ||
        s.room.toLowerCase().includes(searchLower) ||
        (s.group && s.group.toLowerCase().includes(searchLower));

      const matchesType =
        classTypeFilter === 'all' || s.classType === classTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [masterCatalog, catalogSearch, classTypeFilter]);

  // Gộp các buổi học của cùng một mã lớp học phần vào một dòng duy nhất để tránh rối mắt (Requirement 3)
  const groupedCatalog = React.useMemo(() => {
    const map = new Map<string, GroupedMasterClass>();

    for (const s of filteredCatalog) {
      const key = (s.classCode || '').trim().toUpperCase() || `${s.courseCode}_${s.group}_${s.classType}`;
      let item = map.get(key);
      if (!item) {
        item = {
          key,
          classCode: s.classCode,
          courseCode: s.courseCode,
          courseName: s.courseName,
          classType: s.classType || 'LT',
          group: s.group,
          credits: s.credits,
          weeks: s.weeks,
          sourceFile: s.sourceFile,
          lecturers: s.lecturer && s.lecturer !== 'Chưa phân công' ? [s.lecturer] : [],
          sessions: [],
          originalSections: []
        };
        map.set(key, item);
      }

      // Thêm buổi học
      item.sessions.push({
        dayOfWeek: s.dayOfWeek,
        startPeriod: s.startPeriod,
        endPeriod: s.endPeriod,
        room: s.room,
        classType: s.classType,
        lecturer: s.lecturer,
        weeks: s.weeks
      });

      // Thêm giảng viên nếu có giảng viên khác
      if (s.lecturer && s.lecturer !== 'Chưa phân công' && !item.lecturers.includes(s.lecturer)) {
        item.lecturers.push(s.lecturer);
      }

      // Điều chỉnh phân loại lớp
      if (s.classType === 'TH' && item.classType === 'LT') {
        item.classType = 'LT+TH';
      } else if (s.classType === 'TH' && item.sessions.length === 1) {
        item.classType = 'TH';
      }

      item.originalSections.push(s);
    }

    return Array.from(map.values());
  }, [filteredCatalog]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header Introduction */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
            <button
              onClick={() => {
                if (typeof onNavigate === 'function') {
                  onNavigate('/');
                }
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Trang chủ
            </button>
            <span>/</span>
            <span>Khoa CNTT</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Công cụ học vụ thông minh</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Trợ Lý Xếp Thời Khóa Biểu (TKB Tổng)</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 mt-2.5 max-w-3xl leading-relaxed font-normal border-l-2 border-indigo-500/80 dark:border-indigo-400/80 pl-3.5 py-0.5">
            Hỗ trợ sinh viên tự động lập và tối ưu thời khóa biểu thông minh, loại bỏ hoàn toàn trùng lịch và tiết kiệm tối đa thời gian đăng ký môn học.
          </p>
        </div>
      </div>

      {/* Persistent Background Queue Progress Banner */}
      {queueProcessing && activeStage !== 1 && (
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200 min-w-0">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span className="truncate">
              Đang xử lý ngầm {queueMetrics?.completedFiles ?? 0}/{fileQueue.length} tệp thời khóa biểu ({queueProgress}%)... Dữ liệu sẽ tự động đồng bộ vào danh mục khi hoàn tất.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveStage(1)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-sm"
          >
            Xem tiến trình
          </button>
        </div>
      )}

      {/* Stage Stepper Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveStage(1)}
          className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeStage === 1
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              activeStage === 1
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            1
          </div>
          <span className="truncate">Nạp TKB Tổng</span>
          <span className="text-xs opacity-75 font-mono">({groupedCatalog.length} Lớp)</span>
        </button>

        <button
          onClick={() => masterCatalog.length > 0 && setActiveStage(2)}
          disabled={masterCatalog.length === 0}
          className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all ${
            masterCatalog.length === 0
              ? 'opacity-40 cursor-not-allowed text-slate-400'
              : 'cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
          } ${
            activeStage === 2
              ? 'bg-blue-600 text-white shadow-md'
              : ''
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              activeStage === 2
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            2
          </div>
          <span className="truncate">Chọn Môn</span>
          <span className="text-xs opacity-75 font-mono">({selectedCourseCodes.length})</span>
        </button>

        <button
          onClick={() => {
            if (masterCatalog.length > 0) {
              setActiveStage(3);
              runScheduler();
            }
          }}
          disabled={masterCatalog.length === 0}
          className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all ${
            masterCatalog.length === 0
              ? 'opacity-40 cursor-not-allowed text-slate-400'
              : 'cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
          } ${
            activeStage === 3
              ? 'bg-blue-600 text-white shadow-md'
              : ''
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              activeStage === 3
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            3
          </div>
          <span className="truncate">Phương Án</span>
          <span className="text-xs opacity-75 font-mono">({solutions.length} PA)</span>
        </button>

        <button
          onClick={() => masterCatalog.length > 0 && setActiveStage(4)}
          disabled={masterCatalog.length === 0}
          className={`flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all ${
            masterCatalog.length === 0
              ? 'opacity-40 cursor-not-allowed text-slate-400'
              : 'cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
          } ${
            activeStage === 4
              ? 'bg-blue-600 text-white shadow-md'
              : ''
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              activeStage === 4
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            4
          </div>
          <span className="truncate">Ma Trận & Xuất</span>
          <span className="text-xs opacity-75 font-mono">(.ics)</span>
        </button>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-950/50 dark:border-blue-800/50 dark:text-blue-200 text-xs animate-in fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800/50"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ========================================================
          STAGE 1: BULK EXTRACTION & MASTER COURSE CATALOG
      ======================================================== */}
      {activeStage === 1 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Batch Upload & Ingestion Component with Visual Progress Tracker */}
          <BatchScheduleUploader
            onBatchComplete={handleBatchComplete}
            activeSourceFiles={activeSourceFiles}
            masterCatalogCount={masterCatalog.length}
            uniqueCoursesCount={uniqueCourses.length}
            onResetSample={handleResetSampleCatalog}
            onOpenRawInputModal={() => setShowRawInputModal(true)}
            onProceedToStep2={() => setActiveStage(2)}
            selectedCourseCodesCount={selectedCourseCodes.length}
            onRemoveFile={handleRemoveSourceFile}
            onClearAllFiles={handleClearAllCatalogData}
          />

          {/* Master Catalog Explorer Table (Grouped by Class Code) - Only shown after user uploads TKB */}
          {masterCatalog.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-transparent flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Danh mục Thời khóa biểu tổng</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono text-[11px] font-semibold border border-blue-200/60 dark:border-blue-800/40">
                      {groupedCatalog.length} lớp học phần
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Bao gồm <strong className="text-slate-900 dark:text-slate-200">{uniqueCourses.length} môn học</strong> ({masterCatalog.length} buổi học). Các buổi học cùng mã lớp đã được gom gọn vào ô thời gian.
                  </p>
                </div>
              </div>

              {/* Controls: Type Filter, Search input & Add section button in responsive neat row */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full 2xl:w-auto">
                {/* Type Filter */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setClassTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      classTypeFilter === 'all'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Tất cả ({groupedCatalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassTypeFilter('LT')}
                    className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      classTypeFilter === 'LT'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Lý thuyết ({classTypeCounts.lt})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassTypeFilter('TH')}
                    className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                      classTypeFilter === 'TH'
                        ? 'bg-amber-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Thực hành ({classTypeCounts.th})
                  </button>
                </div>

                {/* Search input */}
                <div className="relative flex-1 sm:w-56 min-w-[140px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm môn, mã lớp, GV, phòng..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Add Section Button */}
                <button
                  type="button"
                  onClick={() =>
                    setEditingSection({
                      index: null,
                      data: {
                        courseCode: 'COMP1010',
                        courseName: 'Lập trình cơ bản',
                        classCode: 'COMP101001',
                        classType: 'LT',
                        group: 'Lớp 01',
                        lecturer: 'TS. Nguyễn Văn A',
                        dayOfWeek: 2,
                        startPeriod: 1,
                        endPeriod: 3,
                        room: 'A.302',
                        weeks: '1-15'
                      }
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm lớp HP</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-[#0e1424] sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-mono z-10">
                  <tr>
                    <th className="p-3">Môn Học</th>
                    <th className="p-3">Mã Lớp</th>
                    <th className="p-3">Thời Gian & Phòng Học</th>
                    <th className="p-3">Giảng Viên</th>
                    <th className="p-3">Tuần Học</th>
                    <th className="p-3 w-28 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {groupedCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {masterCatalog.length === 0
                              ? 'Chưa có lớp học phần nào trong danh mục'
                              : 'Không tìm thấy lớp học phần phù hợp'}
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {masterCatalog.length === 0
                              ? 'Vui lòng kéo thả hoặc tải lên tệp TKB ở trên, hoặc bấm nút "Thêm lớp HP" để tự thêm thủ công.'
                              : 'Hãy thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc về "Tất cả".'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groupedCatalog.map((item, idx) => {
                      const isMixed = item.classType === 'LT+TH';
                      const isLab = item.classType === 'TH';
                      const courseCodeDisplay = extractBaseCourseCode(item.classCode, item.courseCode);

                      return (
                        <tr
                          key={item.key || idx}
                          style={{ contentVisibility: 'auto', containIntrinsicSize: '64px' }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors"
                        >
                          {/* Cột 1 [ MÔN HỌC ]: Tên môn + Mã môn học */}
                          <td className="p-3 max-w-[240px]">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {item.courseName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                {courseCodeDisplay}
                              </span>
                            </div>
                          </td>

                          {/* Cột 2 [ MÃ LỚP ]: Hiển thị Mã lớp học phần */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="inline-flex items-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                  isLab
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                                    : isMixed
                                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                                    : 'bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                                }`}
                              >
                                {item.classCode}
                              </span>
                            </div>
                          </td>

                          {/* Cột 3 [ THỜI GIAN & PHÒNG ]: Gộp tất cả buổi học của lớp học phần */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="space-y-1.5 py-0.5">
                              {item.sessions.map((sess, sIdx) => {
                                const isOnline =
                                  (sess.room || '').toUpperCase().includes('VLE') ||
                                  (sess.room || '').toUpperCase().includes('ONLINE');
                                const dayText = sess.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${sess.dayOfWeek}`;
                                return (
                                  <div key={sIdx} className="flex items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {dayText}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                      (Tiết {sess.startPeriod}-{sess.endPeriod})
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span
                                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                                        isOnline
                                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60'
                                      }`}
                                    >
                                      {sess.room || 'Chưa xếp phòng'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Cột 4 [ GIẢNG VIÊN ]: Họ tên GV */}
                          <td className="p-3">
                            <div className="space-y-1 max-w-[200px]">
                              {item.lecturers.length > 0 ? (
                                item.lecturers.map((lec, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs truncate"
                                  >
                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{lec}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 italic">Chưa phân công</div>
                              )}
                            </div>
                          </td>

                          {/* Cột 5 [ TUẦN ]: Font-mono (VD: "1-15") */}
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                            {item.weeks || '1-15'}
                          </td>

                          {/* Cột 6 [ THAO TÁC ]: + TKB, Sửa, Xóa */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleAddSectionDirectlyToSchedule(item.originalSections)}
                                className="px-2.5 py-1 rounded-lg text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 dark:text-sky-300 dark:bg-sky-950/60 dark:hover:bg-blue-600 border border-blue-200 dark:border-sky-800 text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-xs"
                                title="Thêm toàn bộ các buổi của lớp này vào TKB đang xếp (Tự động kiểm tra trùng giờ)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>TKB</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const firstSec = item.originalSections[0];
                                  const origIdx = masterCatalog.indexOf(firstSec);
                                  setEditingSection({
                                    index: origIdx >= 0 ? origIdx : null,
                                    data: { ...firstSec }
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Chỉnh sửa lớp học phần"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGroupedClass(item.classCode, item.courseCode)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Xóa toàn bộ lớp học phần này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ========================================================
          STAGE 2: SMART FILTERING & SELECTION & CONSTRAINTS
      ======================================================== */}
      {activeStage === 2 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main selection grid: 2 columns */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Col (7/12): Subject Selector */}
            <div className="xl:col-span-7">
              <SubjectSelectStep
                uniqueCourses={uniqueCourses}
                selectedCourseCodes={selectedCourseCodes}
                onToggleCourse={toggleCourseSelection}
                onSelectAll={handleSelectAllCourses}
                onClearAll={handleClearAllCourses}
              />
            </div>

            {/* Right Col (5/12): Constraints Control Panel */}
            <div className="xl:col-span-5">
              <ConstraintSettingsStep
                constraints={constraints}
                onChangeConstraints={(next) => {
                  setConstraints(next);
                  runScheduler(selectedCourseCodes, next);
                }}
                onSubmit={() => {
                  runScheduler();
                  setActiveStage(3);
                  confetti({ particleCount: 50, spread: 60 });
                }}
                selectedCourseCount={selectedCourseCodes.length}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 3: MULTI-SOLUTION RESULTS & OPTIMIZATION
      ======================================================== */}
      {activeStage === 3 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Solutions Overview Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span>Tìm thấy {solutions.length} phương án xếp lịch tối ưu</span>
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStage(2)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Đổi ràng buộc</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStage(4)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <span>Xem ma trận TKB đầy đủ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Solutions Cards Grid */}
          <ScheduleOptions
            solutions={solutions}
            selectedSolutionIndex={selectedSolutionIndex}
            onSelectSolution={handleApplySolution}
          />

          {/* Quick Schedule Preview for currently chosen solution */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{solutions[selectedSolutionIndex]?.title || `Phương án ${selectedSolutionIndex + 1}`}</span>
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPng}
                  disabled={isExportingPng}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  title="Xuất ảnh PNG"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Xuất PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  title="Xuất tệp PDF"
                >
                  <FileDown className="w-3 h-3" />
                  <span>Xuất PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStage(4)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 ml-1"
                >
                  <span>Mở Ma trận tương tác chi tiết</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <InteractiveTimetableMatrix
              activeSections={activeScheduleSections}
              masterCatalog={masterCatalog}
              onUpdateSections={(newSecs) => setActiveScheduleSections(newSecs)}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 4: INTERACTIVE EDITING & FULL MATRIX EXPORT
      ======================================================== */}
      {activeStage === 4 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Action Export Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ma trận Thời khóa biểu Tuần (Tương tác trực tiếp)
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Bấm vào bất kỳ thẻ môn học nào để đổi ca học/nhóm thực hành khác
                </p>
              </div>
            </div>

            {/* Export Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Export PNG (2x Retina) */}
              <button
                type="button"
                onClick={handleExportPng}
                disabled={isExportingPng}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Tải về tệp ảnh PNG độ nét cao (2x Retina)"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>Xuất ảnh PNG</span>
              </button>

              {/* Export PDF (A4 Landscape) */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                title="Xuất file tài liệu PDF chuẩn A4 để in hoặc lưu trữ"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Xuất file PDF</span>
              </button>
            </div>
          </div>

          {/* Interactive Matrix Component */}
          <InteractiveTimetableMatrix
            activeSections={activeScheduleSections}
            masterCatalog={masterCatalog}
            onUpdateSections={(newSecs) => setActiveScheduleSections(newSecs)}
          />
        </div>
      )}

      {/* Section Edit / Add Modal */}
      {editingSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in"
          onClick={() => setEditingSection(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {editingSection.index !== null
                    ? `Chỉnh sửa Lớp Học Phần: ${editingSection.data.classCode}`
                    : 'Thêm Lớp Học Phần Mới Vào Danh Mục'}
                </span>
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Course Code */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Mã môn học (Course Code):</label>
                <input
                  type="text"
                  value={editingSection.data.courseCode}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, courseCode: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: COMP1010"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Course Name */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Tên môn học:</label>
                <input
                  type="text"
                  value={editingSection.data.courseName}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, courseName: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: Lập trình cơ bản"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Class Code */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Mã lớp học phần (Class Code):</label>
                <input
                  type="text"
                  value={editingSection.data.classCode}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, classCode: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: COMP101001"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Class Type */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Loại lớp:</label>
                <select
                  value={editingSection.data.classType}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, classType: e.target.value as 'LT' | 'TH' }
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                >
                  <option value="LT">Lý thuyết (LT)</option>
                  <option value="TH">Thực hành / Phòng máy (TH)</option>
                </select>
              </div>

              {/* Group */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Nhóm / Tổ / Lớp:</label>
                <input
                  type="text"
                  value={editingSection.data.group || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, group: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: Lớp 01 hoặc Nhóm TH 01"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Lecturer */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Giảng viên / CBGD:</label>
                <input
                  type="text"
                  value={editingSection.data.lecturer || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, lecturer: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: TS. Nguyễn Văn A hoặc ThS. Đỗ Minh Quân"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Room / Lab */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Phòng học / Phòng máy (Lab):</label>
                <input
                  type="text"
                  value={editingSection.data.room || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, room: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: Lab 1 (D.101), PM3, hoặc A.302"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Day of week */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Thứ học:</label>
                <select
                  value={editingSection.data.dayOfWeek}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, dayOfWeek: Number(e.target.value) }
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value={2}>Thứ 2</option>
                  <option value={3}>Thứ 3</option>
                  <option value={4}>Thứ 4</option>
                  <option value={5}>Thứ 5</option>
                  <option value={6}>Thứ 6</option>
                  <option value={7}>Thứ 7</option>
                  <option value={8}>Chủ Nhật</option>
                </select>
              </div>

              {/* Periods: Start and End */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Tiết bắt đầu & kết thúc:</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingSection.data.startPeriod}
                    onChange={(e) => {
                      const st = Number(e.target.value);
                      const ed = Math.max(st, editingSection.data.endPeriod);
                      setEditingSection({
                        ...editingSection,
                        data: { ...editingSection.data, startPeriod: st, endPeriod: ed }
                      });
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Tiết {p}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editingSection.data.endPeriod}
                    onChange={(e) => {
                      const ed = Number(e.target.value);
                      const st = Math.min(ed, editingSection.data.startPeriod);
                      setEditingSection({
                        ...editingSection,
                        data: { ...editingSection.data, startPeriod: st, endPeriod: ed }
                      });
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Tiết {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weeks */}
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Tuần học:</label>
                <input
                  type="text"
                  value={editingSection.data.weeks || ''}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      data: { ...editingSection.data, weeks: e.target.value }
                    })
                  }
                  placeholder="Ví dụ: 1-15 hoặc 1-10, 12-16"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSaveSection(editingSection.data, editingSection.index)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu thông tin lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Text Input Modal with Prompt Engineering Controls */}
      {showRawInputModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in"
          onClick={() => setShowRawInputModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Trích xuất TKB bằng Prompt Engineering Trợ lý
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tối ưu hóa độ chính xác trích xuất Giảng viên, Phòng học và Mã lớp học phần
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRawInputModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* University Preset Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Định dạng trường đại học:
                </label>
                <select
                  value={rawUniversityPreset}
                  onChange={(e) => setRawUniversityPreset(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="HCMUE - ĐH Sư Phạm TP.HCM">HCMUE - Trường ĐH Sư Phạm TP.HCM</option>
                  <option value="Tài liệu PDF / Bảng phân tách cột (STT & Primary Key JOIN)">Tài liệu PDF / Bảng phân tách cột (STT & Primary Key JOIN)</option>
                  <option value="ĐHQG-HCM (Bách Khoa, KHTN, CNTT, KHXH&NV, UEL)">ĐHQG-HCM (Bách Khoa, KHTN, UIT, UEL)</option>
                  <option value="HCMUTE - ĐH Sư Phạm Kỹ Thuật TP.HCM">HCMUTE - ĐH Sư Phạm Kỹ Thuật TP.HCM</option>
                  <option value="UEH - Đại học Kinh tế TP.HCM">UEH - Đại học Kinh tế TP.HCM</option>
                  <option value="HUST - Đại học Bách Khoa Hà Nội">HUST - Đại học Bách Khoa Hà Nội</option>
                  <option value="Tiêu chuẩn chung / Toàn quốc">Tiêu chuẩn chung / Toàn quốc</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú trích xuất bổ sung (tùy chọn):
                </label>
                <input
                  type="text"
                  value={rawCustomCues}
                  onChange={(e) => setRawCustomCues(e.target.value)}
                  placeholder="VD: Cột CBGD ghi họ tên giảng viên, cột phòng có Lab..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Instruction Highlights */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Quy tắc trích xuất nâng cao được kích hoạt tự động:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300 pl-1">
                <li><strong>Giảng viên (lecturer):</strong> Giữ nguyên 100% họ tên & học hàm/học vị thực tế (TS, ThS, PGS.TS, Thầy/Cô...).</li>
                <li><strong>Phòng học (room):</strong> Nhận diện chính xác ký hiệu phòng (A.302, B.204, Lab 1, PM3, Online...).</li>
                <li><strong>Mã lớp (classCode):</strong> Trích xuất chuẩn xác mã lớp học phần riêng biệt và phân tách đúng buổi nhiều ca.</li>
              </ul>
            </div>

            <textarea
              rows={7}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder={`Dán bảng thời khóa biểu hoặc dữ liệu văn bản từ cổng đào tạo tại đây...\nVí dụ:\nCOMP1010 Lập trình cơ bản COMP101001 LT Thứ 2 Tiết 1-3 Phòng A302 TS Nguyễn Văn Hùng\nCOMP1010 Lập trình cơ bản COMP101001 LT Thứ 5 Tiết 1-3 Phòng A302 TS Nguyễn Văn Hùng\nCOMP1011 Cấu trúc dữ liệu COMP101101 LT Thứ 3 Tiết 7-9 Phòng B204 ThS Đỗ Minh Quân`}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRawInputModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!rawTextInput.trim() || isProcessing}
                onClick={async () => {
                  setShowRawInputModal(false);
                  setIsProcessing(true);
                  setStatusMessage('Đang phân tích và trích xuất dữ liệu thời khóa biểu bằng Trợ lý thông minh với bộ prompt tối ưu...');
                  try {
                    const engineeredPrompt = buildMasterScheduleExtractionPrompt({
                      universityPreset: rawUniversityPreset,
                      customCues: rawCustomCues
                    });
                    const res = await parseMasterScheduleAI({
                      textData: rawTextInput,
                      customPrompt: engineeredPrompt,
                      universityPreset: rawUniversityPreset
                    });
                    if (res.success && res.data.length > 0) {
                      setMasterCatalog(res.data);
                      setStatusMessage(`✨ Đã trích xuất chuẩn xác ${res.data.length} lớp học phần (Định dạng: ${rawUniversityPreset}).`);
                      const uniqueCodes = Array.from(new Set(res.data.map((d) => d.courseCode)));
                      const initialSelected = uniqueCodes.slice(0, Math.min(5, uniqueCodes.length));
                      setSelectedCourseCodes(initialSelected);
                      runScheduler(initialSelected, constraints, res.data);
                      confetti({ particleCount: 60 });
                      toast.success(`Đã trích xuất thành công ${res.data.length} lớp học phần.`);
                    } else {
                      const msg = res.message || 'Không tìm thấy lớp học phần phù hợp trong nội dung dán vào.';
                      setStatusMessage(msg);
                      toast.warning(msg);
                    }
                  } catch (err: any) {
                    const errText = err.message || 'Lỗi trích xuất thời khóa biểu';
                    setStatusMessage(`⚠️ ${errText}`);
                    toast.error(errText);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Trích xuất bằng Trợ lý thông minh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AiSchedulePage = React.memo(AiSchedulePageComponent);
