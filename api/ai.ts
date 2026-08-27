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

    let systemInstruction = '';
    let userPrompt = '';

    if (action === 'EXPLAIN_CODE') {
      systemInstruction = `Bạn là chuyên gia thuật toán và tối ưu hóa mã nguồn (C++, Java, Python). Phân tích mã nguồn và trả về JSON DUY NHẤT theo đúng schema:
{
  "timeComplexity": "chuỗi (ví dụ: O(n log n))",
  "spaceComplexity": "chuỗi (ví dụ: O(1))",
  "isOptimal": boolean,
  "spaceType": "chuỗi",
  "dryRunSteps": [{"step": number, "desc": "mô tả", "variables": "giá trị biến"}],
  "warnings": ["cảnh báo"],
  "optimizations": ["gợi ý tối ưu"],
  "edgeCases": ["trường hợp biên"],
  "summary": "tóm tắt thuật toán"
}`;
      userPrompt = `Ngôn ngữ: ${payload.language || 'C++'}\nCode cần phân tích:\n${payload.code}`;
    } 
    else if (action === 'PARSE_SCHEDULE') {
      systemInstruction = `Bạn là trợ lý trích xuất thời khóa biểu sinh viên sang JSON DUY NHẤT dạng mảng các môn học theo schema:
[
  {
    "id": "chuỗi_duy_nhat",
    "subjectName": "Tên môn",
    "subjectCode": "Mã môn",
    "dayOfWeek": number (2 = Thứ 2, ..., 8 = Chủ nhật),
    "startPeriod": number (tiết bắt đầu 1-12),
    "endPeriod": number (tiết kết thúc 1-12),
    "room": "Phòng học",
    "lecturer": "Giảng viên",
    "classGroup": "Mã lớp",
    "isLab": boolean,
    "color": "blue" | "emerald" | "indigo" | "purple"
  }
]`;
      userPrompt = payload.textData || 'Trích xuất thời khóa biểu từ dữ liệu đầu vào.';
    } 
    else if (action === 'PARSE_MASTER_SCHEDULE') {
      systemInstruction = `Bạn là trợ lý phân tích danh mục lịch mở lớp học phần đại học sang JSON mảng danh sách lớp.`;
      userPrompt = payload.textData || payload.customPrompt || 'Trích xuất danh mục lớp học phần.';
    } 
    else {
      return res.status(400).json({ success: false, error: 'Action không hợp lệ.' });
    }

    const geminiPayload = {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
      throw new Error(data.error?.message || 'Lỗi từ Gemini API');
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsedData = JSON.parse(rawText);

    return res.status(200).json({
      success: true,
      data: parsedData,
      isMock: false
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
