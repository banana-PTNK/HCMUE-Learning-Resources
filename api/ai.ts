/**
 * Vercel Serverless Function: /api/ai
 * Ultra-Fast AI Assistant Engine powered by Gemini 3.7 Flash
 * Supports:
 * - PARSE_SCHEDULE (Personal student schedule vision extraction)
 * - PARSE_MASTER_SCHEDULE (Master course sections relational join)
 * - EXPLAIN_CODE (Big-O complexity, dry-run simulation & optimizations)
 */

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

  if (extractedObjects.length > 0) {
    return extractedObjects;
  }

  return [];
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
  return rawList.map((item, idx) => {
    let day = item.dayOfWeek ?? item.thu ?? item.day ?? item.thuHoc ?? 2;
    if (typeof day === 'string') {
      const lower = day.toLowerCase().trim();
      if (lower.includes('hai') || lower === '2' || lower.includes('t2') || lower.includes('thứ 2')) day = 2;
      else if (lower.includes('ba') || lower === '3' || lower.includes('t3') || lower.includes('thứ 3')) day = 3;
      else if (lower.includes('tư') || lower.includes('tu') || lower.includes('bon') || lower === '4' || lower.includes('t4') || lower.includes('thứ 4')) day = 4;
      else if (lower.includes('năm') || lower.includes('nam') || lower === '5' || lower.includes('t5') || lower.includes('thứ 5')) day = 5;
      else if (lower.includes('sáu') || lower.includes('sau') || lower === '6' || lower.includes('t6') || lower.includes('thứ 6')) day = 6;
      else if (lower.includes('bảy') || lower.includes('bay') || lower === '7' || lower.includes('t7') || lower.includes('thứ 7')) day = 7;
      else if (lower.includes('nhật') || lower.includes('nhat') || lower.includes('cn') || lower === '8' || lower === '1' || lower.includes('chủ nhật')) day = 8;
      else day = 2;
    }

    let start = Number(item.startPeriod ?? item.tietBatDau ?? item.tietBd ?? item.tiet_bd ?? item.tietStart ?? 1) || 1;
    let end = Number(item.endPeriod ?? item.tietKetThuc ?? item.tietKt ?? item.tiet_kt ?? item.tietEnd ?? (start + (Number(item.soTiet ?? item.periodCount ?? item.so_tiet) || 3) - 1)) || (start + 2);
    if (start < 1) start = 1;
    if (start > 12) start = 12;
    if (end < start) end = start;
    if (end > 12) end = 12;

    const courseCode = String(item.courseCode ?? item.maHocPhan ?? item.maHp ?? item.maMh ?? item.maMon ?? item.subjectCode ?? `HP_${idx + 1}`).trim();
    const courseName = String(item.courseName ?? item.tenHocPhan ?? item.tenHp ?? item.tenMh ?? item.tenMon ?? item.subjectName ?? courseCode).trim();
    const rawGroup = String(item.group ?? item.nhom ?? item.nhomTh ?? item.to ?? item.classGroup ?? 'Lớp 01').trim();
    const classCode = String(item.classCode ?? item.maLopHocPhan ?? item.maLhp ?? item.maLop ?? `${courseCode}_${rawGroup}`).trim();
    
    const rawType = String(item.classType ?? item.loaiHocPhan ?? item.loaiLhp ?? item.loaiLop ?? '').toUpperCase();
    const rawRoom = String(item.room ?? item.phongHoc ?? item.phongMay ?? item.lab ?? item.phong ?? '').trim();
    const isTH = item.isLab === true || rawType.includes('TH') || rawType.includes('LAB') || rawGroup.toUpperCase().includes('TH') || classCode.toUpperCase().includes('TH') || classCode.toUpperCase().includes('LAB') || rawRoom.toUpperCase().includes('LAB') || rawRoom.toUpperCase().includes('PM');
    const classType = isTH ? 'TH' : 'LT';
    const group = rawGroup || (classType === 'TH' ? 'Nhóm TH 01' : 'Lớp 01');
    
    let lecturer = String(item.lecturer ?? item.giangVien ?? item.cbgd ?? item.canBoGiangDay ?? item.hoTenGv ?? item.gv ?? '').trim();
    if (!lecturer || lecturer === '-' || lecturer === '--' || lecturer.toLowerCase() === 'null' || lecturer.toLowerCase() === 'undefined') {
      lecturer = 'Chưa phân công';
    }

    let room = rawRoom;
    if (!room || room === '-' || room === '--' || room.toLowerCase() === 'null' || room.toLowerCase() === 'undefined') {
      room = 'Chưa xếp phòng';
    }

    const weeks = String(item.weeks ?? item.tuanHoc ?? item.tuan ?? '1-15').trim();
    const sourceFile = item.sourceFile || defaultSourceFile || undefined;

    return {
      courseCode,
      courseName,
      classCode,
      classType,
      group,
      lecturer,
      dayOfWeek: Number(day) || 2,
      startPeriod: start,
      endPeriod: end,
      room,
      weeks: weeks || '1-15',
      sourceFile
    };
  });
}

