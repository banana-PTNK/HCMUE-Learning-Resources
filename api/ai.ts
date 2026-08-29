// /**
//  * Vercel Serverless Function: /api/ai
//  * Ultra-Fast AI Assistant Engine powered by Gemini 3.7 Flash
//  * Supports:
//  * - PARSE_SCHEDULE (Personal student schedule vision extraction)
//  * - PARSE_MASTER_SCHEDULE (Master course sections relational join)
//  * - EXPLAIN_CODE (Big-O complexity, dry-run simulation & optimizations)
//  */

// function parseJsonArraySafely(rawText: string): any[] {
//   if (!rawText || typeof rawText !== 'string') return [];

//   let cleaned = rawText.trim();
//   if (cleaned.startsWith('```')) {
//     cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
//   }

//   try {
//     const direct = JSON.parse(cleaned);
//     if (Array.isArray(direct)) return direct;
//     if (direct && typeof direct === 'object') {
//       if (Array.isArray(direct.data)) return direct.data;
//       if (Array.isArray(direct.sections)) return direct.sections;
//       if (Array.isArray(direct.items)) return direct.items;
//       if (Array.isArray(direct.schedule)) return direct.schedule;
//       if (direct.courseCode || direct.classCode || direct.maHocPhan) return [direct];
//     }
//   } catch {}

//   const firstBracket = cleaned.indexOf('[');
//   if (firstBracket !== -1) {
//     const fromBracket = cleaned.slice(firstBracket);
//     const lastBrace = fromBracket.lastIndexOf('}');
//     if (lastBrace !== -1) {
//       const candidate = fromBracket.slice(0, lastBrace + 1) + ']';
//       try {
//         const parsedCandidate = JSON.parse(candidate);
//         if (Array.isArray(parsedCandidate) && parsedCandidate.length > 0) {
//           return parsedCandidate;
//         }
//       } catch {}
//     }
//   }

//   const extractedObjects: any[] = [];
//   const objectRegex = /\{[^{}]*?(?:"courseCode"|"stt"|"classCode"|"subjectCode"|"maHocPhan"|"courseName"|"subjectName")[^{}]*?\}/g;
//   let match;
//   while ((match = objectRegex.exec(cleaned)) !== null) {
//     try {
//       const obj = JSON.parse(match[0]);
//       if (obj && typeof obj === 'object') {
//         extractedObjects.push(obj);
//       }
//     } catch {}
//   }

//   return extractedObjects;
// }

// // High-precision sanitization and normalization for university course sections
// function isHeaderOrNoiseString(val: string): boolean {
//   if (!val || typeof val !== 'string') return true;
//   const upper = val.trim().toUpperCase();
//   if (upper.length < 2) return true;
//   const noiseTokens = [
//     'STT', 'SỐ THỨ TỰ', 'SO THU TU',
//     'MÃ HP', 'MA HP', 'MÃ HỌC PHẦN', 'MA HOC PHAN', 'MÃ MÔN', 'MA MON',
//     'MÃ LHP', 'MA LHP', 'MÃ LỚP HỌC PHẦN', 'MA LOP HOC PHAN', 'MÃ LỚP', 'MA LOP',
//     'TÊN HP', 'TEN HP', 'TÊN HỌC PHẦN', 'TEN HOC PHAN', 'TÊN MÔN', 'TEN MON', 'TÊN MÔN HỌC', 'TEN MON HOC',
//     'THỜI KHÓA BIỂU', 'THOI KHOA BIEU', 'LỊCH HỌC', 'LICH HOC', 'TIMETABLE', 'SCHEDULE',
//     'HỌC KỲ', 'HOC KY', 'SEMESTER', 'NĂM HỌC', 'NAM HOC', 'TRƯỜNG ĐẠI HỌC', 'TRUONG DAI HOC',
//     'KHOA CNTT', 'KHOA TOÁN', 'PHÒNG ĐÀO TẠO', 'PHONG DAO TAO',
//     'GIẢNG VIÊN', 'GIANG VIEN', 'CBGD', 'CÁN BỘ GIẢNG DẠY', 'CAN BO GIANG DAY',
//     'PHÒNG', 'PHONG', 'PHÒNG HỌC', 'PHONG HOC', 'ĐỊA ĐIỂM', 'DIA DIEM', 'ROOM',
//     'THỨ', 'THU', 'TIẾT', 'TIET', 'TIẾT BĐ', 'TIẾT KT', 'TUẦN', 'TUAN', 'GHI CHÚ', 'GHI CHU',
//     'SỐ TC', 'SO TC', 'SỐ TÍN CHỈ', 'SO TIN CHI', 'CREDITS', 'TOTAL'
//   ];
//   return noiseTokens.some((t) => upper === t || upper === `${t}:` || upper === `${t}.`);
// }

// function cleanLecturerName(raw: any): string {
//   if (!raw || typeof raw !== 'string') return '';
//   let str = raw.trim()
//     .replace(/^[-–—:;,.]+/, '')
//     .replace(/[-–—:;,.]+$/, '')
//     .replace(/\s+/g, ' ')
//     .trim();
  
