import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Code2,
  AlertTriangle,
  User,
  Mail,
  Hash
} from 'lucide-react';
import {
  FirestoreContribution,
  fetchAllContributions,
  approveContribution,
  rejectContribution,
  deleteContribution
} from '../services/contributionService';
import { matchesSearchQuery } from '../utils/studentIdUtils';
import { useToast } from '../context/ToastContext';

interface AdminModerationProps {
  onClose?: () => void;
}

export const AdminModeration: React.FC<AdminModerationProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [contributions, setContributions] = useState<FirestoreContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllContributions();
      setContributions(data);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu', 'Không thể kết nối với Firestore');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (item: FirestoreContribution) => {
    setProcessingId(item.id);
    try {
      await approveContribution(item, 'Admin Khoa CNTT');
      toast.success('Duyệt thành công', `Tài liệu đóng góp của ${item.contributorName} đã được phê duyệt & lên BXH!`);
      setContributions((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: 'approved' } : c))
      );
    } catch (error) {
      toast.error('Lỗi phê duyệt', 'Không thể cập nhật trạng thái');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    const reason = window.prompt('Nhập lý do từ chối (tùy chọn):', 'Link không truy cập được hoặc nội dung không hợp lệ');
    if (reason === null) return;

    setProcessingId(id);
    try {
      await rejectContribution(id, reason);
      toast.info('Đã từ chối', `Đã chuyển trạng thái đóng góp của ${name} sang từ chối.`);
      setContributions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'rejected', adminFeedback: reason } : c))
      );
    } catch (error) {
      toast.error('Lỗi xử lý', 'Không thể cập nhật trạng thái');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi đóng góp này khỏi cơ sở dữ liệu?')) {
      return;
    }
    setProcessingId(id);
    try {
      await deleteContribution(id);
      toast.success('Đã xóa', 'Bản ghi đã được xóa khỏi Firestore');
      setContributions((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      toast.error('Lỗi xóa', 'Không thể xóa bản ghi');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredList = contributions.filter((c) => {
    if (activeFilter !== 'all' && c.status !== activeFilter) return false;
    if (searchTerm.trim()) {
      return matchesSearchQuery(
        {
          studentId: c.studentId,
          contributorName: c.contributorName,
          email: c.email,
          className: c.className,
          targetSubjectCode: c.targetSubjectCode,
          notes: c.notes
        },
        searchTerm
      );
    }
    return true;
  });

  const pendingCount = contributions.filter((c) => c.status === 'pending').length;
  const approvedCount = contributions.filter((c) => c.status === 'approved').length;
  const rejectedCount = contributions.filter((c) => c.status === 'rejected').length;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono border border-indigo-200/60 dark:border-indigo-800/60 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>ADMIN & KIỂM DUYỆT TÀI LIỆU</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Trung Tâm Duyệt Đóng Góp (Firebase Firestore)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dữ liệu sinh viên được bảo vệ an toàn trên Firestore Cloud, không lưu trữ cục bộ LocalStorage.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
              : 'bg-slate-50 dark:bg-[#0c1220] border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tất cả</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{contributions.length}</div>
        </button>

        <button
          onClick={() => setActiveFilter('pending')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-[#0c1220] border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Chờ duyệt</span>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'approved'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-[#0c1220] border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã duyệt</span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'rejected'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-slate-50 dark:bg-[#0c1220] border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Từ chối</span>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{rejectedCount}</div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên, MSSV, Email, Mã môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Đang kết nối Firestore...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          Không có tài liệu nào trong danh sách này.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3">Sinh viên</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Link Drive</th>
                <th className="py-3 px-3">Ghi chú</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredList.map((item) => {
                const isItemProcessing = processingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        {item.contributorName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span>MSSV: {item.studentId}</span>
                        {(item.className || item.email) && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[160px]">
                              {item.className ? `Lớp: ${item.className}` : item.email}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {item.targetSubjectCode === 'OTHER' ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-[11px] border border-purple-200/50 dark:border-purple-800/50">
                            Môn đề xuất
                          </span>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {item.customSubjectName || 'Môn học mới'}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
                          {item.targetSubjectCode}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <a
                        href={item.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline max-w-[180px] truncate"
                      >
                        <span>Mở Drive xem</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3.5 px-3 max-w-[180px]">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.notes || 'Không có ghi chú'}
                      </p>
                    </td>

                    <td className="py-3.5 px-3">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                          <Clock className="w-2.5 h-2.5" />
                          Chờ duyệt
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Đã duyệt
                        </span>
                      )}
                      {item.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-2.5 h-2.5" />
                          Từ chối
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isItemProcessing}
                              title="Duyệt bài này"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => item.id && handleReject(item.id, item.contributorName)}
                              disabled={isItemProcessing}
                              title="Từ chối bài này"
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 transition cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => item.id && handleDelete(item.id)}
                          disabled={isItemProcessing}
                          title="Xóa vĩnh viễn"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
