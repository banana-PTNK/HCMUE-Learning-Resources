/**
 * Admin Authentication Service
 * 
 * Provides zero-trust client security:
 * - No raw passwords stored in client source code or JSON files.
 * - Password verification executed securely via backend API with timing-attack mitigation.
 * - Short-lived cryptographic session tokens stored exclusively in ephemeral sessionStorage.
 */

const SESSION_TOKEN_KEY = 'fit_admin_session_token_v2';
const SESSION_EXPIRY_KEY = 'fit_admin_session_expiry_v2';

export interface AdminAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  expiresIn?: number;
  locked?: boolean;
  retryAfter?: number;
  remainingAttempts?: number;
}

export class AdminAuthService {
  /**
   * Check if the current browser session has a valid, non-expired token
   */
  public static isLocallyAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
      if (!token || !expiry) return false;

      const expiryTime = parseInt(expiry, 10);
      if (isNaN(expiryTime) || Date.now() > expiryTime) {
        this.clearSession();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current active session token for API requests
   */
  public static getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  /**
   * Authenticate with the backend server securely
   */
  public static async login(password: string): Promise<AdminAuthResponse> {
    if (!password || !password.trim()) {
      return { success: false, message: 'Vui lòng nhập mật khẩu quản trị viên.' };
    }

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        // Save ephemeral token and expiration timestamp
        const expiresInMs = (data.expiresIn || 43200) * 1000; // default 12h
        sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);
        sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + expiresInMs));
        return {
          success: true,
          token: data.token,
          expiresIn: data.expiresIn,
          message: data.message || 'Đăng nhập thành công'
        };
      }

      // Handle rate limits / lockouts
      if (response.status === 429 || data.locked) {
        return {
          success: false,
          locked: true,
          retryAfter: data.retryAfter,
          message: data.message || 'Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.'
        };
      }

      return {
        success: false,
        remainingAttempts: data.remainingAttempts,
        message: data.message || 'Mật khẩu quản trị viên không chính xác.'
      };
    } catch (networkError) {
      // Fallback for offline or purely static hosting scenarios without backend
      console.warn('Backend auth endpoint unreachable, attempting secure fallback check...');
      return this.handleFallbackOfflineLogin(password.trim());
    }
  }

  /**
   * Verify whether the current session token is still valid with the backend
   */
  public static async verifySession(): Promise<boolean> {
    const token = this.getSessionToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          return true;
        }
      }
      this.clearSession();
      return false;
    } catch {
      // If network unreachable, check local expiration timestamp
      return this.isLocallyAuthenticated();
    }
  }

  /**
   * Log out and revoke active session
   */
  public static async logout(): Promise<void> {
    const token = this.getSessionToken();
    this.clearSession();

    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Silently clear local session
      }
    }
  }

  /**
   * Clear local session storage
   */
  public static clearSession(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_EXPIRY_KEY);
      // Clean up legacy keys
      sessionStorage.removeItem('fit_admin_logged_in');
    } catch {
      // Ignore
    }
  }

  /**
   * Offline network failure fallback
   */
  private static async handleFallbackOfflineLogin(password: string): Promise<AdminAuthResponse> {
    // When backend endpoint is unreachable, fail securely without embedded credentials
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ xác thực bảo mật. Vui lòng kiểm tra lại mạng.'
    };
  }
}