//   // Reject garbage/placeholder words
//   const lower = str.toLowerCase();
//   if (
//     !str ||
//     str.length < 2 ||
//     lower === '-' ||
//     lower === '--' ||
//     lower === '...' ||
//     lower === 'null' ||
//     lower === 'undefined' ||
//     lower === 'n/a' ||
//     lower === 'chưa phân công' ||
//     lower === 'chua phan cong' ||
//     lower === 'chưa có' ||
//     lower === 'chua co' ||
//     lower === 'chưa xếp' ||
//     lower === 'chua xep' ||
//     isHeaderOrNoiseString(str)
//   ) {
//     return '';
//   }
//   return str;
// }

// function cleanRoomName(raw: any): string {
//   if (!raw || typeof raw !== 'string') return '';
//   let str = raw.trim()
//     .replace(/^[-–—:;,.]+/, '')
//     .replace(/[-–—:;,.]+$/, '')
//     .replace(/\s+/g, ' ')
//     .trim();
  
//   const lower = str.toLowerCase();
//   if (
//     !str ||
//     str.length < 2 ||
//     lower === '-' ||
//     lower === '--' ||
//     lower === 'null' ||
//     lower === 'undefined' ||
//     lower === 'n/a' ||
//     lower === 'chưa xếp phòng' ||
//     lower === 'chua xep phong' ||
//     lower === 'chưa có' ||
//     lower === 'chua co' ||
//     isHeaderOrNoiseString(str)
//   ) {
//     return '';
//   }
//   return str;
// }

// function healCourseCode(raw: string): string {
//   if (!raw) return '';
//   let code = raw.trim().toUpperCase().replace(/[\s\-_.]+/g, '');
//   // Fix common OCR misrecognitions (CONF -> COMP, C0MP -> COMP, ITEC, MATH)
//   code = code
//     .replace(/^CONF/i, 'COMP')
//     .replace(/^C0MP/i, 'COMP')
//     .replace(/^C0NF/i, 'COMP')
//     .replace(/^1TEC/i, 'ITEC')
//     .replace(/^1T/i, 'IT')
//     .replace(/^M4TH/i, 'MATH');
//   return code;
// }


// function parseJsonObjectSafely(rawText: string): any {
//   if (!rawText || typeof rawText !== 'string') return {};
//   let cleaned = rawText.trim();
//   if (cleaned.startsWith('```')) {
//     cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
//   }
//   try {
//     return JSON.parse(cleaned);
//   } catch {
//     const lastBrace = cleaned.lastIndexOf('}');
//     if (lastBrace !== -1) {
//       try {
//         return JSON.parse(cleaned.slice(0, lastBrace + 1));
//       } catch {}
//     }
//   }
//   return {};
// }

// /**
//  * Strict normalizer & validator for master schedule sections.
//  * Enforces extraction completeness: MUST have valid courseName, courseCode/classCode,
//  * valid dayOfWeek (2..8), valid start/end periods (1..12), valid lecturer, and valid room.
//  * Drops all corrupted, incomplete, or header noise items.
//  */
// function normalizeExtractedSections(rawList: any[], defaultSourceFile?: string): any[] {
//   if (!Array.isArray(rawList)) return [];

//   const results: any[] = [];
//   const seenKey = new Set<string>();

//   for (let idx = 0; idx < rawList.length; idx++) {
//     const item = rawList[idx];
//     if (!item || typeof item !== 'object') continue;

//     // 1. Course Name (MUST BE VALID & NOT HEADER NOISE)
//     let courseName = String(item.courseName ?? item.tenHocPhan ?? item.tenHp ?? item.tenMh ?? item.tenMon ?? item.subjectName ?? '').trim();
//     if (!courseName || courseName.length < 2 || isHeaderOrNoiseString(courseName)) {
//       continue;
//     }

//     // 2. Course Code & Class Code
//     let rawCourseCode = String(item.courseCode ?? item.maHocPhan ?? item.maHp ?? item.maMh ?? item.maMon ?? item.subjectCode ?? '').trim();
//     let rawClassCode = String(item.classCode ?? item.maLopHocPhan ?? item.maLhp ?? item.maLop ?? '').trim();
    
//     if (isHeaderOrNoiseString(rawCourseCode)) rawCourseCode = '';
//     if (isHeaderOrNoiseString(rawClassCode)) rawClassCode = '';

//     let courseCode = healCourseCode(rawCourseCode);
//     let classCode = rawClassCode;

//     if (!courseCode && !classCode) {
//       // Try to extract code from courseName if formatted like "COMP1017 - Cấu trúc dữ liệu"
//       const match = courseName.match(/^([A-Z]{2,6}\d{3,5})/i);
//       if (match) {
//         courseCode = healCourseCode(match[1]);
//       } else {
//         // Reject if no identifiable course code
//         continue;
//       }
//     }

//     if (!courseCode && classCode) {
//       const codeMatch = classCode.match(/([A-Z]{2,6}\d{3,5})/i);
//       courseCode = codeMatch ? healCourseCode(codeMatch[1]) : classCode;
//     }

