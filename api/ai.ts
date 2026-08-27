/**
 * Vercel Serverless Function: /api/ai
 * Complete synchronization with server.ts AI capabilities.
 * Supports:
 * - PARSE_MASTER_SCHEDULE (TKB Tổng đa định dạng PDF / Ảnh / Text)
 * - PARSE_SCHEDULE (Lịch học cá nhân sinh viên)
 * - EXPLAIN_CODE (Phân tích Big-O, Dry-Run & Tối ưu hóa mã nguồn)
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
  const objectRegex = /\{[^{}]*?(?:"courseCode"|"stt"|"classCode"|"maHocPhan"|"courseName")[^{}]*?\}/g;
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

    const courseCode = String(item.courseCode ?? item.maHocPhan ?? item.maHp ?? item.maMh ?? item.maMon ?? `HP_${idx + 1}`).trim();
    const courseName = String(item.courseName ?? item.tenHocPhan ?? item.tenHp ?? item.tenMh ?? item.tenMon ?? courseCode).trim();
    const rawGroup = String(item.group ?? item.nhom ?? item.nhomTh ?? item.to ?? 'Lớp 01').trim();
    const classCode = String(item.classCode ?? item.maLopHocPhan ?? item.maLhp ?? item.maLop ?? `${courseCode}_${rawGroup}`).trim();
    
    const rawType = String(item.classType ?? item.loaiHocPhan ?? item.loaiLhp ?? item.loaiLop ?? '').toUpperCase();
    const rawRoom = String(item.room ?? item.phongHoc ?? item.phongMay ?? item.lab ?? item.phong ?? '').trim();
    const isTH = rawType.includes('TH') || rawType.includes('LAB') || rawGroup.toUpperCase().includes('TH') || classCode.toUpperCase().includes('TH') || classCode.toUpperCase().includes('LAB') || rawRoom.toUpperCase().includes('LAB') || rawRoom.toUpperCase().includes('PM');
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

/**
 * Robust REST API caller that iterates through valid Gemini models on Google Generative Language API
 */
