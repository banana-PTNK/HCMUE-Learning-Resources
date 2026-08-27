export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const authHeader = req.headers?.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : req.body?.token;

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ valid: false, message: 'Thiếu token xác thực' });
  }

  return res.status(200).json({
    valid: true,
    expiresIn: 43200
  });
}
