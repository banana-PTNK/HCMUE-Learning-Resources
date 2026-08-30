import { Request, Response } from 'express';
import { announcementService } from '../services/announcement.service';

export class AnnouncementController {
  getAll(req: Request, res: Response) {
    const list = announcementService.getAll();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, data: list });
  }

  createOrUpdate(req: Request, res: Response) {
    const list = announcementService.createOrUpdate(req.body || {});
    return res.json({ success: true, data: list });
  }

  delete(req: Request, res: Response) {
    const { id } = req.params;
    const list = announcementService.delete(id);
    return res.json({ success: true, data: list });
  }
}

export const announcementController = new AnnouncementController();
