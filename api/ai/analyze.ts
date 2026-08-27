export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel.' });
  }

  try {
    const { prompt, systemInstruction } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt không được để trống.' });
    }

    const payload: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // Gọi trực tiếp Google Gemini REST API v1beta
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
        error: data.error?.message || 'Lỗi phản hồi từ Gemini API.' 
      });
    }

    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ result: outputText });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}
