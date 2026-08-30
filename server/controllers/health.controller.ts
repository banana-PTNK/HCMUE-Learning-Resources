import { Request, Response } from 'express';

export class HealthController {
  getHealth(req: Request, res: Response) {
    return res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  }
}

export const healthController = new HealthController();