async function callGeminiRestAPI(apiKey: string, payload: any): Promise<any> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
    'gemini-flash-latest'
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

      // If model not found or quota exhausted on this specific model, try next model
      lastError = new Error(data?.error?.message || `Lỗi HTTP ${response.status} với mô hình ${model}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến bất kỳ mô hình Gemini nào.');
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

    if (action === 'PARSE_MASTER_SCHEDULE' || action === 'PARSE_SCHEDULE') {
      const { imageBase64, fileBase64, mimeType, fileName, textData, customPrompt, universityPreset } = payload || {};
      const fileData = fileBase64 || imageBase64;
      const detectedMimeType = mimeType || (fileName?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const presetText = universityPreset ? `Quy chuẩn trường: ${universityPreset}.` : '';
      const promptText = customPrompt ? `YÊU CẦU BỔ SUNG: ${customPrompt}` : '';

      const systemInstruction = `Bạn là chuyên gia xử lý và ghép nối dữ liệu Thời khóa biểu đại học từ tài liệu (File PDF, Excel, bảng ảnh, văn bản) có cấu trúc phân tách cột hoặc nhiều khối phân đoạn.
Nhiệm vụ: Phân tích TOÀN BỘ tài liệu thời khóa biểu và trích xuất TẤT CẢ các lớp học phần cùng TẤT CẢ các buổi học thành một JSON Array chuẩn xác 100%.
${presetText}
${promptText}

NGUYÊN TẮC BẮT BUỘC: THỰC HIỆN RELATIONAL JOIN TUYỆT ĐỐI THEO KHÓA CHÍNH 'STT' HOẶC 'MÃ LỚP HỌC PHẦN'
1. STT / Mã LHP làm khóa chính để JOIN chính xác STT, Mã HP (courseCode), Mã LHP (classCode), Tên môn (courseName), Thứ (dayOfWeek: 2-8, CN là 8), Tiết bắt đầu (startPeriod: 1-12), Tiết kết thúc (endPeriod: 1-12), Phòng học (room), Giảng viên (lecturer).
2. TUYỆT ĐỐI CẤM LỆCH DÒNG / LỆCH CỘT. Nếu ô trống gán "Chưa phân công" / "Chưa xếp phòng".
3. MÃ LỚP HỌC PHẦN: classCode là mã đầy đủ (ví dụ "2511COMP180202"), courseCode là mã môn (ví dụ "COMP1802").
4. THỨ VÀ TIẾT HỌC: Thứ 2 = 2, ..., Thứ 7 = 7, Chủ Nhật = 8. startPeriod, endPeriod là số nguyên từ 1 đến 12.

SCHEMA ĐẦU RA (Chỉ trả về DUY NHẤT một mảng JSON thuần túy):
[
  {
    "stt": 1,
    "courseCode": "COMP1802",
    "classCode": "2511COMP180202",
    "courseName": "Cấu trúc dữ liệu và giải thuật",
    "credits": 3,
    "classType": "LT",
    "group": "Lớp 02 (LT)",
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "room": "D.207 LVS",
    "lecturer": "TS. Nguyễn Trần Phi Phượng",
    "weeks": "1-15"
  }
]
Chỉ trả về DUY NHẤT một JSON Array hợp lệ. Tuyệt đối không thêm bất kỳ văn bản ngoài JSON.`;

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
          text: 'Hãy đọc toàn bộ tài liệu thời khóa biểu này và trích xuất tất cả các lớp học phần với đầy đủ mã lớp, giảng viên, thứ, tiết học và phòng học theo đúng cấu trúc JSON Array.'
        });
      } else if (textData) {
        parts.push({
          text: `Hãy trích xuất danh mục thời khóa biểu từ văn bản/bảng dữ liệu sau:\n${textData}`
        });
      } else {
        return res.status(400).json({ error: 'Thiếu dữ liệu tệp hoặc văn bản thời khóa biểu' });
      }

      const geminiPayload = {
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.05,
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
      const parsedData = parseJsonArraySafely(responseText);
      const normalizedData = normalizeExtractedSections(parsedData, fileName);

      return res.status(200).json({
        success: true,
        data: normalizedData,
        message: 'Đã trích xuất thời khóa biểu bằng Gemini AI thành công'
      });
    }

    if (action === 'EXPLAIN_CODE') {
      const { code, language } = payload || {};
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Thiếu mã nguồn cần phân tích' });
      }

      const systemInstruction = `Bạn là Trợ lý AI Phân tích Thuật toán & Độ phức tạp Big-O cho sinh viên CNTT HCMUE.
Hãy phân tích đoạn mã nguồn (ngôn ngữ: ${language || 'C++/Python/Java'}) và trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (không thêm văn bản ngoài JSON):
{
  "timeComplexity": "Độ phức tạp thời gian Big-O, vd: O(log n), O(n), O(n²)",
  "spaceComplexity": "Độ phức tạp không gian Big-O, vd: O(1), O(n)",
  "isOptimal": true,
  "spaceType": "Tại chỗ (In-place) hoặc Cần bộ nhớ phụ",
  "dryRunSteps": [
    { "step": 1, "desc": "Mô tả bước chạy", "variables": "Giá trị biến ở bước này" }
  ],
  "warnings": ["Cảnh báo lỗi tiềm ẩn"],
  "optimizations": ["Gợi ý tối ưu"],
  "edgeCases": ["Trường hợp biên"],
  "summary": "Đánh giá tổng quan súc tích 1-2 câu"
}
Giải thích 100% tiếng Việt chuẩn học thuật, súc tích.`;

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
          responseMimeType: 'application/json'
        }
      };

      const responseText = await callGeminiRestAPI(apiKey, geminiPayload);
      const parsedData = parseJsonObjectSafely(responseText);

      return res.status(200).json({
        success: true,
        data: parsedData,
        message: 'Đã phân tích mã nguồn siêu tốc thành công'
      });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nội bộ máy chủ'
    });
  }
}
