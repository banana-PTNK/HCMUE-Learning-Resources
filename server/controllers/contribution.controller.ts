import { Request, Response } from 'express';
import { contributionService } from '../services/contribution.service';

export class ContributionController {
  getAll(req: Request, res: Response) {
    const list = contributionService.getAll();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, data: list });
  }

  create(req: Request, res: Response) {
    try {
      const newEntry = contributionService.create(req.body);
      return res.json({ success: true, id: newEntry.id, data: newEntry });
    } catch (err: any) {
      console.error('Lỗi khi lưu đóng góp tài liệu:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Không thể lưu đóng góp' });
    }
  }

  updateFilesCount(req: Request, res: Response) {
    const { id } = req.params;
    const newCount = contributionService.updateFilesCount(id, req.body?.filesCount);
    return res.json({ success: true, count: newCount });
  }

  approve(req: Request, res: Response) {
    const { id } = req.params;
    const customCount = req.body?.customFilesCount !== undefined ? Number(req.body.customFilesCount) : undefined;
    const adminName = req.body?.adminName || 'Admin';

    const item = contributionService.approve(id, {
      customFilesCount: customCount,
      adminName
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đóng góp' });
    }

    return res.json({ success: true, item });
  }

  reject(req: Request, res: Response) {
    const { id } = req.params;
    const adminFeedback = req.body?.adminFeedback;
    const success = contributionService.reject(id, adminFeedback);
    return res.json({ success });
  }

  delete(req: Request, res: Response) {
    const { id } = req.params;
    const success = contributionService.delete(id);
    return res.json({ success });
  }
}

export const contributionController = new ContributionController();
