import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { getClientIp } from '../middlewares/auth.middleware';

export class AdminController {
  async login(req: Request, res: Response) {
    const clientIp = getClientIp(req);
    const password = req.body?.password || '';
    const result = await adminService.login(password, clientIp);

    if (result.locked) {
      return res.status(429).json(result);
    }
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.json(result);
  }

  verify(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.body?.token;

    const result = adminService.verifySession(token);
    if (!result.valid) {
      return res.status(401).json(result);
    }
    return res.json(result);
  }

  logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.body?.token;

    adminService.logout(token);
    return res.json({ success: true, message: 'Đã đăng xuất an toàn' });
  }
}

export const adminController = new AdminController();
