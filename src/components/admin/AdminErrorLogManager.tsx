import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Play,
  Terminal,
  Activity,
  ZapOff,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCode
} from 'lucide-react';
import { errorLogger, AppErrorLog, ErrorSeverity } from '../../services/errorLoggingService';
import { useToast } from '../../context/ToastContext';

export const AdminErrorLogManager: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AppErrorLog[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | ErrorSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time error logs
    const unsubscribe = errorLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const total = logs.length;
    const quota = logs.filter((l) => l.severity === 'quota').length;
    const errors = logs.filter((l) => l.severity === 'error').length;
    const warnings = logs.filter((l) => l.severity === 'warning').length;
    const unresolved = logs.filter((l) => !l.resolved).length;
    return { total, quota, errors, warnings, unresolved };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (severityFilter !== 'all' && log.severity !== severityFilter) {
        return false;
      }
      if (statusFilter === 'unresolved' && log.resolved) {
        return false;
      }
      if (statusFilter === 'resolved' && !log.resolved) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (log.message || '').toLowerCase();
        const src = (log.source || '').toLowerCase();
        const stack = (log.stack || '').toLowerCase();
        return msg.includes(q) || src.includes(q) || stack.includes(q);
      }
      return true;
    });
  }, [logs, severityFilter, statusFilter, searchQuery]);

  const handleCopyStack = (log: AppErrorLog) => {
    const textToCopy = `[${log.severity.toUpperCase()}] ${log.timestamp} - ${log.source || 'Unknown'}\nMessage: ${log.message}\nURL: ${log.url || 'N/A'}\nStack:\n${log.stack || 'No stack trace available'}\nContext:\n${JSON.stringify(log.context, null, 2)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(log.id);
    toast.success('Đã sao chép', 'Chi tiết lỗi đã được lưu vào clipboard.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportJson = () => {
    try {
      const dataStr = errorLogger.exportJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studyvault-error-logs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Xuất file thành công', 'File nhật ký lỗi đã được tải xuống.');
    } catch {
      toast.error('Lỗi xuất file', 'Không thể tạo file báo cáo lỗi.');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký lỗi hiện tại?')) {
      errorLogger.clearLogs();
      toast.success('Đã dọn sạch', 'Toàn bộ nhật ký lỗi đã được xóa.');
    }
  };

  const getSeverityBadge = (sev: ErrorSeverity) => {
    switch (sev) {
      case 'quota':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ZapOff className="w-3 h-3" />
            QUOTA / 429
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3 h-3" />
            RUNTIME ERROR
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner & Diagnostic Summary */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Giám Sát Lỗi Real-Time & Runtime Diagnostic</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE LISTENER ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Tự động bắt uncaught exceptions, promise rejections, lỗi hết quota (Gemini 429), và lỗi console để hỗ trợ chẩn đoán và khắc phục sự cố vận hành tức thời.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Xuất dữ liệu lỗi JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 disabled:opacity-40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-rose-800/60"
              title="Xóa toàn bộ log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Logs</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-slate-400 text-[11px]">Tổng bản ghi</div>
            <div className="text-lg font-bold text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40">
            <div className="text-purple-300 text-[11px] flex items-center gap-1">
              <ZapOff className="w-3 h-3" /> Lỗi Quota (429)
            </div>
            <div className="text-lg font-bold text-purple-200 mt-0.5">{stats.quota}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40">
            <div className="text-rose-300 text-[11px] flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" /> Runtime Errors
            </div>
            <div className="text-lg font-bold text-rose-200 mt-0.5">{stats.errors}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40">
            <div className="text-amber-300 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" /> Chưa xử lý
            </div>
            <div className="text-lg font-bold text-amber-200 mt-0.5">{stats.unresolved}</div>
          </div>
        </div>

        {/* Sandbox Diagnostic Simulator Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            Thử nghiệm mô phỏng lỗi (Testing Sandbox):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                errorLogger.simulateTestError('quota');
                toast.info('Đã ghi nhận log mẫu Quota 429');
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[11px] font-medium transition cursor-pointer border border-purple-700"
            >
              + Quota Exceeded (429)
            </button>
            <button
              onClick={() => {
                errorLogger.simulateTestError('error');
                toast.info('Đã ghi nhận log mẫu Runtime Exception');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[11px] font-medium transition cursor-pointer border border-rose-700"
            >
              + Exception Error
            </button>
            <button
              onClick={() => {
                errorLogger.simulateTestError('warning');
                toast.info('Đã ghi nhận log mẫu Warning');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[11px] font-medium transition cursor-pointer border border-amber-700"
            >
              + Warning Latency
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Filters */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                severityFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả ({logs.length})
            </button>
            <button
              onClick={() => setSeverityFilter('quota')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                severityFilter === 'quota'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Quota ({stats.quota})
            </button>
            <button
              onClick={() => setSeverityFilter('error')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                severityFilter === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Lỗi ({stats.errors})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                severityFilter === 'warning'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cảnh báo ({stats.warnings})
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả trạng thái
            </button>
            <button
              onClick={() => setStatusFilter('unresolved')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'unresolved'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Chưa giải quyết ({stats.unresolved})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, file, hàm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Error Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hệ thống đang vận hành ổn định</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Không có lỗi runtime hoặc sự cố quota nào được phát hiện trong phạm vi bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isCopied = copiedId === log.id;

            return (
              <div
                key={log.id}
                className={`rounded-2xl border transition-all ${
                  log.resolved
                    ? 'bg-slate-50/50 dark:bg-[#131b2e]/50 border-slate-200 dark:border-slate-800/80 opacity-75'
                    : log.severity === 'quota'
                    ? 'bg-purple-50/20 dark:bg-purple-950/10 border-purple-300 dark:border-purple-900/50'
                    : log.severity === 'error'
                    ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-300 dark:border-rose-900/50'
                    : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Summary Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{getSeverityBadge(log.severity)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                          <Terminal className="w-3 h-3" />
                          {log.source || 'Runtime Core'}
                        </span>
                        {log.resolved && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            ĐÃ XỬ LÝ
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 break-words line-clamp-2">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => errorLogger.markResolved(log.id, !log.resolved)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                        log.resolved
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      }`}
                      title={log.resolved ? 'Đánh dấu chưa xử lý' : 'Đánh dấu đã giải quyết'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{log.resolved ? 'Mở lại' : 'Đã xử lý'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyStack(log)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                      title="Sao chép toàn bộ chi tiết"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-3">
                    {/* Stack Trace */}
                    {log.stack && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <FileCode className="w-3.5 h-3.5" />
                          Stack Trace / Call Site:
                        </div>
                        <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 select-all whitespace-pre-wrap">
                          {log.stack}
                        </pre>
                      </div>
                    )}

                    {/* Metadata Context */}
                    {log.context && Object.keys(log.context).length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          Context Metadata:
                        </div>
                        <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-slate-800 dark:text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-200 dark:border-slate-800">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Environment Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 font-mono">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">URL: </span>
                        <span className="truncate">{log.url || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Log ID: </span>
                        <span>{log.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
