import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ 
        success: false, 
        message: 'Chưa thiết lập ADMIN_PASSWORD trên Vercel.' 
      });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mật khẩu quản trị không chính xác.' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      token: 'admin-authenticated-session',
      message: 'Đăng nhập thành công' 
    });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ xác thực.' 
    });
  }
}