//     const rawGroup = String(item.group ?? item.nhom ?? item.nhomTh ?? item.to ?? item.classGroup ?? 'Lớp 01').trim();
//     if (!classCode) {
//       const groupSuffix = rawGroup.replace(/[^\d]/g, '').padStart(2, '0') || '01';
//       classCode = `2511${courseCode}${groupSuffix}`;
//     }

//     // 3. Day of week (MUST BE 2..8)
//     let day = item.dayOfWeek ?? item.thu ?? item.day ?? item.thuHoc ?? null;
//     if (typeof day === 'string') {
//       const lower = day.toLowerCase().trim();
//       if (lower.includes('hai') || lower === '2' || lower.includes('t2') || lower.includes('thứ 2') || lower.includes('thu 2') || lower.includes('mon')) day = 2;
//       else if (lower.includes('ba') || lower === '3' || lower.includes('t3') || lower.includes('thứ 3') || lower.includes('thu 3') || lower.includes('tue')) day = 3;
//       else if (lower.includes('tư') || lower.includes('tu') || lower.includes('bon') || lower === '4' || lower.includes('t4') || lower.includes('thứ 4') || lower.includes('thu 4') || lower.includes('wed')) day = 4;
//       else if (lower.includes('năm') || lower.includes('nam') || lower === '5' || lower.includes('t5') || lower.includes('thứ 5') || lower.includes('thu 5') || lower.includes('thu')) day = 5;
//       else if (lower.includes('sáu') || lower.includes('sau') || lower === '6' || lower.includes('t6') || lower.includes('thứ 6') || lower.includes('thu 6') || lower.includes('fri')) day = 6;
//       else if (lower.includes('bảy') || lower.includes('bay') || lower === '7' || lower.includes('t7') || lower.includes('thứ 7') || lower.includes('thu 7') || lower.includes('sat')) day = 7;
//       else if (lower.includes('nhật') || lower.includes('nhat') || lower.includes('cn') || lower === '8' || lower === '1' || lower.includes('chủ nhật') || lower.includes('chu nhat') || lower.includes('sun')) day = 8;
//       else day = null;
//     }
//     const dayNum = Number(day);
//     if (!dayNum || isNaN(dayNum) || dayNum < 2 || dayNum > 8) {
//       continue; // Filter out rows with missing or invalid day
//     }

//     // 4. Periods (MUST BE 1..12 and start <= end)
//     let start = Number(item.startPeriod ?? item.tietBatDau ?? item.tietBd ?? item.tiet_bd ?? item.tietStart ?? 0);
//     let end = Number(item.endPeriod ?? item.tietKetThuc ?? item.tietKt ?? item.tiet_kt ?? item.tietEnd ?? 0);

//     // If period is combined string e.g. "1-3" or "7 -> 9"
//     const periodCombined = String(item.periodCombined ?? item.tietHoc ?? item.tiet ?? '').trim();
//     if ((!start || !end) && periodCombined) {
//       const matchPeriod = periodCombined.match(/(\d{1,2})\s*[-–—>to]+\s*(\d{1,2})/i);
//       if (matchPeriod) {
//         start = parseInt(matchPeriod[1], 10);
//         end = parseInt(matchPeriod[2], 10);
//       }
//     }

//     if (!start || isNaN(start) || start < 1 || start > 12) {
//       continue; // Filter out rows with invalid start period
//     }
//     if (!end || isNaN(end) || end < start || end > 12) {
//       end = Math.min(12, start + 2); // Default to 3 periods if valid start
//     }
//     if (end - start + 1 > 4) {
//       end = start + 2; // Capping to 3 periods (typical session duration)
//     }

//     // 5. Lecturer (MUST BE PRESENT & VALID)
//     const rawLecturer = item.lecturer ?? item.giangVien ?? item.cbgd ?? item.canBoGiangDay ?? item.hoTenGv ?? item.gv ?? '';
//     const lecturer = cleanLecturerName(rawLecturer);
//     if (!lecturer) {
//       continue; // Strictly filter out courses with missing lecturer
//     }

//     // 6. Room (MUST BE PRESENT & VALID)
//     const rawRoom = item.room ?? item.phongHoc ?? item.phongMay ?? item.lab ?? item.phong ?? '';
//     const room = cleanRoomName(rawRoom);
//     if (!room) {
//       continue; // Strictly filter out courses with missing room
//     }

//     // Class type detection
//     const rawType = String(item.classType ?? item.loaiHocPhan ?? item.loaiLhp ?? item.loaiLop ?? '').toUpperCase();
//     const isTH = item.isLab === true || rawType.includes('TH') || rawType.includes('LAB') || rawGroup.toUpperCase().includes('TH') || classCode.toUpperCase().includes('TH') || classCode.toUpperCase().includes('LAB') || room.toUpperCase().includes('LAB') || room.toUpperCase().includes('PM');
//     const classType = isTH ? 'TH' : 'LT';
//     const group = rawGroup || (classType === 'TH' ? 'Nhóm TH 01' : 'Lớp 01');

