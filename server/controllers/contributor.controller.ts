import { Request, Response } from 'express';
import { contributorService } from '../services/contributor.service';

export class ContributorController {
  getAll(req: Request, res: Response) {
    const list = contributorService.getAll();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, data: list });
  }

  saveOrUpdate(req: Request, res: Response) {
    const list = contributorService.saveOrUpdate(req.body || {});
    return res.json({ success: true, data: list });
  }

  adjustPoints(req: Request, res: Response) {
    const { id } = req.params;
    const delta = Number(req.body?.delta) || 0;
    const list = contributorService.adjustPoints(id, delta);
    return res.json({ success: true, data: list });
  }
}

export const contributorController = new ContributorController();
