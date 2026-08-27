export type ErrorSeverity = 'error' | 'warning' | 'info' | 'quota';

export interface AppErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  url?: string;
  userAgent?: string;
  resolved?: boolean;
}

const STORAGE_KEY = 'studyvault_app_error_logs_v1';
const MAX_LOGS = 150;

type Listener = (logs: AppErrorLog[]) => void;

/**
 * Checks if an error is a benign WebSocket, Vite HMR, or sandbox dev-server connection notice.
 * In sandboxed and iframe preview environments, WebSocket/HMR is intentionally disabled,
 * and these connection errors should be completely suppressed.
 */
export function isBenignWebSocketOrHmrError(message?: string, stack?: string, source?: string): boolean {
  const text = `${message || ''} ${stack || ''} ${source || ''}`.toLowerCase();
  
  if (
    text.includes('failed to connect to websocket') ||
    text.includes('failed to connect to hmr') ||
    text.includes('websocket connection to') ||
    text.includes('websocket is already in closing') ||
    text.includes('[vite] failed to connect to websocket') ||
    text.includes('[vite] connecting...') ||
    text.includes('vite/client') ||
    text.includes('vite:ws') ||
    (text.includes('websocket') && (text.includes('3000') || text.includes('localhost') || text.includes('failed') || text.includes('closed') || text.includes('connection error')))
  ) {
    return true;
  }
  return false;
}

class ErrorLoggingService {
  private logs: AppErrorLog[] = [];
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Filter out any past WebSocket logs from storage
    this.scrubBenignLogs();

    // Capture uncaught exceptions
    window.addEventListener('error', (event) => {
      const msg = event.message || '';
      const stack = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;
      const source = event.filename ? `${event.filename}:${event.lineno}` : 'Global Error Listener';

      // Ignore benign WebSocket & Vite HMR errors
      if (isBenignWebSocketOrHmrError(msg, stack, source)) {
        event.preventDefault?.();
        return;
      }

      this.log({
        message: msg || 'Uncaught JavaScript Error',
        stack,
        source,
        severity: 'error',
        context: {
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename
        }
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack = '';
      let severity: ErrorSeverity = 'error';

      if (typeof reason === 'string') {
        msg = reason;
      } else if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack || '';
      } else if (reason && typeof reason === 'object') {
        msg = (reason as any).message || JSON.stringify(reason);
        stack = (reason as any).stack || '';
      }

      // Ignore benign WebSocket & Vite HMR errors
      if (isBenignWebSocketOrHmrError(msg, stack, 'Unhandled Promise Rejection')) {
        event.preventDefault?.();
        return;
      }

      if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('429')) {
        severity = 'quota';
      }

      this.log({
        message: msg,
        stack,
        source: 'Unhandled Promise Rejection',
        severity,
        context: { reason }
      });
    });

    // Hook console.error for runtime warning/error tracking
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      try {
        const firstArg = args[0];
        let msg = typeof firstArg === 'string' ? firstArg : (firstArg?.message || JSON.stringify(firstArg));
        let stack = firstArg?.stack;

        // If this is a benign WebSocket / Vite HMR warning, suppress from error logs and console noise
        if (isBenignWebSocketOrHmrError(msg, stack, 'console.error')) {
          return;
        }

        let severity: ErrorSeverity = 'error';
        if (typeof msg === 'string' && (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('Rate limit') || msg.includes('429'))) {
          severity = 'quota';
        }

        this.log({
          message: msg || 'Console Error',
          stack,
          source: 'Console.error',
          severity,
          context: { args: args.map(a => typeof a === 'object' ? String(a) : a) }
        });
      } catch (err) {
        // Prevent recursive logging failure
      }

      originalConsoleError.apply(console, args);
    };
  }

  private scrubBenignLogs() {
    const originalLength = this.logs.length;
    this.logs = this.logs.filter(
      (log) => !isBenignWebSocketOrHmrError(log.message, log.stack, log.source)
    );
    if (this.logs.length !== originalLength) {
      this.saveToStorage();
    }
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.logs = parsed.filter(
              (log) => !isBenignWebSocketOrHmrError(log.message, log.stack, log.source)
            );
          }
        }
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
      }
    } catch (e) {
      // LocalStorage full or private mode
    }
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((listener) => listener([...this.logs]));
  }

  public log(data: {
    message: string;
    stack?: string;
    source?: string;
    severity?: ErrorSeverity;
    context?: Record<string, any>;
  }): AppErrorLog | null {
    // Double check to ensure no benign WebSocket errors ever get logged
    if (isBenignWebSocketOrHmrError(data.message, data.stack, data.source)) {
      return null;
    }

    let severity = data.severity || 'error';
    if (
      data.message.toLowerCase().includes('resource_exhausted') ||
      data.message.toLowerCase().includes('quota') ||
      data.message.toLowerCase().includes('rate limit')
    ) {
      severity = 'quota';
    }

    const newLog: AppErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: data.message,
      stack: data.stack,
      source: data.source || 'Manual Logger',
      severity,
      context: data.context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      resolved: false
    };

    this.logs.unshift(newLog);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.notify();
    return newLog;
  }

  public getLogs(): AppErrorLog[] {
    return [...this.logs];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public markResolved(id: string, resolved = true) {
    this.logs = this.logs.map((log) => (log.id === id ? { ...log, resolved } : log));
    this.notify();
  }

  public exportJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public simulateTestError(type: 'quota' | 'error' | 'warning' = 'error') {
    if (type === 'quota') {
      this.log({
        message: 'generic::resource_exhausted: You exceeded your current quota, please check your plan and billing details.',
        stack: 'Error: Rate limit quota exceeded (429)\n    at fetchWithRetry (src/services/aiService.ts:42:15)\n    at Object.parseMasterScheduleAI (src/services/aiService.ts:60:20)',
        source: 'Gemini AI Client (Simulation)',
        severity: 'quota',
        context: { httpStatus: 429, retryAfter: 60 }
      });
    } else if (type === 'warning') {
      this.log({
        message: 'Firestore connection latency high (>2500ms). Falling back to indexed local cache.',
        source: 'Firebase Client SDK',
        severity: 'warning',
        context: { latencyMs: 2750, mode: 'cache-first' }
      });
    } else {
      this.log({
        message: 'Failed to fetch external resource from CDN',
        stack: 'TypeError: Failed to fetch\n    at loadRemoteScript (src/utils/loader.ts:18:9)',
        source: 'Network / Asset Pipeline',
        severity: 'error',
        context: { targetUrl: 'https://cdn.jsdelivr.net/npm/sample-lib@latest' }
      });
    }
  }
}

export const errorLogger = new ErrorLoggingService();
