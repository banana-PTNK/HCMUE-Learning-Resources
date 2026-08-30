import { aiService } from '../server/services/ai.service';

export const config = {
  maxDuration: 60,
};

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

  try {
    const { action, payload } = req.body || {};

    if (action === 'PARSE_MASTER_SCHEDULE' || action === 'parseMasterSchedule') {
      const result = await aiService.parseMasterSchedule(payload);
      return res.status(200).json(result);
    }

    if (action === 'PARSE_SCHEDULE' || action === 'parseSchedule') {
      const result = await aiService.parsePersonalSchedule(payload);
      return res.status(200).json(result);
    }

    if (action === 'EXPLAIN_CODE' || action === 'explainCode') {
      const result = await aiService.explainCode(payload);
      return res.status(200).json(result);
    }

    return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Lỗi xử lý nội bộ máy chủ Gemini AI'
    });
  }
}