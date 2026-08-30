export function parseJsonArraySafely(rawText: string): any[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // 1. Strip markdown code fences if present (```json ... ``` or ``` ...)
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 2. Direct JSON.parse attempt
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === 'object') {
      if (Array.isArray(direct.data)) return direct.data;
      if (Array.isArray(direct.sections)) return direct.sections;
      if (Array.isArray(direct.items)) return direct.items;
      if (Array.isArray(direct.schedule)) return direct.schedule;
      if (direct.courseCode || direct.classCode || direct.maHocPhan) return [direct];
    }
  } catch {
    // Normal JSON parse failed (e.g. truncated response). Proceed to repair strategies below.
  }

  // 3. Repair Truncated Array: Find start `[` and scan back for last `}` before truncation
  const firstBracket = cleaned.indexOf('[');
  if (firstBracket !== -1) {
    const fromBracket = cleaned.slice(firstBracket);
    const lastBrace = fromBracket.lastIndexOf('}');
    if (lastBrace !== -1) {
      const candidate = fromBracket.slice(0, lastBrace + 1) + ']';
      try {
        const parsedCandidate = JSON.parse(candidate);
        if (Array.isArray(parsedCandidate) && parsedCandidate.length > 0) {
          return parsedCandidate;
        }
      } catch {
        // Continue to regex extractor
      }
    }
  }

  // 4. Regex / Chunk-based individual object extractor for malformed/unterminated responses
  const extractedObjects: any[] = [];
  const objectRegex = /\{[^{}]*?(?:"courseCode"|"stt"|"classCode"|"maHocPhan"|"courseName")[^{}]*?\}/g;
  let match;
  while ((match = objectRegex.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj === 'object') {
        extractedObjects.push(obj);
      }
    } catch {
      // Ignore invalid individual fragment
    }
  }

  if (extractedObjects.length > 0) {
    return extractedObjects;
  }

  return [];
}

export function parseJsonObjectSafely(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      try {
        return JSON.parse(cleaned.slice(0, lastBrace + 1));
      } catch {}
    }
  }
  return {};
}