//     const weeks = String(item.weeks ?? item.tuanHoc ?? item.tuan ?? '1-15').trim() || '1-15';
//     const sourceFile = item.sourceFile || defaultSourceFile || undefined;

//     // Deduplication key
//     const uniqueKey = `${courseCode}__${classCode}__${dayNum}__${start}__${end}`;
//     if (seenKey.has(uniqueKey)) continue;
//     seenKey.add(uniqueKey);

//     results.push({
//       id: item.id || `sec_${courseCode}_${classCode}_${dayNum}_${start}_${idx + 1}`,
//       stt: item.stt || results.length + 1,
//       courseCode,
//       courseName,
//       classCode,
//       classType,
//       group,
//       lecturer,
//       dayOfWeek: dayNum,
//       startPeriod: start,
//       endPeriod: end,
//       room,
//       weeks,
//       credits: Number(item.credits ?? item.soTinChi ?? item.soTc) || 3,
//       sourceFile
//     });
//   }

//   return results;
// }

// /**
//  * Strict normalizer & validator for personal schedule items.
//  * Strictly verifies all fields (lecturer, room, time, subject name, class code).
//  */
// function normalizePersonalSchedule(rawList: any[]): any[] {
//   if (!Array.isArray(rawList)) return [];
//   const palette = ['indigo', 'blue', 'emerald', 'teal', 'purple', 'amber', 'rose', 'cyan'];
  
//   // Use normalizeExtractedSections for unified strict verification
//   const validatedSections = normalizeExtractedSections(rawList);

//   return validatedSections.map((sec, idx) => ({
//     id: sec.id || `sch-${Date.now()}-${idx}`,
//     subjectName: sec.courseName,
//     subjectCode: sec.courseCode,
//     classCode: sec.classCode,
//     classGroup: sec.group,
//     dayOfWeek: sec.dayOfWeek,
//     startPeriod: sec.startPeriod,
//     endPeriod: sec.endPeriod,
//     room: sec.room,
//     lecturer: sec.lecturer,
//     isLab: sec.classType === 'TH',
//     weeks: sec.weeks,
//     color: palette[idx % palette.length]
//   }));
// }

// /**
//  * Ultra-fast call to Gemini 3.7 Flash REST API with prioritized execution
//  */
// async function callGeminiRestAPI(apiKey: string, payload: any): Promise<string> {
//   const candidateModels = [
//     'gemini-3.7-flash',
//     'gemini-3.5-flash',
//     'gemini-3.1-pro',
//     'gemini-2.5-flash',
//     'gemini-2.5-pro',
//     'gemini-2.0-flash'
//   ];

//   let lastError: any = null;

//   for (const model of candidateModels) {
//     try {
//       const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       const data = await response.json();

//       if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
//         return data.candidates[0].content.parts[0].text;
//       }

//       const errMsg = data?.error?.message || `HTTP ${response.status} from ${model}`;
//       lastError = new Error(errMsg);
      
//       // If quota or not found, try next candidate model
//       if (response.status === 404 || response.status === 429 || response.status === 503) {
//         continue;
//       }
//     } catch (err: any) {
//       lastError = err;
//     }
//   }

//   throw lastError || new Error('Không thể kết nối đến Gemini 3.7 Flash API.');
// }

// export default async function handler(req: any, res: any) {
//   // Set CORS headers
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

//   if (req.method === 'OPTIONS') {
//     return res.status(204).end();
//   }

//   if (req.method !== 'POST') {
//     return res.status(405).json({ success: false, error: 'Method Not Allowed' });
//   }

//   const apiKey = process.env.GEMINI_API_KEY;
//   if (!apiKey) {
//     return res.status(500).json({ 
//       success: false, 
//       error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ. Vui lòng thiết lập biến môi trường GEMINI_API_KEY.' 
//     });
//   }

//   try {
//     const { action, payload } = req.body || {};

//     // 1. Personal Student Schedule Vision Extraction (PARSE_SCHEDULE)
//     if (action === 'PARSE_SCHEDULE') {
//       const { imageBase64, fileBase64, mimeType, textData } = payload || {};
//       const fileData = fileBase64 || imageBase64;
//       const detectedMimeType = mimeType || 'image/jpeg';

//       const systemInstruction = `Bạn là Chuyên gia Vision & Trích xuất Dữ liệu Thời khóa biểu cá nhân của sinh viên từ mọi định dạng: Ảnh chụp màn hình cổng đào tạo (daotao, UIS, edusoft), bảng lưới ma trận tuần (Weekly Matrix Grid), phiếu đăng ký môn học (PDF/Ảnh), ảnh chụp điện thoại.

