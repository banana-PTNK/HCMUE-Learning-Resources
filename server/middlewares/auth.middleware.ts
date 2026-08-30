import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown-ip';
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : req.body?.token;

  const result = adminService.verifySession(token);
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: result.message || 'Phiên làm việc không hợp lệ hoặc đã hết hạn'
    });
  }

  next();
}
