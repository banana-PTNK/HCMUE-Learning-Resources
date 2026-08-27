import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  Info,
  Trophy,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Code2,
  FileText,
  Calendar,
  User,
  School,
  Check,
  Copy,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  searchContributionsByStudent,
  FirestoreContribution
} from '../services/contributionService';
import { formatStudentId } from '../utils/studentIdUtils';
import { mockSubjects } from '../data/mockData';

interface LookupProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export const LookupProgressModal: React.FC<LookupProgressModalProps> = ({
  isOpen,
  onClose,
  initialQuery
}) => {
  const { toast } = useToast();
  const [lookupQuery, setLookupQuery] = useState(() => initialQuery || localStorage.getItem('last_student_id') || '');
  const [results, setResults] = useState<FirestoreContribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || localStorage.getItem('last_student_id') || '';
      setLookupQuery(q);
      if (q.trim()) {
        performSearch(q.trim());
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) {
      toast.info('Nhập thông tin tra cứu', 'Vui lòng nhập MSSV, Email hoặc Họ tên để tra cứu.');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await searchContributionsByStudent(q);
      setResults(data);
    } catch (error) {
      console.error('Error during lookup:', error);
      toast.error('Lỗi kết nối', 'Không thể tra cứu dữ liệu vào lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(lookupQuery);
  };

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Đã sao chép link', 'Đã lưu đường dẫn vào bộ nhớ tạm.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSubjectName = (code: string) => {
    const found = mockSubjects.find(s => s.code.toLowerCase() === code.toLowerCase());
    return found ? found.name : '';
  };

  const getDocTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'slide':
        return { label: 'Slide bài giảng', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' };
      case 'exam':
        return { label: 'Đề thi & Đáp án', icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' };
      case 'lab':
        return { label: 'Bài tập & Lab', icon: <Layers className="w-3.5 h-3.5" />, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' };
      case 'code':
        return { label: 'Source code & Đồ án', icon: <Code2 className="w-3.5 h-3.5" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' };
      default:
        return { label: type || 'Tài liệu học tập', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' };
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '';
    try {
      if (val.seconds) {
        return new Date(val.seconds * 1000).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return '';
    }
    return '';
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    if (statusFilter === 'all') return results;
    return results.filter(item => item.status === statusFilter);
  }, [results, statusFilter]);

  const stats = useMemo(() => {
    return {
      all: results.length,
      pending: results.filter(r => r.status === 'pending').length,
      approved: results.filter(r => r.status === 'approved').length,
      rejected: results.filter(r => r.status === 'rejected').length,
    };
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      id="lookup-progress-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="lookup-progress-modal"
        className="w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#090e18] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Bảng Tra Cứu Tiến Độ & Phản Hồi</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-md border border-indigo-200 dark:border-indigo-800">
                  Dành Cho Sinh Viên
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập MSSV"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
              />
              {lookupQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLookupQuery('');
                    setResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Xóa nhanh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Tra cứu</span>
            </button>
          </form>

          {/* Quick Filter Tabs (when results exist) */}
          {results.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Tất cả</span>
                <span className="text-[11px] font-mono text-slate-400">({stats.all})</span>
              </button>

              {stats.pending > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                >
                  <span>Chờ duyệt</span>
                  <span className="text-[11px] font-mono opacity-80">({stats.pending})</span>
                </button>
              )}

              {stats.approved > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'approved'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <span>Đã duyệt</span>
                  <span className="text-[11px] font-mono opacity-80">({stats.approved})</span>
                </button>
              )}

              {stats.rejected > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'rejected'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
                  }`}
                >
                  <span>Cần chỉnh sửa</span>
                  <span className="text-[11px] font-mono opacity-80">({stats.rejected})</span>
                </button>
              )}
            </div>
          )}

          {/* Results Area */}
          <div className="space-y-2.5 pt-0.5">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Đang tra cứu dữ liệu...</span>
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Không tìm thấy tài liệu nào khớp với "{lookupQuery}"
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vui lòng kiểm tra lại Mã số sinh viên (MSSV) đã điền khi nộp bài.
                </p>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="space-y-2.5">
                {filteredResults.map((item) => {
                  const typeInfo = getDocTypeInfo(item.assetType);
                  const subjectName = getSubjectName(item.targetSubjectCode);
                  const submitDate = formatDate(item.createdAt);
                  const approvedDate = formatDate(item.approvedAt);

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-600/60 transition space-y-3 shadow-xs"
                    >
                      {/* Top Row: Subject Code, Name, Document Type & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/80">
                              {item.targetSubjectCode}
                            </span>
                            {subjectName && (
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                {subjectName}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800">
                              {typeInfo.label}
                            </span>
                          </div>

                          {/* Timestamp info */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {item.status === 'approved' && approvedDate ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Duyệt lúc: {approvedDate}</span>
                              </span>
                            ) : (
                              submitDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Nộp lúc: {submitDate}</span>
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-start sm:self-auto">
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold border border-amber-200 dark:border-amber-800">
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Đang chờ duyệt</span>
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Đã duyệt (+{item.filesCount || 1} file)</span>
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              <span>Cần chỉnh sửa</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin Feedback (If Rejected) */}
                      {item.status === 'rejected' && (
                        <div className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 text-xs sm:text-sm text-rose-800 dark:text-rose-200 space-y-1.5">
                          <p className="font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                            <span>Phản hồi: "{item.adminFeedback || 'Chưa mở quyền xem link Google Drive hoặc nội dung chưa đúng chuẩn.'}"</span>
                          </p>
                          <p className="text-xs text-rose-700 dark:text-rose-300 pl-6">
                            👉 Vui lòng mở quyền chia sẻ <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong> trên Google Drive rồi nộp lại tài liệu nhé!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : hasSearched && results.length > 0 && filteredResults.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Không có tài liệu nào thuộc bộ lọc này.
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Nhập MSSV và bấm <strong>"Tra cứu"</strong> để kiểm tra tiến độ tài liệu.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
