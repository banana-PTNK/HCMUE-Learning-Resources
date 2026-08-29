import React, { useState, useMemo } from 'react';
import { MasterCourseSection } from '../types';
import { PERIOD_TIME_MAP, DAY_NAMES } from '../utils/icsExport';
import { hasTimeClash, isVLESection, solveTimetableCSP } from '../utils/schedulerCsp';
import { extractBaseCourseCode } from '../utils/scheduleParser';
import { AlertTriangle, Clock, MapPin, User, ArrowLeftRight, Trash2, CheckCircle2, BookOpen, Layers, ShieldAlert, Sparkles, X, Globe, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface InteractiveTimetableMatrixProps {
  activeSections: MasterCourseSection[];
  masterCatalog: MasterCourseSection[];
  onUpdateSections: (newSections: MasterCourseSection[]) => void;
  onSelectCourseToChange?: (courseCode: string) => void;
}

export interface SubjectTheme {
  id: string;
  name: string;
  dotColor: string;
  cardBgLight: string;
  cardBgDark: string;
  borderLeftClasses: string;
  titleTextLight: string;
  titleTextDark: string;
  codeTextClasses: string;
  detailsTextLight: string;
  detailsTextDark: string;
  badgeBgClasses: string;
}

export interface DetailedClash {
  id: string;
  sec1: MasterCourseSection;
  sec2: MasterCourseSection;
  dayOfWeek: number;
  overlapStart: number;
  overlapEnd: number;
  overlapPeriodsStr: string;
}

// Full Tinted Pastel Themes (Light) & Modern Tech Tint (Dark)
export const DISTINCT_SUBJECT_PALETTES: SubjectTheme[] = [
  {
    id: 'lavender',
    name: 'Toán & Rời rạc',
    dotColor: 'bg-purple-500',
    cardBgLight: 'bg-[#F3E8FF] hover:bg-[#EDE9FE] border-[#C084FC] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#2E1065]/60 dark:hover:bg-[#3B0764]/80 dark:border-purple-500/50 dark:shadow-lg dark:shadow-purple-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#7E22CE] dark:border-l-purple-400',
    titleTextLight: 'text-[#4C1D95]',
    titleTextDark: 'dark:text-purple-100',
    codeTextClasses: 'text-[#6B21A8] dark:text-purple-300 font-semibold',
    detailsTextLight: 'text-[#581C87]',
    detailsTextDark: 'dark:text-purple-200/90',
    badgeBgClasses: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
  },
  {
    id: 'mint',
    name: 'Giải thuật & Cấu trúc DL',
    dotColor: 'bg-emerald-500',
    cardBgLight: 'bg-[#ECFDF5] hover:bg-[#D1FAE5] border-[#6EE7B7] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#064E3B]/60 dark:hover:bg-[#065F46]/80 dark:border-emerald-500/50 dark:shadow-lg dark:shadow-emerald-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#047857] dark:border-l-emerald-400',
    titleTextLight: 'text-[#064E3B]',
    titleTextDark: 'dark:text-emerald-100',
    codeTextClasses: 'text-[#065F46] dark:text-emerald-300 font-semibold',
    detailsTextLight: 'text-[#047857]',
    detailsTextDark: 'dark:text-emerald-200/90',
    badgeBgClasses: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  {
    id: 'peach',
    name: 'Lập trình & Hướng đối tượng',
    dotColor: 'bg-orange-500',
    cardBgLight: 'bg-[#FFEDD5] hover:bg-[#FED7AA] border-[#FDBA74] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#7C2D12]/50 dark:hover:bg-[#9A3412]/70 dark:border-orange-500/50 dark:shadow-lg dark:shadow-orange-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#C2410C] dark:border-l-orange-400',
    titleTextLight: 'text-[#7C2D12]',
    titleTextDark: 'dark:text-orange-100',
    codeTextClasses: 'text-[#9A3412] dark:text-orange-300 font-semibold',
    detailsTextLight: 'text-[#C2410C]',
    detailsTextDark: 'dark:text-orange-200/90',
    badgeBgClasses: 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
  },
  {
    id: 'sky',
    name: 'Cơ sở ngành & Mạng',
    dotColor: 'bg-sky-500',
    cardBgLight: 'bg-[#E0F2FE] hover:bg-[#BAE6FD] border-[#7DD3FC] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#0C4A6E]/60 dark:hover:bg-[#075985]/80 dark:border-sky-500/50 dark:shadow-lg dark:shadow-sky-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#0369A1] dark:border-l-sky-400',
    titleTextLight: 'text-[#0C4A6E]',
    titleTextDark: 'dark:text-sky-100',
    codeTextClasses: 'text-[#075985] dark:text-sky-300 font-semibold',
    detailsTextLight: 'text-[#0369A1]',
    detailsTextDark: 'dark:text-sky-200/90',
    badgeBgClasses: 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
  },
  {
    id: 'indigo',
    name: 'Trí tuệ nhân tạo & CSDL',
    dotColor: 'bg-indigo-500',
    cardBgLight: 'bg-[#EEF2FF] hover:bg-[#E0E7FF] border-[#A5B4FC] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#312E81]/60 dark:hover:bg-[#3730A3]/80 dark:border-indigo-500/50 dark:shadow-lg dark:shadow-indigo-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#4338CA] dark:border-l-indigo-400',
    titleTextLight: 'text-[#312E81]',
    titleTextDark: 'dark:text-indigo-100',
    codeTextClasses: 'text-[#3730A3] dark:text-indigo-300 font-semibold',
    detailsTextLight: 'text-[#4338CA]',
    detailsTextDark: 'dark:text-indigo-200/90',
    badgeBgClasses: 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
  },
  {
    id: 'teal',
    name: 'Web & Công nghệ PM',
    dotColor: 'bg-teal-500',
    cardBgLight: 'bg-[#CCFBF1] hover:bg-[#99F6E4] border-[#5EEAD4] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#134E4A]/60 dark:hover:bg-[#115E59]/80 dark:border-teal-500/50 dark:shadow-lg dark:shadow-teal-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#0F766E] dark:border-l-teal-400',
    titleTextLight: 'text-[#134E4A]',
    titleTextDark: 'dark:text-teal-100',
    codeTextClasses: 'text-[#115E59] dark:text-teal-300 font-semibold',
    detailsTextLight: 'text-[#0F766E]',
    detailsTextDark: 'dark:text-teal-200/90',
    badgeBgClasses: 'bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60',
  },
  {
    id: 'rose',
    name: 'Đại cương & Ngoại ngữ',
    dotColor: 'bg-rose-500',
    cardBgLight: 'bg-[#FFE4E6] hover:bg-[#FECDD3] border-[#FDA4AF] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#881337]/50 dark:hover:bg-[#9F1239]/70 dark:border-rose-500/50 dark:shadow-lg dark:shadow-rose-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#BE123C] dark:border-l-rose-400',
    titleTextLight: 'text-[#881337]',
    titleTextDark: 'dark:text-rose-100',
    codeTextClasses: 'text-[#9F1239] dark:text-rose-300 font-semibold',
    detailsTextLight: 'text-[#BE123C]',
    detailsTextDark: 'dark:text-rose-200/90',
    badgeBgClasses: 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  },
  {
    id: 'amber',
    name: 'Chuyên đề Ứng dụng',
    dotColor: 'bg-amber-500',
    cardBgLight: 'bg-[#FEF3C7] hover:bg-[#FDE68A] border-[#FCD34D] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#78350F]/50 dark:hover:bg-[#92400E]/70 dark:border-amber-500/50 dark:shadow-lg dark:shadow-amber-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#B45309] dark:border-l-amber-400',
    titleTextLight: 'text-[#78350F]',
    titleTextDark: 'dark:text-amber-100',
    codeTextClasses: 'text-[#92400E] dark:text-amber-300 font-semibold',
    detailsTextLight: 'text-[#B45309]',
    detailsTextDark: 'dark:text-amber-200/90',
    badgeBgClasses: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  },
  {
    id: 'blue',
    name: 'Khoa học Máy tính',
    dotColor: 'bg-blue-500',
    cardBgLight: 'bg-[#DBEAFE] hover:bg-[#BFDBFE] border-[#93C5FD] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#1E3A8A]/60 dark:hover:bg-[#1E40AF]/80 dark:border-blue-500/50 dark:shadow-lg dark:shadow-blue-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#1D4ED8] dark:border-l-blue-400',
    titleTextLight: 'text-[#1E3A8A]',
    titleTextDark: 'dark:text-blue-100',
    codeTextClasses: 'text-[#1E40AF] dark:text-blue-300 font-semibold',
    detailsTextLight: 'text-[#1D4ED8]',
    detailsTextDark: 'dark:text-blue-200/90',
    badgeBgClasses: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  },
  {
    id: 'fuchsia',
    name: 'Kỹ năng & Tự chọn',
    dotColor: 'bg-fuchsia-500',
    cardBgLight: 'bg-[#FAE8FF] hover:bg-[#F5D0FE] border-[#F0ABFC] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#701A75]/50 dark:hover:bg-[#86198F]/70 dark:border-fuchsia-500/50 dark:shadow-lg dark:shadow-fuchsia-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#A21CAF] dark:border-l-fuchsia-400',
    titleTextLight: 'text-[#701A75]',
    titleTextDark: 'dark:text-fuchsia-100',
    codeTextClasses: 'text-[#86198F] dark:text-fuchsia-300 font-semibold',
    detailsTextLight: 'text-[#A21CAF]',
    detailsTextDark: 'dark:text-fuchsia-200/90',
    badgeBgClasses: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60',
  },
  {
    id: 'lime',
    name: 'Kiến tập & Dự án',
    dotColor: 'bg-lime-500',
    cardBgLight: 'bg-[#ECFCCB] hover:bg-[#D9F99D] border-[#BEF264] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#365314]/50 dark:hover:bg-[#3F6212]/70 dark:border-lime-500/50 dark:shadow-lg dark:shadow-lime-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#4D7C0F] dark:border-l-lime-400',
    titleTextLight: 'text-[#365314]',
    titleTextDark: 'dark:text-lime-100',
    codeTextClasses: 'text-[#3F6212] dark:text-lime-300 font-semibold',
    detailsTextLight: 'text-[#4D7C0F]',
    detailsTextDark: 'dark:text-lime-200/90',
    badgeBgClasses: 'bg-lime-100 text-lime-800 border border-lime-300 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800/60',
  },
  {
    id: 'cyan',
    name: 'Đồ án & Thực tập',
    dotColor: 'bg-cyan-500',
    cardBgLight: 'bg-[#CFFAFE] hover:bg-[#A5F3FC] border-[#67E8F9] shadow-sm hover:shadow-md',
    cardBgDark: 'dark:bg-[#164E63]/60 dark:hover:bg-[#155E75]/80 dark:border-cyan-500/50 dark:shadow-lg dark:shadow-cyan-950/40',
    borderLeftClasses: 'border-l-[5px] border-l-[#0E7490] dark:border-l-cyan-400',
    titleTextLight: 'text-[#164E63]',
    titleTextDark: 'dark:text-cyan-100',
    codeTextClasses: 'text-[#155E75] dark:text-cyan-300 font-semibold',
    detailsTextLight: 'text-[#0E7490]',
    detailsTextDark: 'dark:text-cyan-200/90',
    badgeBgClasses: 'bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60',
  },
];

// Smart category-based theme finder with fallback
const getSubjectThemeByCategory = (courseName: string, courseCode: string, fallbackIdx: number): SubjectTheme => {
  const norm = (courseName + ' ' + courseCode).toLowerCase();
  
  if (
    norm.includes('toán') ||
    norm.includes('rời rạc') ||
    norm.includes('vi tích phân') ||
    norm.includes('đại số') ||
    norm.includes('xác suất') ||
    norm.includes('thống kê') ||
    norm.includes('math') ||
    norm.includes('discrete') ||
    norm.includes('calculus') ||
    norm.includes('algebra') ||
    norm.includes('probability') ||
    norm.includes('statistics')
  ) {
    return DISTINCT_SUBJECT_PALETTES[0]; // Indigo (Math)
  }
  if (
    norm.includes('giải thuật') ||
    norm.includes('cấu trúc dữ liệu') ||
    norm.includes('thuật toán') ||
    norm.includes('dsa') ||
    norm.includes('algo') ||
    norm.includes('data structure') ||
    norm.includes('ctdl')
  ) {
    return DISTINCT_SUBJECT_PALETTES[1]; // Emerald (Algorithms)
  }
  if (
    norm.includes('lập trình') ||
    norm.includes('hướng đối tượng') ||
    norm.includes('oop') ||
    norm.includes('python') ||
    norm.includes('java') ||
    norm.includes('c++') ||
    norm.includes('c#') ||
    norm.includes('prog') ||
    norm.includes('cơ sở lập trình') ||
    norm.includes('cslp') ||
    norm.includes('kỹ thuật lập trình') ||
    norm.includes('kĩ thuật lập trình') ||
    norm.includes('ktlt')
  ) {
    return DISTINCT_SUBJECT_PALETTES[2]; // Amber (Programming)
  }
  if (
    norm.includes('hệ điều hành') ||
    norm.includes('mạng') ||
    norm.includes('kiến trúc') ||
    norm.includes('vi xử lý') ||
    norm.includes('an toàn') ||
    norm.includes('bảo mật') ||
    norm.includes('linux') ||
    norm.includes('hệ thống') ||
    norm.includes('os') ||
    norm.includes('network') ||
    norm.includes('security') ||
    norm.includes('atbm') ||
    norm.includes('ktmt') ||
    norm.includes('hdh') ||
    norm.includes('mmt')
  ) {
    return DISTINCT_SUBJECT_PALETTES[3]; // Cyan (Systems)
  }
  if (
    norm.includes('trí tuệ nhân tạo') ||
    norm.includes('ai') ||
    norm.includes('dữ liệu') ||
    norm.includes('database') ||
    norm.includes('cơ sở dữ liệu') ||
    norm.includes('machine learning') ||
    norm.includes('db')
  ) {
    return DISTINCT_SUBJECT_PALETTES[4]; // Purple (AI & Database)
  }
  if (
    norm.includes('web') ||
    norm.includes('công nghệ phần mềm') ||
    norm.includes('phần mềm') ||
    norm.includes('mobile') ||
    norm.includes('frontend') ||
    norm.includes('backend') ||
    norm.includes('se')
  ) {
    return DISTINCT_SUBJECT_PALETTES[5]; // Teal (Software / Web)
  }
  if (
    norm.includes('triết') ||
    norm.includes('chính trị') ||
    norm.includes('pháp luật') ||
    norm.includes('thể chất') ||
    norm.includes('ngoại ngữ') ||
    norm.includes('tiếng anh') ||
    norm.includes('kỹ năng')
  ) {
    return DISTINCT_SUBJECT_PALETTES[6]; // Rose (General)
  }

  return DISTINCT_SUBJECT_PALETTES[fallbackIdx % DISTINCT_SUBJECT_PALETTES.length];
};

// Fallback deterministic hash to assign palette
export const getDeterministicSubjectTheme = (key: string): SubjectTheme => {
  let hash = 0;
  const str = key || 'DEFAULT';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DISTINCT_SUBJECT_PALETTES.length;
  return DISTINCT_SUBJECT_PALETTES[idx];
};

// Format lecturer email based on university standard
const generateLecturerEmail = (lecturerName: string): string => {
  if (!lecturerName || lecturerName === 'Khoa CNTT' || lecturerName === 'Chưa phân công') {
    return 'fit@hcmue.edu.vn';
  }
  const clean = lecturerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'fit@hcmue.edu.vn';
  if (words.length === 1) return `${words[0]}@hcmue.edu.vn`;

  const initials = words.slice(0, -1).map((w) => w[0]).join('');
  const lastName = words[words.length - 1];
  return `${initials}${lastName}@hcmue.edu.vn`;
};

// Format period start time
const getPeriodStartTime = (period: number): string => {
  const startMap: Record<number, string> = {
    1: '06:30',
    2: '07:20',
    3: '08:10',
    4: '09:10',
    5: '10:00',
    6: '10:50',
    7: '12:30',
    8: '13:20',
    9: '14:10',
    10: '15:10',
    11: '16:00',
    12: '16:50',
  };
  return startMap[period] || '';
};

// Format period time range according to HCMUE official period timetable
const getPeriodTimeRange = (start: number, end: number): string => {
  const startMap: Record<number, string> = {
    1: '06g30',
    2: '07g20',
    3: '08g10',
    4: '09g10',
    5: '10g00',
    6: '10g50',
    7: '12g30',
    8: '13g20',
    9: '14g10',
    10: '15g10',
    11: '16g00',
    12: '16g50',
  };
  const endMap: Record<number, string> = {
    1: '07g20',
    2: '08g10',
    3: '09g00',
    4: '10g00',
    5: '10g50',
    6: '11g40',
    7: '13g20',
    8: '14g10',
    9: '15g00',
    10: '16g00',
    11: '16g50',
    12: '17g40',
  };
  const s = startMap[start] || `${start}h00`;
  const e = endMap[end] || `${end}h00`;
  return `${s}-${e}`;
};

const getSessionLabel = (start: number): string => {
  return start <= 6 ? 'Buổi sáng' : 'Buổi chiều';
};

export const InteractiveTimetableMatrix: React.FC<InteractiveTimetableMatrixProps> = ({
  activeSections,
  masterCatalog,
  onUpdateSections
}) => {
  const [selectedSectionForSwitch, setSelectedSectionForSwitch] = useState<MasterCourseSection | null>(null);
  const [showSunday, setShowSunday] = useState(false);

  const { toast } = useToast();

  // Check if Sunday has any classes
  const hasSundayClasses = activeSections.some((s) => s.dayOfWeek === 8);
  const isSundayVisible = showSunday || hasSundayClasses;

  const days = [2, 3, 4, 5, 6, 7];
  if (isSundayVisible) days.push(8);

  const periods = Array.from({ length: 12 }, (_, i) => i + 1);

  // Detect clashes for each section with rich clash details
  const { clashingSectionIds, detectedClashes } = useMemo(() => {
    const ids = new Set<string>();
    const clashes: DetailedClash[] = [];
    const pairKeys = new Set<string>();

    for (let i = 0; i < activeSections.length; i++) {
      for (let j = i + 1; j < activeSections.length; j++) {
        const s1 = activeSections[i];
        const s2 = activeSections[j];
        if (hasTimeClash(s1, s2)) {
          ids.add(s1.classCode + '-' + s1.dayOfWeek);
          ids.add(s2.classCode + '-' + s2.dayOfWeek);

          const key = [s1.classCode, s2.classCode].sort().join('_') + `_${s1.dayOfWeek}`;
          if (!pairKeys.has(key)) {
            pairKeys.add(key);
            const overlapStart = Math.max(s1.startPeriod, s2.startPeriod);
            const overlapEnd = Math.min(s1.endPeriod, s2.endPeriod);
            clashes.push({
              id: key,
              sec1: s1,
              sec2: s2,
              dayOfWeek: s1.dayOfWeek,
              overlapStart,
              overlapEnd,
              overlapPeriodsStr: overlapStart === overlapEnd ? `Tiết ${overlapStart}` : `Tiết ${overlapStart}-${overlapEnd}`
            });
          }
        }
      }
    }
    return { clashingSectionIds: ids, detectedClashes: clashes };
  }, [activeSections]);

  // DYNAMIC PER-SCHEDULE COURSE COLOR MAPPING WITH BORDER-L-4 ACCENTS
  // Guarantees that every unique course in the active timetable gets a distinct, category-appropriate color theme
  const { courseColorMap, uniqueCoursesList } = useMemo(() => {
    const courses: { key: string; name: string; code: string }[] = [];
    activeSections.forEach((s) => {
      const key = s.courseCode || s.courseName || s.classCode;
      if (!courses.some((c) => c.key === key)) {
        courses.push({
          key,
          name: s.courseName,
          code: s.courseCode || s.classCode.split('.')[0] || 'HP',
        });
      }
    });

    const map = new Map<string, SubjectTheme>();
    const usedThemeIds = new Set<string>();

    courses.forEach((c, idx) => {
      let theme = getSubjectThemeByCategory(c.name, c.code, idx);
      // If already assigned to another course in this schedule, pick next unused palette to avoid duplicate border colors
      if (usedThemeIds.has(theme.id)) {
        const unused = DISTINCT_SUBJECT_PALETTES.find((p) => !usedThemeIds.has(p.id));
        if (unused) theme = unused;
      }
      usedThemeIds.add(theme.id);
      map.set(c.key, theme);
    });

    return { courseColorMap: map, uniqueCoursesList: courses };
  }, [activeSections]);

  const getSectionTheme = (sec: MasterCourseSection): SubjectTheme => {
    const key = sec.courseCode || sec.courseName || sec.classCode;
    return courseColorMap.get(key) || getDeterministicSubjectTheme(key);
  };

  // Group alternative sections by classCode for multi-session classes
  const alternativeClassGroups = useMemo(() => {
    if (!selectedSectionForSwitch) return [];

    const matchedSections = masterCatalog.filter(
      (s) =>
        s.courseCode === selectedSectionForSwitch.courseCode &&
        s.classType === selectedSectionForSwitch.classType &&
        s.classCode !== selectedSectionForSwitch.classCode
    );

    const groupMap = new Map<string, MasterCourseSection[]>();
    for (const sec of matchedSections) {
      const key = sec.classCode || `${sec.courseCode}_${sec.group}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(sec);
    }

    return Array.from(groupMap.values());
  }, [selectedSectionForSwitch, masterCatalog]);

  // Helper to match if two sections belong to the same course
  const isSameCourseSection = (s1: MasterCourseSection, s2: MasterCourseSection): boolean => {
    const code1 = (s1.courseCode || '').trim().toLowerCase();
    const code2 = (s2.courseCode || '').trim().toLowerCase();
    if (code1 && code2 && code1 === code2) return true;

    const name1 = (s1.courseName || '').trim().toLowerCase();
    const name2 = (s2.courseName || '').trim().toLowerCase();
    if (name1 && name2 && name1 === name2) return true;

    const prefix1 = (s1.classCode && s1.classCode.length > 2 ? s1.classCode.slice(0, -2) : s1.classCode || '').trim().toLowerCase();
    const prefix2 = (s2.classCode && s2.classCode.length > 2 ? s2.classCode.slice(0, -2) : s2.classCode || '').trim().toLowerCase();
    if (prefix1 && prefix2 && prefix1 === prefix2) return true;

    return false;
  };

  // Handle switching a class (and all its weekly sessions) to an alternative class
  const handleSwitchClassGroup = (oldSection: MasterCourseSection, newSectionList: MasterCourseSection[]) => {
    const courseColor = oldSection.color || '#3b82f6';
    const filtered = activeSections.filter(
      (s) => !(isSameCourseSection(s, oldSection) && (s.classCode === oldSection.classCode || s.classType === oldSection.classType))
    );

    const formattedNewSections = newSectionList.map((s) => ({
      ...s,
      color: courseColor,
      id: s.id || `sec-${s.classCode}-${s.dayOfWeek}-${s.startPeriod}`
    }));

    const nextSchedule = [...filtered, ...formattedNewSections];

    // Check for any clashes introduced by the new selection
    const clashesWithNew: { newSec: MasterCourseSection; existingSec: MasterCourseSection }[] = [];
    for (const nSec of formattedNewSections) {
      for (const exSec of filtered) {
        if (hasTimeClash(nSec, exSec)) {
          clashesWithNew.push({ newSec: nSec, existingSec: exSec });
        }
      }
    }

    if (clashesWithNew.length > 0) {
      const first = clashesWithNew[0];
      toast.warning(
        `⚠️ CẢNH BÁO TRÙNG LỊCH: Lớp ${first.newSec.classCode} (${first.newSec.courseName}) bị trùng giờ ${DAY_NAMES[first.newSec.dayOfWeek]} (Tiết ${first.newSec.startPeriod}-${first.newSec.endPeriod}) với môn ${first.existingSec.courseName} (${first.existingSec.classCode})!`
      );
    } else {
      toast.success(`Đã đổi sang lớp ${formattedNewSections[0]?.classCode || 'mới'} thành công! (Không bị trùng lịch)`);
    }

    onUpdateSections(nextSchedule);
    setSelectedSectionForSwitch(null);
  };

  // Handle removing all sessions/classes belonging to this course from the active timetable
  const handleRemoveClassGroup = (sectionToRemove: MasterCourseSection) => {
    const updated = activeSections.filter((s) => !isSameCourseSection(s, sectionToRemove));
    onUpdateSections(updated);
    toast.info(`Đã xóa toàn bộ các buổi học của môn ${sectionToRemove.courseName} khỏi TKB.`);
    setSelectedSectionForSwitch(null);
  };

  // Automatically resolve clashes using CSP solver
  const handleAutoResolveClashes = () => {
    const uniqueCourseCodes: string[] = Array.from(
      new Set(
        activeSections
          .map((s) => s.courseCode || extractBaseCourseCode(s.classCode))
          .filter((c): c is string => Boolean(c))
      )
    );

    if (uniqueCourseCodes.length === 0 || masterCatalog.length === 0) {
      toast.info('Không có đủ dữ liệu môn học để tự động xếp lại.');
      return;
    }

    const solutions = solveTimetableCSP(masterCatalog, uniqueCourseCodes, { preferredShift: 'all' }, 5);
    if (solutions.length > 0 && solutions[0].clashCount === 0) {
      const best = solutions[0].sections.filter((s) => !isVLESection(s));
      onUpdateSections(best);
      toast.success('✨ Đã tự động đổi lớp và xếp lại Thời khóa biểu tối ưu (Hoàn toàn không trùng lịch)!');
    } else {
      toast.warning('Không tìm thấy phương án 100% không trùng lịch cho tổ hợp môn này. Bạn vui lòng đổi ca học thủ công.');
    }
  };

  const vleSections = useMemo(() => {
    return activeSections.filter((sec) => isVLESection(sec));
  }, [activeSections]);

  if (activeSections.length === 0) {
    return (
      <div id="timetable-matrix" className="w-full p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
          <Calendar className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa có Thời khóa biểu
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Vui lòng tải lên tệp thời khóa biểu hoặc chọn môn học ở các bước trước để hiển thị lịch học.
        </p>
      </div>
    );
  }

  return (
    <div id="timetable-matrix" className="w-full space-y-4">
      {/* Live Conflict Warning Alert Banner when any clashes exist */}
      {detectedClashes.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-700/80 shadow-lg shadow-rose-500/10 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/70 border border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-rose-900 dark:text-rose-100 flex items-center gap-2">
                  <span>CẢNH BÁO: Phát hiện {detectedClashes.length} xung đột trùng lịch học!</span>
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Thời khóa biểu đang có các môn học bị trùng khung giờ. Hãy bấm vào môn bên dưới để đổi ca, hoặc dùng tính năng Tự động xếp lịch bên phải.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoResolveClashes}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
              title="Tự động tìm phương án phân bổ Sáng & Chiều không trùng lịch"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Tự động gỡ trùng lịch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {detectedClashes.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 shadow-xs flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black font-mono">
                    <span>{DAY_NAMES[c.dayOfWeek]}</span>
                    <span>•</span>
                    <span>{c.overlapPeriodsStr}</span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                    <span className="font-bold text-slate-900 dark:text-white">{c.sec1.courseName}</span>{' '}
                    <span className="font-mono text-[11px] text-slate-500">({c.sec1.classCode})</span>
                    <div className="text-rose-600 dark:text-rose-400 font-bold my-0.5">⚡ Trùng lịch với:</div>
                    <span className="font-bold text-slate-900 dark:text-white">{c.sec2.courseName}</span>{' '}
                    <span className="font-mono text-[11px] text-slate-500">({c.sec2.classCode})</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedSectionForSwitch(c.sec1)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 font-semibold cursor-pointer text-[11px] transition-colors"
                    title="Đổi ca học cho môn thứ nhất"
                  >
                    Đổi ca {c.sec1.courseCode || 'môn 1'}
                  </button>
                  <button
                    onClick={() => setSelectedSectionForSwitch(c.sec2)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-[11px] transition-colors"
                    title="Đổi ca học cho môn thứ hai"
                  >
                    Đổi ca {c.sec2.courseCode || 'môn 2'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsive Scroll Viewport Wrapper for browser UI - Floating Island Frame */}
      <div className="w-full overflow-x-auto rounded-2xl border-2 border-slate-300 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B0F19] shadow-xl ring-1 ring-slate-900/5">
        {/* Main Grid Timetable Matrix (Exportable Canvas Wrapper) */}
        <div
          id="timetable-render-canvas"
          className="w-full min-w-[1120px] p-4 sm:p-6 space-y-4 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors"
        >
          {/* Visual Header in Image/PDF export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-300 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 dark:from-blue-600 dark:to-indigo-800 text-white flex items-center justify-center font-black text-base font-mono shrink-0 shadow-md ring-2 ring-blue-500/20">
                HCMUE
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide">
                  TRƯỜNG ĐẠI HỌC SƯ PHẠM TP. HỒ CHÍ MINH
                </h3>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-sky-400 font-black">
                  Khoa Công nghệ Thông tin — Thời khóa biểu học phần sinh viên
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono">
              <div>Tổng số: <span className="text-blue-700 dark:text-sky-400 font-black">{activeSections.length} buổi học/tuần</span></div>
            </div>
          </div>

          <table className="w-full border-collapse text-left border-2 border-slate-400 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            {/* Header row: Vibrant Indigo/Royal Blue gradient with crisp contrast */}
            <thead className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 dark:from-[#0F172A] dark:via-[#111827] dark:to-[#0F172A] text-white font-extrabold border-b-2 border-slate-400 dark:border-slate-700 shadow-md">
              <tr>
                <th className="py-3.5 px-3 w-16 sm:w-20 text-center font-black text-xs sm:text-sm uppercase tracking-wider border-r-2 border-slate-400 dark:border-slate-700 select-none text-white bg-blue-950/80 dark:bg-[#111827]">
                  Tiết
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="py-3.5 px-2 text-center border-r border-slate-400/80 dark:border-slate-700/80 last:border-r-0 select-none text-white bg-transparent"
                  >
                    <div className="font-black text-xs sm:text-sm uppercase tracking-wider drop-shadow-xs">
                      {day === 8 ? 'Chủ Nhật' : `Thứ ${day}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {periods.map((period) => {
                const startTime = getPeriodStartTime(period);
                const isLunchBreakAfter = period === 6; // Insert clean lunch break row between Period 6 & 7 (11g40 - 12g30)

                return (
                  <React.Fragment key={period}>
                    <tr className="border-b border-slate-300 dark:border-slate-700/80 last:border-b-0">
                      {/* Period Column: Frosted Mist Slate (#E2E8F0 / #F1F5F9), bold black text */}
                      <td className="p-2 text-center bg-[#E2E8F0] dark:bg-[#111827] border-r-2 border-slate-400 dark:border-slate-700 select-none w-16 sm:w-20">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-slate-900 dark:text-slate-100 font-mono font-black text-base sm:text-lg">
                            {period}
                          </div>
                        </div>
                      </td>

                      {/* Day Columns */}
                      {days.map((day) => {
                        // Check if a non-VLE section is active in this (day, period)
                        const activeInCell = activeSections.filter(
                          (sec) => !isVLESection(sec) && sec.dayOfWeek === day && sec.startPeriod <= period && sec.endPeriod >= period
                        );

                        // If a multi-period section started on an earlier period, skip rendering (handled by rowSpan)
                        const isCoveredByPreviousRow = activeInCell.some((sec) => sec.startPeriod < period);
                        if (isCoveredByPreviousRow) {
                          return null;
                        }

                        // Sections starting on THIS period
                        const startingSections = activeInCell.filter((sec) => sec.startPeriod === period);

                        if (startingSections.length > 0) {
                          const span = Math.max(...startingSections.map((sec) => sec.endPeriod - sec.startPeriod + 1));

                          return (
                            <td
                              key={day}
                              rowSpan={span}
                              className="p-2 border-r border-slate-300 dark:border-slate-700/80 align-top bg-[#F8FAFC] dark:bg-[#0B0F19]"
                            >
                              <div className="space-y-2 h-full flex flex-col justify-start">
                                {startingSections.map((sec, secIdx) => {
                                  const secClash = clashingSectionIds.has(sec.classCode + '-' + sec.dayOfWeek);
                                  const timeRangeStr = getPeriodTimeRange(sec.startPeriod, sec.endPeriod);
                                  const sessionStr = getSessionLabel(sec.startPeriod);
                                  const roomDisplay = sec.room ? (sec.room.includes('ADV') ? sec.room : `${sec.room} (ADV)`) : 'Chưa xếp phòng';
                                  
                                  // Get distinct tinted pastel theme
                                  const theme = getSectionTheme(sec);

                                  return (
                                    <div
                                      key={sec.id || `${sec.classCode}-${secIdx}`}
                                      onClick={() => setSelectedSectionForSwitch(sec)}
                                      className={`group relative p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer select-none hover:shadow-lg flex flex-col items-center justify-center text-center ${
                                        secClash
                                          ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/50 border-l-[6px] border-l-amber-600 shadow-md shadow-amber-500/10'
                                          : `${theme.cardBgLight} ${theme.cardBgDark} ${theme.borderLeftClasses}`
                                      }`}
                                    >
                                      {/* Tên môn học: Tinted high contrast title text centered */}
                                      <div className={`w-full text-center font-black text-base md:text-lg leading-snug tracking-normal break-words hyphens-none ${theme.titleTextLight} ${theme.titleTextDark}`}>
                                        {sec.courseName}
                                        {/* Mã môn */}
                                        <span className={`block text-center font-mono text-sm font-bold mt-1 ${theme.codeTextClasses}`}>
                                          ({sec.courseCode || extractBaseCourseCode(sec.classCode)})
                                        </span>
                                      </div>

                                      {/* Chi tiết học phần: Căn giữa toàn bộ */}
                                      <div className="w-full mt-2.5 space-y-1 leading-tight text-center flex flex-col items-center justify-center">
                                        {/* Buổi & Giờ học */}
                                        <div className={`text-xs sm:text-sm font-semibold opacity-90 text-center ${theme.detailsTextLight} ${theme.detailsTextDark}`}>
                                          {sessionStr} • {timeRangeStr}
                                        </div>
                                        {/* Nhóm & Lớp học phần */}
                                        <div className={`text-xs sm:text-sm font-semibold opacity-90 text-center ${theme.detailsTextLight} ${theme.detailsTextDark}`}>
                                          Nhóm: {sec.group || '01'} • <span className="font-mono font-bold">{sec.classCode}</span>
                                        </div>
                                        
                                        {/* Phòng học & Giảng viên: Chữ đậm, dễ nhìn */}
                                        <div className={`text-sm sm:text-base font-black mt-1 text-center ${theme.detailsTextLight} ${theme.detailsTextDark}`}>
                                          Phòng: {roomDisplay}
                                        </div>
                                        <div className={`text-sm sm:text-base font-black text-center ${theme.detailsTextLight} ${theme.detailsTextDark}`}>
                                          GV: {sec.lecturer || 'Khoa CNTT'}
                                        </div>

                                        {/* Clashing warning indicator badge directly on card */}
                                        {secClash && (
                                          <div className="w-full mt-2.5 py-1 px-2 rounded-lg bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm animate-pulse">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">
                                              Trùng giờ với môn khác (Tiết {sec.startPeriod}-{sec.endPeriod})
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Interactive change hint icon on hover */}
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/85 dark:bg-slate-800/90 text-white rounded-md p-1 shadow-sm">
                                        <ArrowLeftRight className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        }

                        // Empty Cell: bg-[#F8FAFC] với đường kẻ lưới sắc nét rõ ràng
                        return (
                          <td
                            key={day}
                            className="p-1 border-r border-slate-300 dark:border-slate-700/80 last:border-r-0 bg-[#F8FAFC] dark:bg-transparent hover:bg-slate-200/50 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            <div className="min-h-[44px]" />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Dải Phân Cách Ca Sáng / Chiều (Giữa Tiết 6 và Tiết 7) - Nghỉ trưa được mở rộng không gian và tăng cỡ chữ */}
                    {isLunchBreakAfter && (
                      <tr
                        id="schedule-lunch-break-tag"
                        className="bg-slate-200/90 dark:bg-slate-800/80 border-y-2 border-slate-400 dark:border-slate-700 select-none shadow-inner animate-pulse"
                      >
                        <td
                          colSpan={days.length + 1}
                          className="py-4 sm:py-5 px-6 text-center text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 tracking-widest uppercase font-mono bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="inline-block w-10 sm:w-24 h-0.5 bg-slate-400/80 dark:bg-slate-600 rounded-full" />
                            <Clock className="w-5 h-5 text-blue-700 dark:text-sky-400 stroke-[2.5]" />
                            <span className="drop-shadow-xs">Nghỉ trưa (11g40 - 12g30)</span>
                            <span className="inline-block w-10 sm:w-24 h-0.5 bg-slate-400/80 dark:bg-slate-600 rounded-full" />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Switch Section Modal / Popover */}
      {selectedSectionForSwitch && (
        <div
          id="switch-section-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in"
          onClick={() => setSelectedSectionForSwitch(null)}
        >
          <div
            id="switch-section-modal"
            className="w-full max-w-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      selectedSectionForSwitch.classType === 'TH'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                    }`}
                  >
                    {selectedSectionForSwitch.classType === 'TH' ? 'Thực hành' : 'Lý thuyết'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {selectedSectionForSwitch.courseCode}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedSectionForSwitch.courseName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Lớp đang chọn: <strong className="text-slate-800 dark:text-slate-200">{selectedSectionForSwitch.classCode}</strong> ({selectedSectionForSwitch.group}) • {DAY_NAMES[selectedSectionForSwitch.dayOfWeek]} (Tiết {selectedSectionForSwitch.startPeriod}-{selectedSectionForSwitch.endPeriod})
                </p>
              </div>

              <button
                onClick={() => setSelectedSectionForSwitch(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: List Alternative Sections */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Chọn nhóm lớp khác để thay thế:</span>
                <span>{alternativeClassGroups.length} nhóm khả dụng</span>
              </div>

              {alternativeClassGroups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>Không có nhóm lớp thay thế nào khác cho môn này trong danh mục đã chọn.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alternativeClassGroups.map((groupSecList, gIdx) => {
                    const firstSec = groupSecList[0];
                    const clashingCourses = activeSections.filter(
                      (actSec) =>
                        actSec.courseCode !== selectedSectionForSwitch.courseCode &&
                        groupSecList.some((candSec) => hasTimeClash(candSec, actSec))
                    );
                    const hasClashWithOther = clashingCourses.length > 0;

                    return (
                      <button
                        key={gIdx}
                        onClick={() => handleSwitchClassGroup(selectedSectionForSwitch, groupSecList)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          hasClashWithOther
                            ? 'border-rose-300 bg-rose-50/50 dark:border-rose-800/60 dark:bg-rose-950/20 hover:border-rose-400'
                            : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#18233c] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {firstSec.classCode}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Nhóm {firstSec.group || '01'}
                            </span>
                            {hasClashWithOther && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Trùng lịch
                              </span>
                            )}
                          </div>

                          {hasClashWithOther && (
                            <div className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                              ⚠️ Sẽ bị trùng với: {clashingCourses.map((c) => c.courseName).join(', ')}
                            </div>
                          )}

                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                            {groupSecList.map((s, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <span>• {DAY_NAMES[s.dayOfWeek]} (Tiết {s.startPeriod}-{s.endPeriod})</span>
                                <span className="text-slate-400">|</span>
                                <span>Phòng: {s.room}</span>
                                <span className="text-slate-400">|</span>
                                <span>GV: {s.lecturer || 'Khoa CNTT'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Đổi lớp</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between">
              <button
                onClick={() => handleRemoveClassGroup(selectedSectionForSwitch)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ môn này khỏi TKB</span>
              </button>

              <button
                onClick={() => setSelectedSectionForSwitch(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