// QUY TẮC TRÍCH XUẤT CHÍNH XÁC 100%:
// 1. DẠNG LƯỚI TUẦN (Weekly Matrix Grid): Đọc từng ô học phần theo Cột (Thứ 2 đến Thứ 7, Chủ Nhật) và Hàng (Tiết 1-12 hoặc Buổi Sáng/Chiều/Tối).
//    - Thứ: 2 (Thứ Hai), 3 (Thứ Ba), 4 (Thứ Tư), 5 (Thứ Năm), 6 (Thứ Sáu), 7 (Thứ Bảy), 8 (Chủ Nhật).
//    - Tiết học: Trích xuất chính xác startPeriod (1-12) và endPeriod (1-12). Nếu TKB ghi theo giờ (vd: 07:00-09:30 -> Tiết 1-3; 13:00-15:30 -> Tiết 7-9), hãy quy đổi chính xác.
// 2. DẠNG DANH SÁCH / BẢNG TỔNG HỢP: Đọc từng dòng môn học, lấy đầy đủ thông tin:
//    - Tên môn học (subjectName): Tên đầy đủ (ví dụ: "Cơ sở dữ liệu", "Kiến trúc máy tính").
//    - Mã học phần (subjectCode): Mã học phần (ví dụ: "COMP1017", "MATH1001").
//    - Mã lớp học phần (classCode): Mã lớp cụ thể (ví dụ: "2511COMP101701").
//    - Phòng học (room): Phòng thực tế (ví dụ: "D.207", "A.301", "PM3", "Online").
//    - Giảng viên (lecturer): BẮT BUỘC trích xuất họ tên và học hàm/học vị (ví dụ: "TS. Nguyễn Trần Phi Phượng", "ThS. Lê Văn A", "Thầy B").
//    - isLab: true nếu là lớp thực hành / phòng máy / lab, false nếu lý thuyết.
// 3. CHỈ TRÍCH XUẤT CÁC MÔN CÓ THỰC TRONG ẢNH/TÀI LIỆU. Không tự bịa đặt môn học.

// SCHEMA ĐẦU RA (JSON Array thuần túy):
// [
//   {
//     "subjectName": "Cơ sở dữ liệu",
//     "subjectCode": "COMP1017",
//     "classCode": "2511COMP101701",
//     "classGroup": "Lớp 01",
//     "dayOfWeek": 2,
//     "startPeriod": 1,
//     "endPeriod": 3,
//     "room": "D.207",
//     "lecturer": "TS. Nguyễn Trần Phi Phượng",
//     "isLab": false,
//     "weeks": "1-15"
//   }
// ]
// Chỉ trả về JSON Array.`;

//       const parts: any[] = [];
//       if (fileData) {
//         const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
//         parts.push({
//           inlineData: {
//             mimeType: detectedMimeType,
//             data: cleanBase64
//           }
//         });
//         parts.push({
//           text: 'Trích xuất toàn bộ các môn học trong ảnh thời khóa biểu này sang mảng JSON theo schema. Không thêm môn không có trong ảnh.'
//         });
//       } else if (textData) {
//         parts.push({
//           text: `Trích xuất lịch học từ văn bản sau (chỉ trích xuất các môn có trong văn bản):\n${textData}`
//         });
//       } else {
//         return res.status(400).json({ success: false, error: 'Thiếu dữ liệu tệp hoặc văn bản thời khóa biểu' });
//       }

//       const geminiPayload = {
//         contents: [{ role: 'user', parts }],
//         systemInstruction: { parts: [{ text: systemInstruction }] },
//         generationConfig: {
//           temperature: 0.1,
//           topP: 0.8,
//           maxOutputTokens: 8192,
//           responseMimeType: 'application/json'
//         }
//       };

//       const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
//       const parsedData = parseJsonArraySafely(responseText);
//       const normalizedData = normalizePersonalSchedule(parsedData);

//       return res.status(200).json({
//         success: true,
//         data: normalizedData,
//         message: `Đã nhận diện thành công ${normalizedData.length} môn học từ thời khóa biểu`
//       });
//     }

//     // 2. Master Schedule Relational Join Parser (PARSE_MASTER_SCHEDULE)
//     if (action === 'PARSE_MASTER_SCHEDULE') {
//       const { imageBase64, fileBase64, mimeType, fileName, textData, customPrompt, universityPreset } = payload || {};
//       const fileData = fileBase64 || imageBase64;
//       const detectedMimeType = mimeType || (fileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

//       const presetText = universityPreset ? `Quy chuẩn trường: ${universityPreset}.` : '';
//       const promptText = customPrompt ? `YÊU CẦU BỔ SUNG: ${customPrompt}` : '';

//       const systemInstruction = `Bạn là chuyên gia xử lý và ghép nối dữ liệu Thời khóa biểu đại học từ tài liệu nhiều cột phân tách.
// NHIỆM VỤ: Trích xuất CHÍNH XÁC và DUY NHẤT các lớp học phần và buổi học có trong tài liệu được cung cấp.
// TUYỆT ĐỐI CẤM BỊA ĐẶT / SUY DIỄN: Chỉ trích xuất các mục có thực trong tài liệu. Không thêm bất kỳ môn học nào ngoài tài liệu.
// ${presetText}
// ${promptText}

// RÀNG BUỘC GHÉP NỐI QUAN HỆ: Dùng STT hoặc Mã LHP làm khóa chính JOIN chính xác:
// STT, courseCode (Mã HP), classCode (Mã LHP), courseName (Tên môn), dayOfWeek (2-8, CN là 8), startPeriod (1-12), endPeriod (1-12), room (Phòng), lecturer (Giảng viên), classType ("LT" hoặc "TH"), group ("Lớp 01", "Nhóm TH 01").