function normalizePersonalSchedule(rawList: any[]): any[] {
  if (!Array.isArray(rawList)) return [];
  const palette = ['blue', 'emerald', 'indigo', 'purple', 'amber', 'rose'];
  return rawList.map((item, idx) => {
    let day = Number(item.dayOfWeek ?? item.thu ?? 2);
    if (day < 2 || day > 8) day = 2;

    let start = Number(item.startPeriod ?? item.tietBatDau ?? 1);
    let end = Number(item.endPeriod ?? item.tietKetThuc ?? start + 2);
    if (start < 1) start = 1;
    if (start > 12) start = 12;
    if (end < start) end = start;
    if (end > 12) end = 12;

    return {
      id: item.id || `sch-${Date.now()}-${idx}`,
      subjectName: String(item.subjectName || item.courseName || item.tenMon || 'Môn học').trim(),
      subjectCode: String(item.subjectCode || item.courseCode || item.maMon || 'COMP1000').trim(),
      dayOfWeek: day,
      startPeriod: start,
      endPeriod: end,
      room: String(item.room || item.phongHoc || 'Chưa xếp phòng').trim(),
      lecturer: String(item.lecturer || item.giangVien || 'Chưa phân công').trim(),
      classGroup: String(item.classGroup || item.group || item.nhom || '').trim(),
      isLab: Boolean(item.isLab),
      color: item.color || palette[idx % palette.length]
    };
  });
}

/**
 * Ultra-fast call to Gemini 3.7 Flash REST API with prioritized execution
 */
