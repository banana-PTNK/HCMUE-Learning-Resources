import crypto from 'crypto';
import { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS, SESSION_LIFETIME_MS } from '../config/constants';

export interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

export interface LoginResult {
  success: boolean;
  locked?: boolean;
  retryAfter?: number;
  token?: string;
  expiresIn?: number;
  remainingAttempts?: number;
  message: string;
}

class AdminService {
  private activeSessions = new Map<string, AdminSession>();
  private loginAttempts = new Map<string, { count: number; lockedUntil: number; lastAttempt: number }>();

  constructor() {
    // Clean expired sessions every 10 minutes
    setInterval(() => this.cleanExpiredSessions(), 10 * 60 * 1000);
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(token);
      }
    }
    for (const [ip, attempt] of this.loginAttempts.entries()) {
      if (now > attempt.lockedUntil && now - attempt.lastAttempt > 30 * 60 * 1000) {
        this.loginAttempts.delete(ip);
      }
    }
  }

  verifyPassword(provided: string): boolean {
    if (!provided || typeof provided !== 'string') return false;

    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword) {
      return false;
    }

    try {
      const bufProvided = Buffer.from(provided);
      const bufExpected = Buffer.from(expectedPassword);
      if (bufProvided.length !== bufExpected.length) {
        crypto.timingSafeEqual(bufProvided, bufProvided);
        return false;
      }
      return crypto.timingSafeEqual(bufProvided, bufExpected);
    } catch {
      return false;
    }
  }

  async login(password: string, clientIp: string): Promise<LoginResult> {
    const now = Date.now();
    const cleanPassword = typeof password === 'string' ? password.trim() : '';

    // Check lockout
    const attemptRecord = this.loginAttempts.get(clientIp) || { count: 0, lockedUntil: 0, lastAttempt: now };
    if (attemptRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      return {
        success: false,
        locked: true,
        retryAfter: remainingSeconds,
        message: `Quá nhiều lần thử sai. Vui lòng thử lại sau ${Math.ceil(remainingSeconds / 60)} phút.`
      };
    }

    const isMatch = this.verifyPassword(cleanPassword);

    if (isMatch) {
      this.loginAttempts.delete(clientIp);

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = now + SESSION_LIFETIME_MS;

      this.activeSessions.set(sessionToken, {
        token: sessionToken,
        createdAt: now,
        expiresAt,
        ip: clientIp
      });

      return {
        success: true,
        token: sessionToken,
        expiresIn: Math.floor(SESSION_LIFETIME_MS / 1000),
        message: 'Xác thực quản trị viên thành công'
      };
    }

    attemptRecord.count += 1;
    attemptRecord.lastAttempt = now;
    if (attemptRecord.count >= MAX_FAILED_ATTEMPTS) {
      attemptRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
    this.loginAttempts.set(clientIp, attemptRecord);

    // Artificial jitter delay (300-600ms)
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));

    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - attemptRecord.count);
    return {
      success: false,
      remainingAttempts: remaining,
      message: attemptRecord.lockedUntil > now
        ? 'Đã vượt quá số lần cho phép. Tài khoản bị tạm khóa 15 phút.'
        : `Mật khẩu không chính xác. Bạn còn ${remaining} lần thử.`
    };
  }

  verifySession(token?: string): { valid: boolean; expiresIn?: number; message?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, message: 'Thiếu token xác thực' };
    }

    const session = this.activeSessions.get(token);
    if (!session) {
      return { valid: false, message: 'Phiên làm việc không tồn tại hoặc đã hết hạn' };
    }

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return { valid: false, message: 'Phiên làm việc đã hết hạn' };
    }

    return {
      valid: true,
      expiresIn: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
    };
  }

  logout(token?: string): void {
    if (token && typeof token === 'string') {
      this.activeSessions.delete(token);
    }
  }
}

export const adminService = new AdminService();
