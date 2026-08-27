export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel.' });
  }

  try {
    const { 
      contents,               // Toàn bộ mảng lịch sử [{ role: 'user'|'model', parts: [{ text }] }]
      prompt,                 // Câu hỏi đơn (nếu không truyền contents)
      systemInstruction,      // Bộ luật / Prompt định danh của AI Studio
      jsonMode = false,       // Bật true nếu cần AI trả về JSON chuẩn
      temperature = 0.2       // Mức nhiệt độ thấp giúp AI suy luận chính xác, bám sát logic
    } = req.body || {};

    // Chuẩn hóa nội dung gửi lên Gemini
    let requestContents = contents;
    if (!requestContents && prompt) {
      requestContents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    if (!requestContents || requestContents.length === 0) {
      return res.status(400).json({ error: 'Thiếu dữ liệu prompt/contents.' });
    }

    const payload: any = {
      contents: requestContents,
      generationConfig: {
        temperature: temperature,
        topP: 0.95,
      }
    };

    // Ép kiểu JSON nếu tính năng yêu cầu dữ liệu có cấu trúc
    if (jsonMode) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    // Gắn System Instruction nếu có
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Lỗi xử lý từ Gemini API.' 
      });
    }

    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ result: outputText });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}
