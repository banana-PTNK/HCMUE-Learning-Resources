import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi xử lý nội bộ máy chủ';
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
}