// SCHEMA ĐẦU RA (JSON Array thuần túy):
// [
//   {
//     "stt": 1,
//     "courseCode": "COMP1802",
//     "classCode": "2511COMP180202",
//     "courseName": "Cấu trúc dữ liệu và giải thuật",
//     "classType": "LT",
//     "group": "Lớp 02",
//     "dayOfWeek": 2,
//     "startPeriod": 1,
//     "endPeriod": 3,
//     "room": "D.207 LVS",
//     "lecturer": "TS. Nguyễn Trần Phi Phượng",
//     "weeks": "1-15"
//   }
// ]
// Chỉ trả về JSON Array hợp lệ.`;

//       const parts: any[] = [];
//       if (fileData) {
//         const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
//         parts.push({
//           inlineData: {
//             mimeType: detectedMimeType,
//             data: cleanBase64
//           }
//         });
//         parts.push({
//           text: 'Trích xuất chính xác các lớp học phần trong tài liệu thời khóa biểu này sang JSON Array. Không tự suy diễn môn ngoài tài liệu.'
//         });
//       } else if (textData) {
//         parts.push({
//           text: `Trích xuất danh mục thời khóa biểu từ văn bản sau:\n${textData}`
//         });
//       } else {
//         return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thời khóa biểu' });
//       }

//       const geminiPayload = {
//         contents: [{ role: 'user', parts }],
//         systemInstruction: { parts: [{ text: systemInstruction }] },
//         generationConfig: {
//           temperature: 0.1,
//           topP: 0.8,
//           maxOutputTokens: 8192,
//           responseMimeType: 'application/json'
//         }
//       };

//       const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
//       const parsedData = parseJsonArraySafely(responseText);
//       const normalizedData = normalizeExtractedSections(parsedData, fileName);

//       return res.status(200).json({
//         success: true,
//         data: normalizedData,
//         message: `Đã trích xuất thành công ${normalizedData.length} lớp học phần từ tài liệu`
//       });
//     }

//     // 3. Algorithm & Big-O Analyzer (EXPLAIN_CODE)
//     if (action === 'EXPLAIN_CODE') {
//       const { code, language } = payload || {};
//       if (!code || typeof code !== 'string') {
//         return res.status(400).json({ success: false, error: 'Thiếu mã nguồn cần phân tích' });
//       }

//       const systemInstruction = `Bạn là Trợ lý AI Phân tích Thuật toán & Độ phức tạp Big-O cho sinh viên CNTT HCMUE.
// Hãy phân tích đoạn mã nguồn (ngôn ngữ: ${language || 'C++/Python/Java'}) và trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (không thêm văn bản ngoài JSON):
// {
//   "timeComplexity": "Độ phức tạp thời gian Big-O (ví dụ: O(log n), O(n), O(n log n))",
//   "spaceComplexity": "Độ phức tạp không gian Big-O (ví dụ: O(1), O(n))",
//   "isOptimal": true,
//   "spaceType": "Tại chỗ (In-place) hoặc Cần bộ nhớ phụ",
//   "dryRunSteps": [
//     { "step": 1, "desc": "Mô tả bước chạy", "variables": "Giá trị biến" }
//   ],
//   "warnings": ["Cảnh báo lỗi hoặc rủi ro tiềm ẩn"],
//   "optimizations": ["Gợi ý tối ưu hiệu năng"],
//   "edgeCases": ["Trường hợp biên cần chú ý"],
//   "summary": "Tóm tắt đánh giá ngắn gọn"
// }`;

//       const geminiPayload = {
//         contents: [
//           {
//             role: 'user',
//             parts: [{ text: `Phân tích thuật toán đoạn mã ${language || 'lập trình'} này:\n\n${code}` }]
//           }
//         ],
//         systemInstruction: { parts: [{ text: systemInstruction }] },
//         generationConfig: {
//           temperature: 0.1,
//           topP: 0.8,
//           maxOutputTokens: 4096,
//           responseMimeType: 'application/json'
//         }
//       };

//       const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
//       const parsedData = parseJsonObjectSafely(responseText);

//       return res.status(200).json({
//         success: true,
//         data: parsedData,
//         message: 'Đã phân tích mã nguồn thành công'
//       });
//     }

//     return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
//   } catch (error: any) {
//     console.error('Gemini 3.7 API Error:', error);
//     return res.status(500).json({
//       success: false,
//       error: error.message || 'Lỗi xử lý nội bộ máy chủ Gemini AI'
//     });
//   }
// }


/**
 * Vercel Serverless Function: /api/ai
 * Ultra-Fast & High-Accuracy AI Assistant Engine
 * Supports:
 * - PARSE_SCHEDULE (Personal student schedule vision extraction)
 * - PARSE_MASTER_SCHEDULE (Master course sections relational join)
 * - EXPLAIN_CODE (Compiler-grade Big-O complexity & dynamic trace)
 */

export const config = {
  maxDuration: 60,
};

