/**
 * Vercel Serverless Function: /api/ai/analyze
 * Generic Gemini API handler with multi-model fallback and JSON mode support
 */

async function callGeminiRestAPI(apiKey: string, payload: any): Promise<any> {
  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
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

      lastError = new Error(data?.error?.message || `Lỗi HTTP ${response.status} với mô hình ${model}`);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến bất kỳ mô hình Gemini nào.');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel Environment Variables.' });
  }

  try {
    const { 
      contents,
      prompt,
      systemInstruction,
      jsonMode = false,
      temperature = 0.2
    } = req.body || {};

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

    if (jsonMode) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const outputText = await callGeminiRestAPI(apiKey, payload);
    return res.status(200).json({ result: outputText });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + error.message });
  }
}
