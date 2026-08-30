import { Request, Response } from 'express';
import { feedbackService } from '../services/feedback.service';

export class FeedbackController {
  getAll(req: Request, res: Response) {
    const list = feedbackService.getAll();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, data: list });
  }

  create(req: Request, res: Response) {
    const newFeedback = feedbackService.create(req.body || {});
    return res.json({ success: true, data: newFeedback });
  }

  updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const status = req.body?.status;
    const adminNote = req.body?.adminNote;
    const success = feedbackService.updateStatus(id, status, adminNote);
    return res.json({ success });
  }

  delete(req: Request, res: Response) {
    const { id } = req.params;
    const success = feedbackService.delete(id);
    return res.json({ success });
  }
}

export const feedbackController = new FeedbackController();