async function callGeminiRestAPI(apiKey: string, payload: any): Promise<string> {
  // Primary target: gemini-3.7-flash with rapid fallback chain
  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      const errMsg = data?.error?.message || `HTTP ${response.status} from ${model}`;
      lastError = new Error(errMsg);
      
      // If quota or not found, try next model immediately
      if (response.status === 404 || response.status === 429) {
        continue;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến Gemini 3.7 Flash API.');
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel Environment Variables.' 
    });
  }

  try {
    const { action, payload } = req.body || {};

    // 1. Personal Student Schedule Vision Extraction (PARSE_SCHEDULE)
    if (action === 'PARSE_SCHEDULE') {
      const { imageBase64, fileBase64, mimeType, textData } = payload || {};
      const fileData = fileBase64 || imageBase64;
      const detectedMimeType = mimeType || 'image/jpeg';

      const systemInstruction = `Bạn là Trợ lý Vision trích xuất thời khóa biểu cá nhân của sinh viên.
Hãy đọc ảnh/dữ liệu và trả về DUY NHẤT một mảng JSON các môn học theo schema:
[
  {
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "subjectName": "Tên môn học",
    "subjectCode": "Mã học phần",
    "room": "Phòng học",
    "lecturer": "Giảng viên",
    "isLab": false
  }
]
Quy tắc:
- dayOfWeek: 2 (Thứ 2) đến 8 (Chủ nhật).
- startPeriod và endPeriod: số nguyên từ 1 đến 12.
- isLab: true nếu là tiết thực hành / phòng máy / LAB, false nếu lý thuyết.
Chỉ trả về JSON thuần túy, không thêm bất kỳ văn bản nào khác.`;

      const parts: any[] = [];
      if (fileData) {
        const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanBase64
          }
        });
        parts.push({
          text: 'Trích xuất toàn bộ thời khóa biểu cá nhân trong ảnh sang mảng JSON theo schema.'
        });
      } else if (textData) {
        parts.push({
          text: `Trích xuất lịch học từ văn bản sau:\n${textData}`
        });
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu tệp hoặc văn bản thời khóa biểu' });
      }

      const geminiPayload = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
      const parsedData = parseJsonArraySafely(responseText);
      const normalizedData = normalizePersonalSchedule(parsedData);

      return res.status(200).json({
        success: true,
        data: normalizedData,
        message: 'Đã nhận diện thời khóa biểu cá nhân thành công'
      });
    }

    // 2. Master Schedule Relational Join Parser (PARSE_MASTER_SCHEDULE)
    if (action === 'PARSE_MASTER_SCHEDULE') {
      const { imageBase64, fileBase64, mimeType, fileName, textData, customPrompt, universityPreset } = payload || {};
      const fileData = fileBase64 || imageBase64;
      const detectedMimeType = mimeType || (fileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const presetText = universityPreset ? `Quy chuẩn trường: ${universityPreset}.` : '';
      const promptText = customPrompt ? `YÊU CẦU BỔ SUNG: ${customPrompt}` : '';

      const systemInstruction = `Bạn là chuyên gia xử lý và ghép nối dữ liệu Thời khóa biểu đại học từ tài liệu nhiều cột phân tách.
Nhiệm vụ: Trích xuất TẤT CẢ các lớp học phần và buổi học thành JSON Array chuẩn 100%.
${presetText}
${promptText}

RÀNG BUỘC: Dùng STT hoặc Mã LHP làm khóa chính JOIN chính xác:
STT, courseCode (Mã HP), classCode (Mã LHP), courseName (Tên môn), dayOfWeek (2-8, CN là 8), startPeriod (1-12), endPeriod (1-12), room (Phòng), lecturer (Giảng viên), classType ("LT" hoặc "TH"), group ("Lớp 01", "Nhóm TH 01").

SCHEMA ĐẦU RA (JSON Array thuần túy):
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
]
Chỉ trả về JSON Array hợp lệ.`;

      const parts: any[] = [];
      if (fileData) {
        const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: detectedMimeType,
            data: cleanBase64
          }
        });
        parts.push({
          text: 'Trích xuất toàn bộ tài liệu thời khóa biểu này sang JSON Array.'
        });
      } else if (textData) {
        parts.push({
          text: `Trích xuất danh mục thời khóa biểu từ văn bản sau:\n${textData}`
        });
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu thời khóa biểu' });
      }

      const geminiPayload = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
      const parsedData = parseJsonArraySafely(responseText);
      const normalizedData = normalizeExtractedSections(parsedData, fileName);

      return res.status(200).json({
        success: true,
        data: normalizedData,
        message: 'Đã trích xuất thời khóa biểu thành công'
      });
    }

    // 3. Algorithm & Big-O Analyzer (EXPLAIN_CODE)
    if (action === 'EXPLAIN_CODE') {
      const { code, language } = payload || {};
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Thiếu mã nguồn cần phân tích' });
      }

      const systemInstruction = `Bạn là Trợ lý AI Phân tích Thuật toán & Độ phức tạp Big-O cho sinh viên CNTT HCMUE.
Hãy phân tích đoạn mã nguồn (ngôn ngữ: ${language || 'C++/Python/Java'}) và trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (không thêm văn bản ngoài JSON):
{
  "timeComplexity": "Độ phức tạp thời gian Big-O (ví dụ: O(log n), O(n), O(n log n))",
  "spaceComplexity": "Độ phức tạp không gian Big-O (ví dụ: O(1), O(n))",
  "isOptimal": true,
  "spaceType": "Tại chỗ (In-place) hoặc Cần bộ nhớ phụ",
  "dryRunSteps": [
    { "step": 1, "desc": "Mô tả bước chạy", "variables": "Giá trị biến" }
  ],
  "warnings": ["Cảnh báo lỗi hoặc rủi ro tiềm ẩn"],
  "optimizations": ["Gợi ý tối ưu hiệu năng"],
  "edgeCases": ["Trường hợp biên cần chú ý"],
  "summary": "Tóm tắt đánh giá ngắn gọn"
}`;

      const geminiPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `Phân tích thuật toán đoạn mã ${language || 'lập trình'} này:\n\n${code}` }]
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

      const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
      const parsedData = parseJsonObjectSafely(responseText);

      return res.status(200).json({
        success: true,
        data: parsedData,
        message: 'Đã phân tích mã nguồn thành công'
      });
    }

    return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
  } catch (error: any) {
    console.error('Gemini 3.7 API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nội bộ máy chủ Gemini AI'
    });
  }
}
