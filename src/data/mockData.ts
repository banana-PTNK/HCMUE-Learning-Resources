import { Subject, Announcement, Contributor, MasterCourseSection } from '../types';
import subjectsJson from './subjects.json';
import announcementsJson from './announcements.json';
import contributorsJson from './contributors.json';
import masterScheduleJson from './masterScheduleSample.json';

export const mockSubjects: Subject[] = subjectsJson as Subject[];
export const mockAnnouncements: Announcement[] = announcementsJson as Announcement[];
export const mockContributors: Contributor[] = contributorsJson as Contributor[];
export const mockMasterSchedule: MasterCourseSection[] = masterScheduleJson as MasterCourseSection[];

export const categoryMeta = {
  general: {
    id: 'general',
    title: 'Môn học đại cương',
    englishTitle: 'General Education',
    description: 'Khối kiến thức nền tảng giáo dục đại học, bao gồm Toán cao cấp, Vật lý đại cương, Triết học và Pháp luật đại cương.',
    icon: 'GraduationCap',
  },
  foundation: {
    id: 'foundation',
    title: 'Môn học cơ sở ngành',
    englishTitle: 'Fundamental IT',
    description: 'Các môn học cốt lõi định hình tư duy lập trình và kiến trúc hệ thống: Cấu trúc dữ liệu & Giải thuật, Kiến trúc máy tính, Hệ điều hành, Cơ sở dữ liệu.',
    icon: 'LayoutGrid',
  },
  specialized: {
    id: 'specialized',
    title: 'Môn học chuyên ngành',
    englishTitle: 'Specialized IT',
    description: 'Chuyên sâu các hướng Công nghệ phần mềm, Trí tuệ nhân tạo, Mạng máy tính & An toàn thông tin, Hệ thống thông tin.',
    icon: 'Code2',
  },
  elective: {
    id: 'elective',
    title: 'Môn học tự chọn',
    englishTitle: 'Elective Subjects',
    description: 'Danh mục các học phần tự chọn định hướng công nghệ mới như Cloud Computing, Mobile App Development, DevOps, Deep Learning.',
    icon: 'BookOpen',
  },
  capstone: {
    id: 'capstone',
    title: 'Đồ án & Khóa luận tốt nghiệp',
    englishTitle: 'Capstone & Resources',
    description: 'Tài liệu hướng dẫn thực hiện Đồ án chuyên ngành, Khóa luận tốt nghiệp cử nhân CNTT, mẫu báo cáo LaTeX và template chuẩn Khoa.',
    icon: 'Award',
  },
};
