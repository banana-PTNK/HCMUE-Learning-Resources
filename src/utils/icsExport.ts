import { MasterCourseSection } from '../types';

export const PERIOD_TIME_MAP: { [period: number]: { start: string; end: string } } = {
  1: { start: '06:30', end: '07:20' },
  2: { start: '07:20', end: '08:10' },
  3: { start: '08:10', end: '09:00' },
  4: { start: '09:10', end: '10:00' },
  5: { start: '10:00', end: '10:50' },
  6: { start: '10:50', end: '11:40' },
  7: { start: '12:30', end: '13:20' },
  8: { start: '13:20', end: '14:10' },
  9: { start: '14:10', end: '15:00' },
  10: { start: '15:10', end: '16:00' },
  11: { start: '16:00', end: '16:50' },
  12: { start: '16:50', end: '17:40' }
};

export const DAY_NAMES: { [key: number]: string } = {
  2: 'Thứ 2 (Monday)',
  3: 'Thứ 3 (Tuesday)',
  4: 'Thứ 4 (Wednesday)',
  5: 'Thứ 5 (Thursday)',
  6: 'Thứ 6 (Friday)',
  7: 'Thứ 7 (Saturday)',
  8: 'Chủ Nhật (Sunday)'
};

export const DAY_BYDAY_MAP: { [key: number]: string } = {
  2: 'MO',
  3: 'TU',
  4: 'WE',
  5: 'TH',
  6: 'FR',
  7: 'SA',
  8: 'SU'
};

function formatICSDate(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);

  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/**
 * Calculates the next occurrence of a day of the week starting from next Monday.
 */
function getTargetDateForDay(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  // DayOfWeek: 2 is Monday -> diff = 1
  const targetDayJs = dayOfWeek === 8 ? 0 : dayOfWeek - 1; // 2->1, 3->2, 7->6, 8->0

  let diff = (targetDayJs - currentDay + 7) % 7;
  if (diff === 0) diff = 7; // Next week's occurrence

  const targetDate = new Date();
  targetDate.setDate(today.getDate() + diff);
  return targetDate;
}

/**
 * Generates an RFC-5545 .ics file for the scheduled courses.
 */
export function generateICSContent(
  sections: MasterCourseSection[],
  semesterTitle = 'TKB HCMUE Học Kỳ 1'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HCMUE FIT StudyVault//AI Course Timetable Generator//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${semesterTitle}`,
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Ho_Chi_Minh',
    'X-LIC-LOCATION:Asia/Ho_Chi_Minh',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:+07',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  const nowStr = formatICSDate(new Date(), '00:00') + 'Z';

  sections.forEach((s, idx) => {
    const startTimeStr = PERIOD_TIME_MAP[s.startPeriod]?.start || '07:00';
    const endTimeStr = PERIOD_TIME_MAP[s.endPeriod]?.end || '09:30';
    const targetDate = getTargetDateForDay(s.dayOfWeek);

    const dtStart = formatICSDate(targetDate, startTimeStr);
    const dtEnd = formatICSDate(targetDate, endTimeStr);
    const uid = `hcmue-course-${s.classCode}-${s.dayOfWeek}-${s.startPeriod}-${idx}@studyvault.hcmue.edu.vn`;
    const byDay = DAY_BYDAY_MAP[s.dayOfWeek] || 'MO';

    const typeLabel = s.classType === 'TH' ? '[Thực hành]' : '[Lý thuyết]';
    const summary = `${typeLabel} ${s.courseName} (${s.courseCode}) - ${s.group || s.classCode}`;
    const description = `Mã học phần: ${s.classCode}\\nGiảng viên: ${s.lecturer || 'Khoa CNTT'}\\nTiết: ${s.startPeriod} - ${s.endPeriod}\\nPhòng học: ${s.room}\\nTuần học: ${s.weeks || '1-15'}\\nThời khóa biểu được tạo tự động bởi HCMUE-FIT StudyVault AI Scheduler.`;
    const location = `${s.room}, ĐH Sư phạm TP.HCM (HCMUE)`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART;TZID=Asia/Ho_Chi_Minh:${dtStart}`);
    lines.push(`DTEND;TZID=Asia/Ho_Chi_Minh:${dtEnd}`);
    lines.push(`RRULE:FREQ=WEEKLY;COUNT=15;BYDAY=${byDay}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Nhắc nhở: Sắp tới giờ học ${s.courseName} tại ${s.room}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers client-side download of the .ics file.
 */
export function downloadICSFile(sections: MasterCourseSection[], filename = 'ThoiKhoaBieu_HCMUE.ics'): void {
  const icsContent = generateICSContent(sections);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