function parseJsonArraySafely(rawText: string): any[] {
  if (!rawText || typeof rawText !== 'string') return [];

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

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
  } catch {}

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
      } catch {}
    }
  }

  const extractedObjects: any[] = [];
  const objectRegex = /\{[^{}]*?(?:"courseCode"|"stt"|"classCode"|"subjectCode"|"maHocPhan"|"courseName"|"subjectName")[^{}]*?\}/g;
  let match;
  while ((match = objectRegex.exec(cleaned)) !== null) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj === 'object') {
        extractedObjects.push(obj);
      }
    } catch {}
  }

  return extractedObjects;
}

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

function healCourseCode(raw: string): string {
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

function parseJsonObjectSafely(rawText: string): any {
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

function normalizeExtractedSections(rawList: any[], defaultSourceFile?: string): any[] {
  if (!Array.isArray(rawList)) return [];

  const results: any[] = [];
  const seenKey = new Set<string>();

  for (let idx = 0; idx < rawList.length; idx++) {
    const item = rawList[idx];
    if (!item || typeof item !== 'object') continue;

    let courseName = String(item.courseName ?? item.tenHocPhan ?? item.tenHp ?? item.tenMh ?? item.tenMon ?? item.subjectName ?? '').trim();
    if (!courseName || courseName.length < 2 || isHeaderOrNoiseString(courseName)) {
      continue;
    }

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

    let start = Number(item.startPeriod ?? item.tietBatDau ?? item.tietBd ?? item.tiet_bd ?? item.tietStart ?? 0);
    let end = Number(item.endPeriod ?? item.tietKetThuc ?? item.tietKt ?? item.tiet_kt ?? item.tietEnd ?? 0);

    const periodCombined = String(item.periodCombined ?? item.tietHoc ?? item.tiet ?? '').trim();
    if ((!start || !end) && periodCombined) {
      const matchPeriod = periodCombined.match(/(\d{1,2})\s*[-–—>to]+\s*(\d{1,2})/i);
      if (matchPeriod) {
        start = parseInt(matchPeriod[1], 10);
        end = parseInt(matchPeriod[2], 10);
      }
    }

    if (!start || isNaN(start) || start < 1 || start > 12) {
      continue;
    }
    if (!end || isNaN(end) || end < start || end > 12) {
      end = Math.min(12, start + 2);
    }
    if (end - start + 1 > 4) {
      end = start + 2;
    }

    const rawLecturer = item.lecturer ?? item.giangVien ?? item.cbgd ?? item.canBoGiangDay ?? item.hoTenGv ?? item.gv ?? '';
    const lecturer = cleanLecturerName(rawLecturer);
    if (!lecturer) {
      continue;
    }

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

function normalizePersonalSchedule(rawList: any[]): any[] {
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

/**
 * Gọi REST API tới Gemini ổn định với AbortController
 */
async function callGemini(apiKey: string, payload: any, timeoutMs: number = 15000): Promise<string> {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      lastError = new Error(data?.error?.message || `HTTP ${response.status} from ${model}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến máy chủ AI.');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ.'
    });
  }

  try {
    const body = req.body || {};
    const rawAction = body.action || '';
    const action = rawAction.toUpperCase();
    const payload = body.payload || body;

    // =========================================================================
    // 1. PERSONAL SCHEDULE EXTRACTION (PARSE_SCHEDULE)
    // =========================================================================
    if (action === 'PARSE_SCHEDULE' || rawAction === 'parseSchedule') {
      const { imageBase64, fileBase64, mimeType, textData } = payload || {};
      const fileData = fileBase64 || imageBase64;
      const detectedMimeType = mimeType || 'image/jpeg';

      const systemInstruction = `Trích xuất dữ liệu Thời khóa biểu cá nhân sang JSON Array:
[
  {
    "subjectName": "Cơ sở dữ liệu",
    "subjectCode": "COMP1017",
    "classCode": "2511COMP101701",
    "classGroup": "Lớp 01",
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "room": "D.207",
    "lecturer": "TS. Nguyễn Trần Phi Phượng",
    "isLab": false,
    "weeks": "1-15"
  }
]`;

      const parts: any[] = [];
      if (fileData) {
        parts.push({
          inlineData: {
            mimeType: detectedMimeType,
            data: fileData.replace(/^data:[^;]+;base64,/, '')
          }
        });
        parts.push({ text: 'Trích xuất toàn bộ môn học trong ảnh sang mảng JSON.' });
      } else if (textData) {
        parts.push({ text: `Trích xuất lịch học từ văn bản sau:\n${textData}` });
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thời khóa biểu' });
      }

      const geminiPayload = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGemini(apiKey, geminiPayload, 20000);
      const parsedData = parseJsonArraySafely(responseText);
      const normalizedData = normalizePersonalSchedule(parsedData);

      return res.status(200).json({
        success: true,
        data: normalizedData,
        message: `Đã nhận diện thành công ${normalizedData.length} môn học`
      });
    }

    // =========================================================================
    // 2. MASTER SCHEDULE RELATIONAL JOIN (PARSE_MASTER_SCHEDULE)
    // =========================================================================
    if (action === 'PARSE_MASTER_SCHEDULE' || rawAction === 'parseMasterSchedule') {
      const { imageBase64, fileBase64, mimeType, fileName, textData, customPrompt, universityPreset } = payload || {};
      const fileData = fileBase64 || imageBase64;
      const detectedMimeType = mimeType || (fileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const presetText = universityPreset ? `Quy chuẩn trường: ${universityPreset}.` : '';
      const promptText = customPrompt ? `YÊU CẦU BỔ SUNG: ${customPrompt}` : '';

      const systemInstruction = `Trích xuất các lớp học phần từ tài liệu thời khóa biểu sang JSON Array:
${presetText}
${promptText}
SCHEMA:
[
  {
    "stt": 1,
    "courseCode": "COMP1802",
    "classCode": "2511COMP180202",
    "courseName": "Cấu trúc dữ liệu và giải thuật",
    "classType": "LT",
    "group": "Lớp 02",
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "room": "D.207 LVS",
    "lecturer": "TS. Nguyễn Trần Phi Phượng",
    "weeks": "1-15"
  }
]`;

      const parts: any[] = [];
      if (fileData) {
        parts.push({
          inlineData: {
            mimeType: detectedMimeType,
            data: fileData.replace(/^data:[^;]+;base64,/, '')
          }
        });
        parts.push({ text: 'Trích xuất chính xác các lớp học phần sang JSON Array.' });
      } else if (textData) {
        parts.push({ text: `Trích xuất danh mục thời khóa biểu từ văn bản:\n${textData}` });
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thời khóa biểu' });
      }

      const geminiPayload = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGemini(apiKey, geminiPayload, 30000);
      const parsedData = parseJsonArraySafely(responseText);
      const normalizedData = normalizeExtractedSections(parsedData, fileName);

      return res.status(200).json({
        success: true,
        data: normalizedData,
        message: `Đã trích xuất thành công ${normalizedData.length} lớp học phần`
      });
    }

    // =========================================================================
    // 3. PHÂN TÍCH THUẬT TOÁN CHÍNH XÁC THEO CODE (EXPLAIN_CODE)
    // =========================================================================
    if (action === 'EXPLAIN_CODE' || rawAction === 'explainCode') {
      const { code, language } = payload || {};
      if (!code || typeof code !== 'string' || !code.trim()) {
        return res.status(400).json({ success: false, error: 'Thiếu mã nguồn cần phân tích' });
      }

      const systemInstruction = `Bạn là Trợ lý Chuyên gia Phân tích Thuật toán & Trình biên dịch C++/Python/Java của FIT HCMUE.
Hãy đọc kỹ và phân tích CHÍNH XÁC đoạn mã nguồn sau:

\`\`\`${language || 'cpp'}
${code}
\`\`\`

YÊU CẦU:
1. timeComplexity: Tính toán chính xác độ phức tạp Worst-case Big-O dựa trên các vòng lặp và lời gọi đệ quy thực tế trong code (VD: O(1), O(log n), O(n), O(n log n), O(n²), O(2^n)).
2. spaceComplexity: Tính bộ nhớ phụ trợ Auxiliary Space (stack đệ quy, mảng phụ).
3. isOptimal: boolean (true nếu đã tối ưu, false nếu còn giải thuật tốt hơn).
4. spaceType: Chuỗi mô tả (VD: "Tại chỗ (In-place)" hoặc "Bộ nhớ phụ trợ O(...)").
5. dryRunSteps: Tự tạo 1 bộ dữ liệu đầu vào nhỏ cụ thể khớp với bài toán của đoạn code này và mô phỏng 3-5 bước chạy thực tế. Cột variables phải ghi rõ giá trị các biến tương ứng.
6. warnings: Chỉ ra các lỗi tiềm ẩn thực tế trong đoạn mã này (tràn số, thiếu điều kiện biên, lỗi con trỏ, lặp vô tận).
7. optimizations: Đề xuất cải tiến giải thuật hoặc cấu trúc dữ liệu tối ưu hơn.
8. edgeCases: Các trường hợp biên cần kiểm tra (mảng rỗng, 1 phần tử, số âm, trùng lặp).
9. summary: Tóm tắt nhận xét giải thuật ngắn gọn trong 1 câu.

TRẢ VỀ DUY NHẤT MỘT JSON OBJECT:
{
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "isOptimal": true,
  "spaceType": "...",
  "dryRunSteps": [{"step": 1, "desc": "...", "variables": "..."}],
  "warnings": ["..."],
  "optimizations": ["..."],
  "edgeCases": ["..."],
  "summary": "..."
}`;

      const geminiPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `Phân tích thuật toán mã nguồn ${language || 'lập trình'} này:\n\n${code}` }]
          }
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGemini(apiKey, geminiPayload, 12000);
      const parsedData = parseJsonObjectSafely(responseText);

      return res.status(200).json({
        success: true,
        data: parsedData,
        message: 'Đã phân tích mã nguồn thành công'
      });
    }

    return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nội bộ máy chủ Gemini AI'
    });
  }
}
