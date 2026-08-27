export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel.' });
  }

  try {
    const { action, payload } = req.body || {};
    const parts: any[] = [];
    let systemInstruction = '';

    // 1. Xử lý dữ liệu đa phương tiện (Ảnh / PDF Base64) nếu có
    const rawBase64 = payload?.imageBase64 || payload?.fileBase64;
    if (rawBase64) {
      // Loại bỏ tiền tố "data:...;base64," nếu frontend truyền kèm
      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
      const mimeType = payload.mimeType || 'image/jpeg';
      
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64
        }
      });
    }

    // 2. Phân loại nghiệp vụ và thiết lập Prompt / Schema
    if (action === 'EXPLAIN_CODE') {
      systemInstruction = `Bạn là trợ lý AI chuyên gia thuật toán và tối ưu hóa code (C++, Python, Java). Hãy phân tích đoạn mã và trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (không thêm bất kỳ văn bản ngoài JSON):
{
  "timeComplexity": "chuỗi (ví dụ: O(n log n))",
  "spaceComplexity": "chuỗi (ví dụ: O(1))",
  "isOptimal": boolean,
  "spaceType": "chuỗi",
  "dryRunSteps": [{"step": number, "desc": "mô tả", "variables": "giá trị biến"}],
  "warnings": ["cảnh báo"],
  "optimizations": ["gợi ý tối ưu"],
  "edgeCases": ["trường hợp biên"],
  "summary": "tóm tắt ngắn gọn"
}`;
      parts.push({
        text: `Ngôn ngữ: ${payload?.language || 'C++'}\nCode cần phân tích:\n${payload?.code || ''}`
      });
    } 
    else if (action === 'PARSE_SCHEDULE') {
      systemInstruction = `Bạn là chuyên gia trích xuất thời khóa biểu sinh viên. Hãy đọc dữ liệu hình ảnh hoặc văn bản được cung cấp và trả về DUY NHẤT một mảng JSON các môn học theo schema:
[
  {
    "id": "mã_tự_sinh",
    "subjectName": "Tên môn học",
    "subjectCode": "Mã học phần",
    "dayOfWeek": 2,
    "startPeriod": 1,
    "endPeriod": 3,
    "room": "Phòng học",
    "lecturer": "Giảng viên phụ trách",
    "classGroup": "Mã nhóm/lớp",
    "isLab": false,
    "color": "blue"
  }
]
Quy ước: dayOfWeek là số từ 2 (Thứ 2) đến 8 (Chủ nhật). startPeriod và endPeriod từ tiết 1 đến 12. color chọn một trong: "blue", "emerald", "indigo", "purple".`;
      parts.push({
        text: payload?.textData || 'Trích xuất toàn bộ lịch học trong file/ảnh được đính kèm sang mảng JSON.'
      });
    } 
    else if (action === 'PARSE_MASTER_SCHEDULE') {
      systemInstruction = `Bạn là trợ lý phân tích danh mục toàn bộ các lớp học phần mở trong học kỳ sang JSON mảng các MasterCourseSection. Chỉ trả về mảng JSON thuần.`;
      parts.push({
        text: payload?.textData || payload?.customPrompt || 'Phân tích danh mục lớp học phần được cung cấp sang JSON.'
      });
    } 
    else {
      return res.status(400).json({ success: false, error: 'Action không hợp lệ.' });
    }

    // 3. Gửi yêu cầu đến Gemini API
    const geminiPayload = {
      contents: [{ role: 'user', parts: parts }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Lỗi xử lý từ Gemini API');
    }

    // 4. Bóc tách và làm sạch JSON an toàn
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(rawText);

    return res.status(200).json({
      success: true,
      data: parsedData,
      isMock: false
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nội bộ máy chủ'
    });
  }
}
