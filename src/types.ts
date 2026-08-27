export type SubjectCategory = 'general' | 'foundation' | 'specialized' | 'elective' | 'capstone';

export interface GradingWeights {
  process: number; // Điểm quá trình / chuyên cần (ví dụ: 0.2 = 20%)
  midterm: number | null; // Điểm giữa kỳ (null nếu không có)
  practical: number | null; // Điểm thực hành (ví dụ: 0.4 = 40%)
  final: number; // Điểm cuối kỳ (ví dụ: 0.4 = 40%)
}

export interface PrerequisiteCourse {
  code: string;
  name: string;
}

export interface SyllabusChapter {
  chapter: number;
  title: string;
  description: string;
  topics?: string[];
}

export interface LabExerciseOutline {
  labNumber: number;
  title: string;
  description: string;
  toolsOrTech?: string[];
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  englishName: string;
  category: SubjectCategory;
  categoryName: string;
  semester: string;
  credits: number;
  theoryHours: number;
  practicalHours: number;
  description: string;
  driveUrl: string;
  lastUpdated: string;
  gradingWeights: GradingWeights;
  prerequisites: {
    previousCourses: PrerequisiteCourse[];
    prerequisiteCourses: PrerequisiteCourse[];
  };
  syllabus: SyllabusChapter[];
  practicalOutline?: LabExerciseOutline[];
  examFormat?: 'Thi tập trung' | 'Báo cáo' | 'Báo cáo / Đồ án' | string;
  updatedBy?: string;
  updateNotes?: string;
  isCustomFromSheet?: boolean;
  resourcesCount?: {
    slides: number;
    exams: number;
    labs: number;
    projects: number;
  };
}

export interface SheetCourseRecord {
  stt?: number | string;
  code: string;
  name: string;
  category?: string;
  driveUrl: string;
  lastUpdated: string;
  updatedBy: string;
  notes: string;
  creditsRaw?: string;
  prerequisitesRaw?: string;
  gradingWeightsRaw?: string;
  descriptionRaw?: string;
  syllabusRaw?: string;
  practicalOutlineRaw?: string;
  examFormatRaw?: string;
  isRecent?: boolean;
}

export interface MasterCourseSection {
  id?: string;
  stt?: number;
  courseCode: string;
  courseName: string;
  classCode: string;
  classType?: 'LT' | 'TH' | string; // "LT" (Lý thuyết) | "TH" (Thực hành)
  group?: string; // "Nhóm 1", "Nhóm 2", "01", etc.
  credits?: number;
  lecturer: string;
  dayOfWeek: number; // 2: Thứ 2, 3: Thứ 3, ..., 7: Thứ 7, 8: Chủ Nhật
  startPeriod: number; // 1 - 12
  endPeriod: number;   // 1 - 12
  room: string;
  weeks?: string;
  color?: string;
  sourceFile?: string; // Tên tệp nguồn đã tải lên (ví dụ: "tkb_hk2.xlsx")
}

export interface ScheduleConstraints {
  avoidSaturday: boolean;
  avoidSunday: boolean;
  avoidEarlyMorning: boolean; // Tránh tiết 1 (7:00)
  avoidLateAfternoon: boolean; // Tránh tiết 10-12
  freeFridayAfternoon: boolean; // Trống chiều Thứ 6
  compactDays: boolean; // Gom lịch học vào ít ngày nhất
  preferredPeriod: 'all' | 'morning' | 'afternoon'; // Ưu tiên ca học
  preferredLecturers?: { [courseCode: string]: string };
}

export interface BatchFileItem {
  id: string;
  name: string;
  size: number;
  type: 'excel' | 'pdf' | 'image' | 'csv' | 'text' | 'other';
  status: 'queued' | 'processing' | 'done' | 'error' | 'cancelled';
  progress: number; // 0 - 100
  message: string;
  extractedCount: number;
  error?: string;
  previewUrl?: string;
  file?: File;
}

export interface TimetableSolution {
  id: string;
  title: string;
  description: string;
  score: number;
  clashCount: number;
  totalDays: number;
  activeDays: number[];
  sections: MasterCourseSection[];
  tags: string[];
}

export interface ScheduleItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  dayOfWeek: number; // 2 (Thứ 2) -> 7 (Thứ 7), 8 (Chủ nhật)
  startPeriod: number; // 1 -> 12
  endPeriod: number; // 1 -> 12
  room: string;
  lecturer: string;
  classGroup?: string;
  isLab?: boolean;
  color?: string;
}

export interface DryRunStep {
  step: number;
  desc: string;
  variables: string;
  highlightLines?: number[];
}

export interface CodeAnalysisResult {
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal?: boolean;
  spaceType?: string; // e.g. "Tại chỗ (In-place)"
  dryRunSteps: DryRunStep[];
  warnings: string[];
  optimizations: string[];
  edgeCases: string[];
  summary?: string;
}

export interface Contributor {
  id: string;
  name: string;
  studentId: string; // Mã số sinh viên (MSSV) - Khóa định danh chính cho lưu trữ và tích lũy BXH
  className?: string; // Lớp sinh viên (ví dụ: 48.01.CNTT.A, K48 CNTT)
  email?: string; // Email (không bắt buộc)
  entriesCount: number; // Lượt gửi
  filesCount: number; // Số Files
  rank: number;
  avatarUrl?: string;
  badgeTitle?: string;
  specialty?: string;
  recentUpload?: string;
  semesterFilesCount?: number;
  monthlyFilesCount?: number;
  weeklyFilesCount?: number;
  verified?: boolean;
  createdAt?: string;
  lastUpdated?: string;
}

export type AnnouncementType = 'important' | 'update' | 'warning' | 'event';

export interface Announcement {
  id: string;
  title: string;
  type: AnnouncementType;
  typeLabel: string;
  date: string;
  isoDate: string;
  summary: string;
  content?: string;
  linkText?: string;
  linkUrl?: string;
  driveFolderLink?: string;
  downtimeNotice?: string;
  author?: string;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}