export function isHeaderOrNoiseString(val: string): boolean {
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

export function cleanLecturerName(raw: any): string {
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

export function cleanRoomName(raw: any): string {
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

export function healCourseCode(raw: string): string {
  if (!raw) return '';
  let code = raw.trim().toUpperCase().replace(/[\s\-_.]+/g, '');
  code = code
    .replace(/^CONF/i, 'COMP')
    .replace(/^C0MP/i, 'COMP')
    .replace(/^C0NF/i, 'COMP')
    .replace(/^1TEC/i, 'ITEC')
    .replace(/^1T/i, 'IT')
    .replace(/^M4TH/i, 'MATH');
  return code;
}

export function parseServerPeriods(item: any): { start: number; end: number } {
  const startField = item.startPeriod ?? item.tietBatDau ?? item.tietBd ?? item.tiet_bd ?? item.tietStart ?? item.tuTiet ?? item.tu_tiet ?? item.tbd ?? item.fromPeriod ?? item.start ?? item.start_period ?? null;
  const endField = item.endPeriod ?? item.tietKetThuc ?? item.tietKt ?? item.tiet_kt ?? item.tietEnd ?? item.denTiet ?? item.den_tiet ?? item.tkt ?? item.toPeriod ?? item.end ?? item.end_period ?? null;
  const combinedField = item.periodCombined ?? item.tietHoc ?? item.tiet ?? item.period ?? item.periods ?? item.ca ?? item.caHoc ?? item.ca_hoc ?? item.thoiGian ?? item.time ?? item.tiet_hoc ?? '';

  const combinedText = `${String(startField || '')} ${String(endField || '')} ${String(combinedField || '')}`.toLowerCase().trim();

  // 1. Shift / Ca keyword heuristics
  if (combinedText.includes('ca 1') || combinedText.includes('sáng 1') || combinedText.includes('ca sáng 1')) return { start: 1, end: 3 };
  if (combinedText.includes('ca 2') || combinedText.includes('sáng 2') || combinedText.includes('ca sáng 2')) return { start: 4, end: 6 };
  if (combinedText.includes('ca 3') || combinedText.includes('chiều 1') || combinedText.includes('chieu 1') || combinedText.includes('ca chiều 1')) return { start: 7, end: 9 };
  if (combinedText.includes('ca 4') || combinedText.includes('chiều 2') || combinedText.includes('chieu 2') || combinedText.includes('ca chiều 2')) return { start: 10, end: 12 };
  if (combinedText.includes('ca 5') || combinedText.includes('ca tối') || combinedText.includes('tối') || combinedText.includes('toi')) return { start: 13, end: 15 };

  let start = NaN;
  let end = NaN;

  // 2. Regex for range formats: "4-6", "7-9", "10-12", "1-3", "4..6", "7->9", "4 to 6", "từ 4 đến 6", "tiet 4-6"
  const rangeMatch = combinedText.match(/(\d{1,2})\s*[-–—>to..đến]+\s*(\d{1,2})/i);
  if (rangeMatch) {
    const s = parseInt(rangeMatch[1], 10);
    const e = parseInt(rangeMatch[2], 10);
    if (!isNaN(s) && !isNaN(e) && s >= 1 && e >= s && s <= 15) {
      start = s;
      end = e;
    }
  }

  // 3. Comma separated list e.g. "4, 5, 6" or "7,8,9" or "10, 11, 12"
  if (isNaN(start)) {
    const allNums = combinedText.match(/\d+/g);
    if (allNums && allNums.length >= 2) {
      const s = parseInt(allNums[0], 10);
      const e = parseInt(allNums[allNums.length - 1], 10);
      if (!isNaN(s) && !isNaN(e) && s >= 1 && e >= s && s <= 15) {
        start = s;
        end = e;
      }
    }
  }

  // 4. Standalone integers
  if (isNaN(start)) {
    start = parseInt(String(startField || '').replace(/[^\d]/g, ''), 10);
  }
  if (isNaN(end)) {
    end = parseInt(String(endField || '').replace(/[^\d]/g, ''), 10);
  }

  if (isNaN(start) || start < 1) {
    if (!isNaN(end) && end >= 1) {
      start = Math.max(1, end - 2);
    } else {
      if (combinedText.includes('chiều') || combinedText.includes('chieu') || combinedText.includes('afternoon') || combinedText.includes('pm')) {
        start = 7;
        end = 9;
      } else {
        start = 1;
        end = 3;
      }
    }
  }

  if (isNaN(end) || end < start) {
    if (start === 1) end = 3;
    else if (start === 3) end = 6;
    else if (start === 4) end = 6;
    else if (start === 7) end = 9;
    else if (start === 10) end = 12;
    else if (start === 13) end = 15;
    else end = start + 2;
  }

  // Enforce 3-4 periods domain limit
  const span = end - start + 1;
  if (span > 4 || end > 15) {
    if (start === 1) end = end === 4 ? 4 : 3;
    else if (start === 3) end = 6;
    else if (start === 4 || start === 5) end = end === 7 ? 7 : 6;
    else if (start === 7 || start === 8) end = end === 10 ? 10 : 9;
    else if (start === 10 || start === 11) end = end === 13 ? 13 : 12;
    else if (start === 13) end = 15;
    else end = Math.min(15, start + 2);
  }

  start = Math.max(1, Math.min(15, start));
  end = Math.max(start, Math.min(15, end));

  return { start, end };
}

export function normalizeExtractedSections(rawList: any[], defaultSourceFile?: string): any[] {
  if (!Array.isArray(rawList)) return [];

  const results: any[] = [];
  const seenKey = new Set<string>();

  for (let idx = 0; idx < rawList.length; idx++) {
    const item = rawList[idx];
    if (!item || typeof item !== 'object') continue;

    // 1. Course Name (MUST BE VALID & NOT HEADER NOISE)
    let courseName = String(item.courseName ?? item.tenHocPhan ?? item.tenHp ?? item.tenMh ?? item.tenMon ?? item.subjectName ?? '').trim();
    if (!courseName || courseName.length < 2 || isHeaderOrNoiseString(courseName)) {
      continue;
    }

    // 2. Course Code & Class Code
    let rawCourseCode = String(item.courseCode ?? item.maHocPhan ?? item.maHp ?? item.maMh ?? item.maMon ?? item.subjectCode ?? '').trim();
    let rawClassCode = String(item.classCode ?? item.maLopHocPhan ?? item.maLhp ?? item.maLop ?? '').trim();
    
    if (isHeaderOrNoiseString(rawCourseCode)) rawCourseCode = '';
    if (isHeaderOrNoiseString(rawClassCode)) rawClassCode = '';

    let courseCode = healCourseCode(rawCourseCode);
    let classCode = rawClassCode;

    if (!courseCode && !classCode) {
      const match = courseName.match(/^([A-Z]{2,6}\d{3,5})/i);
      if (match) {
        courseCode = healCourseCode(match[1]);
      } else {
        continue;
      }
    }

    if (!courseCode && classCode) {
      const codeMatch = classCode.match(/([A-Z]{2,6}\d{3,5})/i);
      courseCode = codeMatch ? healCourseCode(codeMatch[1]) : classCode;
    }

    const rawGroup = String(item.group ?? item.nhom ?? item.nhomTh ?? item.to ?? item.classGroup ?? 'Lớp 01').trim();
    if (!classCode) {
      const groupSuffix = rawGroup.replace(/[^\d]/g, '').padStart(2, '0') || '01';
      classCode = `2511${courseCode}${groupSuffix}`;
    }

    // 3. Day of week (MUST BE 2..8)
    let day = item.dayOfWeek ?? item.thu ?? item.day ?? item.thuHoc ?? null;
    if (typeof day === 'string') {
      const lower = day.toLowerCase().trim();
      if (lower.includes('hai') || lower === '2' || lower.includes('t2') || lower.includes('thứ 2') || lower.includes('thu 2') || lower.includes('mon')) day = 2;
      else if (lower.includes('ba') || lower === '3' || lower.includes('t3') || lower.includes('thứ 3') || lower.includes('thu 3') || lower.includes('tue')) day = 3;
      else if (lower.includes('tư') || lower.includes('tu') || lower.includes('bon') || lower === '4' || lower.includes('t4') || lower.includes('thứ 4') || lower.includes('thu 4') || lower.includes('wed')) day = 4;
      else if (lower.includes('năm') || lower.includes('nam') || lower === '5' || lower.includes('t5') || lower.includes('thứ 5') || lower.includes('thu 5') || lower.includes('thu')) day = 5;
      else if (lower.includes('sáu') || lower.includes('sau') || lower === '6' || lower.includes('t6') || lower.includes('thứ 6') || lower.includes('thu 6') || lower.includes('fri')) day = 6;
      else if (lower.includes('bảy') || lower.includes('bay') || lower === '7' || lower.includes('t7') || lower.includes('thứ 7') || lower.includes('thu 7') || lower.includes('sat')) day = 7;
      else if (lower.includes('nhật') || lower.includes('nhat') || lower.includes('cn') || lower === '8' || lower === '1' || lower.includes('chủ nhật') || lower.includes('chu nhat') || lower.includes('sun')) day = 8;
      else day = null;
    }
    const dayNum = Number(day);
    if (!dayNum || isNaN(dayNum) || dayNum < 2 || dayNum > 8) {
      continue;
    }

    // 4. Periods (MUST BE 1..15 and start <= end)
    const { start, end } = parseServerPeriods(item);
    if (!start || isNaN(start) || start < 1 || start > 15) {
      continue;
    }

    // 5. Lecturer (MUST BE PRESENT & VALID)
    const rawLecturer = item.lecturer ?? item.giangVien ?? item.cbgd ?? item.canBoGiangDay ?? item.hoTenGv ?? item.gv ?? '';
    const lecturer = cleanLecturerName(rawLecturer);
    if (!lecturer) {
      continue;
    }

    // 6. Room (MUST BE PRESENT & VALID)
    const rawRoom = item.room ?? item.phongHoc ?? item.phongMay ?? item.lab ?? item.phong ?? '';
    const room = cleanRoomName(rawRoom);
    if (!room) {
      continue;
    }

    const rawType = String(item.classType ?? item.loaiHocPhan ?? item.loaiLhp ?? item.loaiLop ?? '').toUpperCase();
    const isTH = item.isLab === true || rawType.includes('TH') || rawType.includes('LAB') || rawGroup.toUpperCase().includes('TH') || classCode.toUpperCase().includes('TH') || classCode.toUpperCase().includes('LAB') || room.toUpperCase().includes('LAB') || room.toUpperCase().includes('PM');
    const classType = isTH ? 'TH' : 'LT';
    const group = rawGroup || (classType === 'TH' ? 'Nhóm TH 01' : 'Lớp 01');

    const weeks = String(item.weeks ?? item.tuanHoc ?? item.tuan ?? '1-15').trim() || '1-15';
    const sourceFile = item.sourceFile || defaultSourceFile || undefined;

    const uniqueKey = `${courseCode}__${classCode}__${dayNum}__${start}__${end}`;
    if (seenKey.has(uniqueKey)) continue;
    seenKey.add(uniqueKey);

    results.push({
      id: item.id || `sec_${courseCode}_${classCode}_${dayNum}_${start}_${idx + 1}`,
      stt: item.stt || results.length + 1,
      courseCode,
      courseName,
      classCode,
      classType,
      group,
      lecturer,
      dayOfWeek: dayNum,
      startPeriod: start,
      endPeriod: end,
      room,
      weeks,
      credits: Number(item.credits ?? item.soTinChi ?? item.soTc) || 3,
      sourceFile
    });
  }

  return results;
}

export function normalizePersonalSchedule(rawList: any[]): any[] {
  if (!Array.isArray(rawList)) return [];
  const palette = ['indigo', 'blue', 'emerald', 'teal', 'purple', 'amber', 'rose', 'cyan'];
  const validatedSections = normalizeExtractedSections(rawList);

  return validatedSections.map((sec, idx) => ({
    id: sec.id || `sch-${Date.now()}-${idx}`,
    subjectName: sec.courseName,
    subjectCode: sec.courseCode,
    classCode: sec.classCode,
    classGroup: sec.group,
    dayOfWeek: sec.dayOfWeek,
    startPeriod: sec.startPeriod,
    endPeriod: sec.endPeriod,
    room: sec.room,
    lecturer: sec.lecturer,
    isLab: sec.classType === 'TH',
    weeks: sec.weeks,
    color: palette[idx % palette.length]
  }));
}
