import { adminService } from '../../server/services/admin.service';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { password } = req.body || {};
    const clientIp = req.headers?.['x-forwarded-for']?.split?.(',')[0]?.trim() || req.socket?.remoteAddress || 'vercel-serverless';
    const result = await adminService.login(password, clientIp);

    if (result.locked) {
      return res.status(429).json(result);
    }
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ xác thực.' 
    });
  }
}
