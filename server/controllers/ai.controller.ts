import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';

export class AiController {
  async handleAiAction(req: Request, res: Response) {
    try {
      const { action, payload } = req.body || {};

      if (action === 'PARSE_MASTER_SCHEDULE') {
        const result = await aiService.parseMasterSchedule(payload);
        return res.json(result);
      }

      if (action === 'PARSE_SCHEDULE') {
        const result = await aiService.parsePersonalSchedule(payload);
        return res.json(result);
      }

      if (action === 'EXPLAIN_CODE') {
        const result = await aiService.explainCode(payload);
        return res.json(result);
      }

      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
    } catch (error: any) {
      console.error('Lỗi server AI Controller:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Lỗi khi gọi dịch vụ Gemini AI'
      });
    }
  }
}

export const aiController = new AiController();
