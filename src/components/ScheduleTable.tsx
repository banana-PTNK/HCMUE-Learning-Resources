import React, { useState } from 'react';
import { Download, Plus, Trash2, Calendar as CalendarIcon, Clock, MapPin, User, Tag, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScheduleItem } from '../types';

interface ScheduleTableProps {
  schedule: ScheduleItem[];
  onAddCourse?: () => void;
  onRemoveItem?: (id: string) => void;
  onClearAll?: () => void;
}

const PERIOD_TIMES: { [key: number]: { start: string; end: string } } = {
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

const DAYS = [
  { day: 2, label: 'Thứ 2' },
  { day: 3, label: 'Thứ 3' },
  { day: 4, label: 'Thứ 4' },
  { day: 5, label: 'Thứ 5' },
  { day: 6, label: 'Thứ 6' },
  { day: 7, label: 'Thứ 7' }
];

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedule,
  onAddCourse,
  onRemoveItem,
  onClearAll
}) => {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);

  // Generate .ics calendar file
  const exportICS = () => {
    if (schedule.length === 0) return;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HCMUE FIT StudyVault//NONSGML Timetable//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Thời khóa biểu HCMUE FIT'
    ];

    // Reference Monday start date for next recurring semester
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    schedule.forEach((item) => {
      const dayOffset = (item.dayOfWeek - 2); // Thứ 2 offset is 0
      const classDate = new Date(monday);
      classDate.setDate(monday.getDate() + dayOffset);

      const startTimeObj = PERIOD_TIMES[item.startPeriod] || { start: '07:00', end: '09:25' };
      const endTimeObj = PERIOD_TIMES[item.endPeriod] || { start: '09:35', end: '11:10' };

      const [sHour, sMin] = startTimeObj.start.split(':').map(Number);
      const [eHour, eMin] = endTimeObj.end.split(':').map(Number);

      const startDateTime = new Date(classDate);
      startDateTime.setHours(sHour, sMin, 0, 0);

      const endDateTime = new Date(classDate);
      endDateTime.setHours(eHour, eMin, 0, 0);

      const formatICSDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${item.id || Math.random().toString(36).substring(2)}@studyvault.fit.hcmue`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDateTime)}`,
        `DTEND:${formatICSDate(endDateTime)}`,
        `SUMMARY:[${item.subjectCode}] ${item.subjectName}`,
        `LOCATION:${item.room || 'ĐH Sư Phạm TP.HCM'}`,
        `DESCRIPTION:Giảng viên: ${item.lecturer || 'Khoa CNTT'} \\nNhóm/Lớp: ${item.classGroup || 'K48 CNTT'} \\nTiết: ${item.startPeriod}-${item.endPeriod}`,
        'RRULE:FREQ=WEEKLY;COUNT=15',
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `TKB_HCMUE_FIT_${new Date().getFullYear()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Confetti
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const getColorClass = (color?: string, isLab?: boolean) => {
    if (isLab) return 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200 hover:border-cyan-400';
    switch (color) {
      case 'emerald':
        return 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 hover:border-emerald-400';
      case 'indigo':
        return 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200 hover:border-indigo-400';
      case 'purple':
        return 'bg-purple-950/60 border-purple-500/50 text-purple-200 hover:border-purple-400';
      default:
        return 'bg-blue-950/60 border-blue-500/50 text-blue-200 hover:border-blue-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">
              Tổng số môn đã quét: <span className="font-mono text-blue-400 font-bold">{schedule.length}</span>
            </span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="text-xs text-slate-400 hidden sm:block">
            Học kỳ 1 • Năm học 2025 - 2026
          </div>
        </div>

        <div className="flex items-center gap-2">
          {schedule.length > 0 && onClearAll && (
            <button
              id="clear-schedule-btn"
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-800/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa bảng</span>
            </button>
          )}

          <button
            id="export-ics-btn"
            onClick={exportICS}
            disabled={schedule.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file lịch (.ics) cho Google/Apple Calendar</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Visual Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-950 border-b-2 border-slate-700 text-slate-200 uppercase font-mono text-xs select-none">
              <th className="py-3.5 px-3 w-32 text-center bg-slate-900 border-r-2 border-slate-700 font-extrabold tracking-wider">
                <div className="flex items-center justify-center gap-1.5 text-indigo-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Ca / Tiết</span>
                </div>
              </th>
              {DAYS.map((d) => (
                <th
                  key={d.day}
                  className={`py-3.5 px-3 font-extrabold text-sm md:text-base text-center border-r border-slate-800 last:border-r-0 ${
                    d.day === 7 ? 'text-amber-400 bg-amber-950/20' : 'text-slate-100'
                  }`}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {/* Session 1: Sáng (Tiết 1-3) */}
            <tr className="hover:bg-slate-800/20">
              <td className="py-3 px-2 text-center bg-slate-950/80 border-r-2 border-slate-700 select-none">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold font-mono text-xs">
                  Tiết 1 - 3
                </div>
                <div className="text-xs text-slate-300 font-mono font-semibold mt-1">07:00 - 09:25</div>
              </td>
              {DAYS.map((d) => {
                const items = schedule.filter(
                  (item) => item.dayOfWeek === d.day && item.startPeriod <= 3 && item.endPeriod >= 1
                );
                return (
                  <td key={d.day} className="p-2 border-r border-slate-800/60 last:border-r-0 align-top">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${getColorClass(item.color, item.isLab)}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 font-semibold">
                            {item.subjectCode}
                          </span>
                          {item.isLab && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-100 line-clamp-2">
                          {item.subjectName}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.room || 'Phòng A.302'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lecturer || 'Khoa CNTT'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>

            {/* Session 2: Sáng muộn (Tiết 4-6) */}
            <tr className="hover:bg-slate-800/20">
              <td className="py-3 px-2 text-center bg-slate-950/80 border-r-2 border-slate-700 select-none">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold font-mono text-xs">
                  Tiết 4 - 6
                </div>
                <div className="text-xs text-slate-300 font-mono font-semibold mt-1">09:35 - 12:00</div>
              </td>
              {DAYS.map((d) => {
                const items = schedule.filter(
                  (item) => item.dayOfWeek === d.day && item.startPeriod <= 6 && item.endPeriod >= 4
                );
                return (
                  <td key={d.day} className="p-2 border-r border-slate-800/60 last:border-r-0 align-top">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${getColorClass(item.color, item.isLab)}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 font-semibold">
                            {item.subjectCode}
                          </span>
                          {item.isLab && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-100 line-clamp-2">
                          {item.subjectName}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.room || 'Phòng C.105'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lecturer || 'Khoa CNTT'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>

            {/* Session 3: Chiều đầu (Tiết 7-9) */}
            <tr className="hover:bg-slate-800/20">
              <td className="py-3 px-2 text-center bg-slate-950/80 border-r-2 border-slate-700 select-none">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold font-mono text-xs">
                  Tiết 7 - 9
                </div>
                <div className="text-xs text-slate-300 font-mono font-semibold mt-1">13:00 - 15:25</div>
              </td>
              {DAYS.map((d) => {
                const items = schedule.filter(
                  (item) => item.dayOfWeek === d.day && item.startPeriod <= 9 && item.endPeriod >= 7
                );
                return (
                  <td key={d.day} className="p-2 border-r border-slate-800/60 last:border-r-0 align-top">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${getColorClass(item.color, item.isLab)}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 font-semibold">
                            {item.subjectCode}
                          </span>
                          {item.isLab && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-100 line-clamp-2">
                          {item.subjectName}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.room || 'Phòng Lab'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lecturer || 'Khoa CNTT'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>

            {/* Session 4: Chiều muộn (Tiết 10-12) */}
            <tr className="hover:bg-slate-800/20">
              <td className="py-3 px-2 text-center bg-slate-950/80 border-r-2 border-slate-700 select-none">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold font-mono text-xs">
                  Tiết 10 - 12
                </div>
                <div className="text-xs text-slate-300 font-mono font-semibold mt-1">15:35 - 18:00</div>
              </td>
              {DAYS.map((d) => {
                const items = schedule.filter(
                  (item) => item.dayOfWeek === d.day && item.startPeriod <= 12 && item.endPeriod >= 10
                );
                return (
                  <td key={d.day} className="p-2 border-r border-slate-800/60 last:border-r-0 align-top">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${getColorClass(item.color, item.isLab)}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/40 font-semibold">
                            {item.subjectCode}
                          </span>
                          {item.isLab && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-100 line-clamp-2">
                          {item.subjectName}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.room || 'Phòng Học'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lecturer || 'Khoa CNTT'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Selected Course Detail Modal/Card */}
      {selectedItem && (
        <div
          id="course-item-detail-card"
          className="p-4 rounded-xl bg-slate-900 border border-blue-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 font-mono text-xs font-semibold rounded">
                {selectedItem.subjectCode}
              </span>
              <h4 className="text-sm font-bold text-white">{selectedItem.subjectName}</h4>
            </div>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Thứ {selectedItem.dayOfWeek} (Tiết {selectedItem.startPeriod} - {selectedItem.endPeriod})</span>
              <span>•</span>
              <span>{selectedItem.room}</span>
              <span>•</span>
              <span>GV: {selectedItem.lecturer}</span>
              {selectedItem.classGroup && <span>• Lớp: {selectedItem.classGroup}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onRemoveItem && (
              <button
                onClick={() => {
                  onRemoveItem(selectedItem.id);
                  setSelectedItem(null);
                }}
                className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 border border-rose-800/40 rounded-lg transition-colors"
              >
                Xóa môn này
              </button>
            )}
            <button
              onClick={() => setSelectedItem(null)}
              className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Đóng chi tiết
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
