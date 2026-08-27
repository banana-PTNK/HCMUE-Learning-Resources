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
  Lock,
  LogOut,
  ArrowLeft,
  User,
  Mail,
  AlertCircle,
  FolderOpen,
  Folder,
  Bell,
  Plus,
  Edit3,
  Calendar,
  Send,
  Sparkles,
  Info,
  AlertTriangle,
  Database,
  FileSpreadsheet,
  HardDrive,
  Check,
  Layers,
  ArrowUpRight,
  Award,
  Trophy,
  Users,
  CheckSquare,
  FileText,
  SlidersHorizontal,
  Save,
  Minus,
  X,
  MessageSquarePlus,
  Star,
  MessageCircle,
  Lightbulb,
  Bug,
  Activity,
  ZapOff
} from 'lucide-react';
import {
  FirestoreContribution,
  fetchAllContributions,
  approveContribution,
  rejectContribution,
  deleteContribution,
  updateContributionFilesCount,
  updateContributorRecord,
  adjustContributorFilesCount,
  addCustomContributorToLeaderboard,
  deleteContributorFromLeaderboard,
  fetchContributorsFromFirestore
} from '../services/contributionService';
import {
  Announcement,
  AnnouncementType,
  Contributor
} from '../types';
import {
  fetchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  ANNOUNCEMENTS_UPDATED_EVENT
} from '../services/announcementService';
import {
  UserFeedback,
  fetchAllFeedbacks,
  updateFeedbackStatus,
  deleteFeedback,
  FEEDBACKS_UPDATED_EVENT
} from '../services/feedbackService';
import {
  CONTRIBUTIONS_UPDATED_EVENT,
  CONTRIBUTORS_UPDATED_EVENT,
  getStoredContributors
} from '../utils/contributorStorage';
import { matchesSearchQuery } from '../utils/studentIdUtils';
import { useToast } from '../context/ToastContext';
import { useGoogleSheet } from '../context/GoogleSheetContext';
import { errorLogger, AppErrorLog } from '../services/errorLoggingService';
import { AdminErrorLogManager } from '../components/admin/AdminErrorLogManager';
import { AdminAuthService } from '../services/adminAuthService';

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const { toast } = useToast();
  const {
    sheetRecords,
    isSyncing: isContextSyncing,
    lastSyncTime: contextLastSyncTime,
    refreshSheet,
    updateSheetSource,
    sheetUrl,
    sheetId,
    rootDriveUrl
  } = useGoogleSheet();

  // Authentication state managed securely via AdminAuthService
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return AdminAuthService.isLocallyAuthenticated();
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Verify active session token with backend on mount
  useEffect(() => {
    if (isAuthenticated) {
      AdminAuthService.verifySession().then((isValid) => {
        if (!isValid) {
          setIsAuthenticated(false);
          toast.info('Phiên làm việc hết hạn', 'Vui lòng đăng nhập lại.');
        }
      });
    }
  }, []);

  // Admin Active Tab
  const [activeTab, setActiveTab] = useState<'moderation' | 'feedback' | 'announcements' | 'sheetsync' | 'errorlogs'>('moderation');

  // Real-time Error logs monitor state
  const [errorLogs, setErrorLogs] = useState<AppErrorLog[]>(() => errorLogger.getLogs());

  // Moderation state
  const [contributions, setContributions] = useState<FirestoreContribution[]>([]);
  const [isLoadingContribs, setIsLoadingContribs] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [moderationSubTab, setModerationSubTab] = useState<'submissions' | 'leaderboard_manage'>('submissions');

  // Leaderboard Direct Manager State
  const [leaderboardList, setLeaderboardList] = useState<Contributor[]>(() => getStoredContributors());
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [editingContributor, setEditingContributor] = useState<Contributor | null>(null);
  const [isAddContributorModalOpen, setIsAddContributorModalOpen] = useState(false);
  const [newContributorForm, setNewContributorForm] = useState({
    name: '',
    studentId: '',
    className: '',
    email: '',
    filesCount: 1,
    entriesCount: 1,
    badgeTitle: 'Đóng góp viên Tích cực',
    specialty: 'Chuyên đề Công nghệ'
  });

  // Approve Modal with Files Count Customizer
  const [approveModalItem, setApproveModalItem] = useState<FirestoreContribution | null>(null);
  const [approveModalFilesCount, setApproveModalFilesCount] = useState<number>(1);

  // Quick Inline Edit for Submission Files Count
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFilesCount, setInlineFilesCount] = useState<number>(1);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'unread' | 'read' | 'resolved'>('all');
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackProcessingId, setFeedbackProcessingId] = useState<string | null>(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annType, setAnnType] = useState<AnnouncementType>('important');
  const [annSummary, setAnnSummary] = useState('');
  const [annAuthor, setAnnAuthor] = useState('Admin Khoa CNTT');
  const [annLinkText, setAnnLinkText] = useState('');
  const [annLinkUrl, setAnnLinkUrl] = useState('');
  const [annDriveLink, setAnnDriveLink] = useState('');
  const [isSavingAnn, setIsSavingAnn] = useState(false);

  // Sheet Sync State
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [customSheetUrlInput, setCustomSheetUrlInput] = useState('');
  const [isEditingSheetUrl, setIsEditingSheetUrl] = useState(false);

  // Reject Mail Modal
  const [rejectedMailModal, setRejectedMailModal] = useState<{
    isOpen: boolean;
    studentName: string;
    studentEmail: string;
    subjectCode: string;
    reason: string;
  } | null>(null);

  // Data Loading
  const loadContributions = async () => {
    setIsLoadingContribs(true);
    try {
      const data = await fetchAllContributions();
      setContributions(data);
    } catch {
      toast.error('Lỗi kết nối', 'Không thể tải danh sách tài liệu.');
    } finally {
      setIsLoadingContribs(false);
    }
  };

  const loadLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const data = await fetchContributorsFromFirestore();
      setLeaderboardList(data);
    } catch {
      setLeaderboardList(getStoredContributors());
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const loadAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch {
      toast.error('Lỗi thông báo', 'Không thể tải danh sách thông báo.');
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const loadFeedbacks = async () => {
    setIsLoadingFeedbacks(true);
    try {
      const data = await fetchAllFeedbacks();
      setFeedbacks(data);
    } catch {
      toast.error('Lỗi tải feedback', 'Không thể tải danh sách góp ý của người dùng.');
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadContributions();
      loadLeaderboard();
      loadAnnouncements();
      loadFeedbacks();

      const handleContribUpdate = () => loadContributions();
      const handleAnnUpdate = () => loadAnnouncements();
      const handleFeedbackUpdate = () => loadFeedbacks();
      const handleLeaderboardUpdate = (e: any) => {
        if (e?.detail) {
          setLeaderboardList(e.detail);
        } else {
          loadLeaderboard();
        }
      };

      window.addEventListener(CONTRIBUTIONS_UPDATED_EVENT, handleContribUpdate);
      window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleAnnUpdate);
      window.addEventListener(FEEDBACKS_UPDATED_EVENT, handleFeedbackUpdate);
      window.addEventListener(CONTRIBUTORS_UPDATED_EVENT, handleLeaderboardUpdate);

      // Realtime subscription to error logs
      const unsubscribeErrorLogger = errorLogger.subscribe((latestLogs) => {
        setErrorLogs(latestLogs);
      });

      return () => {
        window.removeEventListener(CONTRIBUTIONS_UPDATED_EVENT, handleContribUpdate);
        window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleAnnUpdate);
        window.removeEventListener(FEEDBACKS_UPDATED_EVENT, handleFeedbackUpdate);
        window.removeEventListener(CONTRIBUTORS_UPDATED_EVENT, handleLeaderboardUpdate);
        unsubscribeErrorLogger();
      };
    }
  }, [isAuthenticated]);

  // Auth Handler with Backend API validation & Brute-force protection
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setAuthError('');

    try {
      const result = await AdminAuthService.login(passwordInput);
      if (result.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
        toast.success('Đăng nhập thành công', 'Chào mừng Quản trị viên vào Bàn điều hành!');
      } else {
        const errorMsg = result.message || 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.';
        setAuthError(errorMsg);
        toast.error('Xác thực thất bại', errorMsg);
      }
    } catch {
      setAuthError('Đã xảy ra lỗi kết nối xác thực.');
      toast.error('Lỗi đăng nhập', 'Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await AdminAuthService.logout();
    setIsAuthenticated(false);
    toast.info('Đã đăng xuất', 'Đã khóa quyền quản trị viên');
  };

  // Feedback Actions
  const handleUpdateFeedbackStatus = async (id: string, status: 'unread' | 'read' | 'resolved') => {
    setFeedbackProcessingId(id);
    try {
      await updateFeedbackStatus(id, status);
      toast.success(
        'Đã cập nhật trạng thái feedback',
        status === 'resolved'
          ? 'Đã đánh dấu đã xử lý xong.'
          : status === 'read'
          ? 'Đã đánh dấu đã xem.'
          : 'Đã đánh dấu chưa đọc.'
      );
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch {
      toast.error('Lỗi cập nhật', 'Không thể đổi trạng thái góp ý.');
    } finally {
      setFeedbackProcessingId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;
    setFeedbackProcessingId(id);
    try {
      await deleteFeedback(id);
      toast.info('Đã xóa phản hồi', 'Đã loại bỏ góp ý khỏi hệ thống.');
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch {
      toast.error('Lỗi xóa', 'Không thể xóa phản hồi.');
    } finally {
      setFeedbackProcessingId(null);
    }
  };

  // Moderation Approval & Reject
  const handleOpenApproveModal = (item: FirestoreContribution) => {
    setApproveModalItem(item);
    setApproveModalFilesCount(Math.max(1, item.filesCount || 1));
  };

  const handleConfirmApprove = async (filesCountToCredit: number) => {
    if (!approveModalItem) return;
    const item = approveModalItem;
    setActionProcessingId(item.id);
    const count = Math.max(1, filesCountToCredit);

    try {
      await approveContribution(item, 'Admin Khoa CNTT', count);
      toast.success(
        'Đã duyệt tài liệu thành công!',
        `Đã công nhận ${count} tài liệu cho ${item.contributorName}.`
      );
      setContributions((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: 'approved', filesCount: count } : c))
      );
      setApproveModalItem(null);
      loadLeaderboard();
    } catch {
      toast.error('Lỗi phê duyệt', 'Không thể cập nhật trạng thái');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleQuickUpdateSubmissionFilesCount = async (item: FirestoreContribution, newCount: number) => {
    const safeCount = Math.max(1, newCount);
    setActionProcessingId(item.id);
    try {
      await updateContributionFilesCount(item, safeCount);
      toast.success('Đã cập nhật số lượng', `Số lượng tài liệu là ${safeCount} mục.`);
      setContributions((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, filesCount: safeCount } : c))
      );
      setInlineEditingId(null);
      loadLeaderboard();
    } catch {
      toast.error('Lỗi cập nhật', 'Không thể lưu số lượng mới');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleReject = async (item: FirestoreContribution) => {
    const defaultReason = 'Xin lỗi vì tài liệu không phù hợp hoặc đã có trong kho học liệu.';
    const reason = window.prompt('Nội dung phản hồi từ chối gửi đến sinh viên:', defaultReason);
    if (reason === null) return;

    setActionProcessingId(item.id);
    try {
      await rejectContribution(item.id, reason);
      setContributions((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: 'rejected', adminFeedback: reason } : c))
      );
      setRejectedMailModal({
        isOpen: true,
        studentName: item.contributorName,
        studentEmail: item.email,
        subjectCode: item.targetSubjectCode,
        reason: reason
      });
      toast.info('Đã từ chối tài liệu', `Đã cập nhật trạng thái từ chối.`);
    } catch {
      toast.error('Lỗi xử lý', 'Không thể cập nhật trạng thái');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleDeleteContribution = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi đóng góp này?')) return;
    setActionProcessingId(id);
    try {
      await deleteContribution(id);
      toast.success('Đã xóa', 'Bản ghi đã được xóa.');
      setContributions((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Lỗi xóa', 'Không thể xóa bản ghi');
    } finally {
      setActionProcessingId(null);
    }
  };

  // Leaderboard Custom Actions
  const handleQuickAdjustContributorFiles = async (studentIdOrId: string, name: string, delta: number) => {
    try {
      await adjustContributorFilesCount(studentIdOrId, delta, 0);
      toast.success('Cập nhật BXH thành công', `${delta > 0 ? `+${delta}` : delta} tài liệu cho ${name}.`);
      loadLeaderboard();
    } catch {
      toast.error('Lỗi cập nhật BXH', 'Không thể điều chỉnh điểm số');
    }
  };

  const handleSaveContributorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContributor) return;

    try {
      const updated = await updateContributorRecord(editingContributor.studentId || editingContributor.id, {
        name: editingContributor.name,
        className: editingContributor.className,
        studentId: editingContributor.studentId,
        filesCount: Math.max(0, Number(editingContributor.filesCount) || 0),
        entriesCount: Math.max(0, Number(editingContributor.entriesCount) || 1),
        badgeTitle: editingContributor.badgeTitle,
        specialty: editingContributor.specialty,
        email: editingContributor.email
      });

      if (updated) {
        toast.success('Đã cập nhật BXH', `Hồ sơ của ${updated.name} đã được cập nhật.`);
        setEditingContributor(null);
        loadLeaderboard();
      }
    } catch {
      toast.error('Lỗi cập nhật', 'Không thể lưu thông tin sinh viên');
    }
  };

  const handleCreateNewContributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContributorForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập Họ tên sinh viên');
      return;
    }

    try {
      const created = await addCustomContributorToLeaderboard({
        name: newContributorForm.name.trim(),
        studentId: newContributorForm.studentId.trim(),
        className: newContributorForm.className.trim(),
        email: newContributorForm.email.trim(),
        filesCount: Math.max(0, Number(newContributorForm.filesCount) || 1),
        entriesCount: Math.max(1, Number(newContributorForm.entriesCount) || 1),
        badgeTitle: newContributorForm.badgeTitle.trim() || 'Đóng góp viên Tích cực',
        specialty: newContributorForm.specialty.trim() || 'Chuyên đề Công nghệ'
      });

      toast.success('Đã thêm sinh viên', `Đã vinh danh ${created.name} lên Bảng Xếp Hạng.`);
      setIsAddContributorModalOpen(false);
      setNewContributorForm({
        name: '',
        studentId: '',
        className: '',
        email: '',
        filesCount: 1,
        entriesCount: 1,
        badgeTitle: 'Đóng góp viên Tích cực',
        specialty: 'Chuyên đề Công nghệ'
      });
      loadLeaderboard();
    } catch {
      toast.error('Lỗi thêm mới', 'Không thể thêm sinh viên vào BXH');
    }
  };

  const handleDeleteContributor = async (studentIdOrId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${name} khỏi Bảng Xếp Hạng?`)) return;
    try {
      await deleteContributorFromLeaderboard(studentIdOrId);
      toast.info('Đã xóa', `Đã xóa ${name} khỏi BXH`);
      loadLeaderboard();
    } catch {
      toast.error('Lỗi xóa', 'Không thể xóa sinh viên');
    }
  };

  // Announcement Actions
  const handleOpenCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnTitle('');
    setAnnType('important');
    setAnnSummary('');
    setAnnAuthor('Admin Khoa CNTT');
    setAnnLinkText('');
    setAnnLinkUrl('');
    setAnnDriveLink('');
    setIsAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnType(ann.type);
    setAnnSummary(ann.summary);
    setAnnAuthor(ann.author || 'Admin Khoa CNTT');
    setAnnLinkText(ann.linkText || '');
    setAnnLinkUrl(ann.linkUrl || '');
    setAnnDriveLink(ann.driveFolderLink || '');
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annSummary.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tiêu đề và tóm tắt thông báo.');
      return;
    }

    setIsSavingAnn(true);
    try {
      const typeLabels: Record<AnnouncementType, string> = {
        important: 'QUAN TRỌNG',
        update: 'CẬP NHẬT',
        warning: 'CẢNH BÁO',
        event: 'SỰ KIỆN'
      };

      await saveAnnouncement({
        id: editingAnnouncement?.id,
        title: annTitle.trim(),
        type: annType,
        typeLabel: typeLabels[annType],
        summary: annSummary.trim(),
        author: annAuthor.trim() || 'Admin Khoa CNTT',
        linkText: annLinkText.trim() || undefined,
        linkUrl: annLinkUrl.trim() || undefined,
        driveFolderLink: annDriveLink.trim() || undefined,
        date: editingAnnouncement?.date || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        isoDate: editingAnnouncement?.isoDate || new Date().toISOString().split('T')[0]
      });

      setIsSavingAnn(false);
      setIsAnnouncementModalOpen(false);
      loadAnnouncements();
      toast.success(editingAnnouncement ? 'Đã cập nhật thông báo' : 'Đã đăng thông báo mới');
    } catch {
      setIsSavingAnn(false);
      toast.error('Lỗi lưu', 'Không thể lưu thông báo.');
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thông báo "${title}"?`)) return;
    try {
      await deleteAnnouncement(id);
      loadAnnouncements();
      toast.success('Đã gỡ thông báo');
    } catch {
      toast.error('Lỗi xóa', 'Không thể xóa thông báo.');
    }
  };

  // Google Sheet Sync Action
  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const records = await refreshSheet(customSheetUrlInput.trim() ? customSheetUrlInput.trim() : undefined);
      toast.success('Đồng bộ thành công!', `Đã cập nhật ${records.length} học phần từ Google Sheet.`);
    } catch (err: any) {
      toast.error('Lỗi đồng bộ', err?.message || 'Không thể kết nối với Google Sheet.');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Counts & Filtered lists
  const pendingCount = contributions.filter((c) => c.status === 'pending').length;
  const approvedCount = contributions.filter((c) => c.status === 'approved').length;
  const rejectedCount = contributions.filter((c) => c.status === 'rejected').length;
  const unreadFeedbackCount = feedbacks.filter((f) => f.status === 'unread').length;

  const filteredContributions = contributions.filter((c) => {
    if (activeFilter !== 'all' && c.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.contributorName?.toLowerCase().includes(q);
      const matchId = c.studentId?.toLowerCase().includes(q);
      const matchSubject = c.targetSubjectCode?.toLowerCase().includes(q) || c.targetSubjectName?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      return matchName || matchId || matchSubject || matchDesc;
    }
    return true;
  });

  const filteredLeaderboard = leaderboardList.filter((c) => {
    if (!leaderboardSearchQuery.trim()) return true;
    return matchesSearchQuery(c, leaderboardSearchQuery);
  });

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter !== 'all' && f.status !== feedbackFilter) return false;
    if (feedbackSearchQuery.trim()) {
      const q = feedbackSearchQuery.toLowerCase();
      return (
        f.content?.toLowerCase().includes(q) ||
        f.userName?.toLowerCase().includes(q) ||
        f.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredSheetRecords = sheetRecords.filter((rec) => {
    if (!sheetSearchQuery.trim()) return true;
    const q = sheetSearchQuery.toLowerCase();
    return (
      rec.code?.toLowerCase().includes(q) ||
      rec.name?.toLowerCase().includes(q) ||
      rec.driveUrl?.toLowerCase().includes(q)
    );
  });

  // Not authenticated screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Bàn Điều Hành Quản Trị
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nhập mật khẩu quản trị để mở quyền quản lý hệ thống.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mật khẩu Admin:
            </label>
            <input
              type="password"
              required
              autoFocus
              placeholder="Nhập mật khẩu..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setAuthError('');
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || !passwordInput.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập vào Bàn điều hành'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            &larr; Trở lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Bàn Điều Hành Quản Trị
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                FIT HCMUE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý tài liệu đóng góp, xét duyệt, bảng xếp hạng vinh danh và phản hồi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('/')}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('moderation')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'moderation'
              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/40 shadow-xs'
              : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chờ xét duyệt</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingCount}</span>
            <span className="text-[11px] text-slate-400">/ {contributions.length} tổng</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('feedback')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-500/40 shadow-xs'
              : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Góp ý & Báo lỗi</span>
            <Bug className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{feedbacks.length}</span>
            {unreadFeedbackCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                {unreadFeedbackCount} mới
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('announcements')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-500/40 shadow-xs'
              : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Thông báo tin tức</span>
            <Bell className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{announcements.length}</span>
            <span className="text-[11px] text-slate-400">bài đăng</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('sheetsync')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'sheetsync'
              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/40 shadow-xs'
              : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Google Sheet</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{sheetRecords.length}</span>
            <span className="text-[11px] text-slate-400">môn học</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('errorlogs')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'errorlogs'
              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-500/40 shadow-xs'
              : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nhật ký lỗi Runtime</span>
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{errorLogs.length}</span>
            {errorLogs.filter(l => !l.resolved).length > 0 ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">
                {errorLogs.filter(l => !l.resolved).length} chưa fix
              </span>
            ) : (
              <span className="text-[11px] text-emerald-500 font-semibold">Tốt</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'moderation'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Xét Duyệt Tài Liệu & BXH</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span>Ý Kiến & Báo Lỗi</span>
          {unreadFeedbackCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {unreadFeedbackCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Thông Báo Bảng Tin</span>
        </button>

        <button
          onClick={() => setActiveTab('sheetsync')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'sheetsync'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Google Sheet & Drive</span>
        </button>

        <button
          onClick={() => setActiveTab('errorlogs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
            activeTab === 'errorlogs'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Nhật Ký Lỗi Runtime</span>
          {errorLogs.filter(l => !l.resolved).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {errorLogs.filter(l => !l.resolved).length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MODERATION & LEADERBOARD */}
      {activeTab === 'moderation' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Sub-Tabs */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#131b2e] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setModerationSubTab('submissions')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  moderationSubTab === 'submissions'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Xét duyệt tài liệu ({contributions.length})
              </button>
              <button
                onClick={() => setModerationSubTab('leaderboard_manage')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  moderationSubTab === 'leaderboard_manage'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Quản lý Bảng Xếp Hạng ({leaderboardList.length})
              </button>
            </div>

            {moderationSubTab === 'submissions' ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setActiveFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                      activeFilter === filterKey
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {filterKey === 'all'
                      ? `Tất cả (${contributions.length})`
                      : filterKey === 'pending'
                      ? `Chờ duyệt (${pendingCount})`
                      : filterKey === 'approved'
                      ? `Đã duyệt (${approvedCount})`
                      : `Từ chối (${rejectedCount})`}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setIsAddContributorModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm sinh viên lên BXH</span>
              </button>
            )}
          </div>

          {/* Submissions Section */}
          {moderationSubTab === 'submissions' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sinh viên, MSSV, mã môn, mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Submissions Table / Cards */}
              {isLoadingContribs ? (
                <div className="p-12 text-center text-slate-400 text-xs">Đang tải danh sách đóng góp...</div>
              ) : filteredContributions.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Không có tài liệu đóng góp nào phù hợp với bộ lọc.
                </div>
              ) : (
                  <div className="space-y-4">
                    {filteredContributions.map((item) => (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                      >
                        {/* 1. Header Row: Status + Date + Quick Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide ${
                                item.status === 'approved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                  : item.status === 'rejected'
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                              }`}
                            >
                              {item.status === 'approved' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ĐÃ PHÊ DUYỆT</span>
                                </>
                              ) : item.status === 'rejected' ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>ĐÃ TỪ CHỐI</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>CHỜ DUYỆT</span>
                                </>
                              )}
                            </span>

                            {item.createdAt && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {typeof item.createdAt === 'string'
                                    ? item.createdAt
                                    : (item.createdAt as any)?.toDate
                                    ? (item.createdAt as any).toDate().toLocaleString('vi-VN')
                                    : new Date(item.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {item.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleOpenApproveModal(item)}
                                  disabled={actionProcessingId === item.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Phê duyệt</span>
                                </button>
                                <button
                                  onClick={() => handleReject(item)}
                                  disabled={actionProcessingId === item.id}
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteContribution(item.id)}
                              disabled={actionProcessingId === item.id}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 2. Middle Block: Subject Info + Drive Link */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                          <div className="lg:col-span-8 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base text-indigo-600 dark:text-indigo-400 font-mono">
                                [{item.targetSubjectCode}]
                              </span>
                              <span className="font-bold text-base text-slate-900 dark:text-white">
                                {item.targetSubjectName || item.customSubjectName || 'Môn học tùy chỉnh'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                {item.materialType}
                              </span>
                            </div>

                            {item.description && (
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">Ghi chú từ SV: </span>
                                <span>{item.description}</span>
                              </div>
                            )}

                            {item.status === 'rejected' && item.adminFeedback && (
                              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                                <span className="font-bold">Lý do từ chối: </span>
                                <span>{item.adminFeedback}</span>
                              </div>
                            )}
                          </div>

                          {/* Drive Link Action Card */}
                          <div className="lg:col-span-4 flex flex-col justify-center">
                            {item.driveUrl ? (
                              <a
                                href={item.driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 flex items-center justify-between gap-2 transition group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span className="text-xs font-bold truncate">Mở Google Drive / Tài liệu</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                              </a>
                            ) : (
                              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 text-xs italic text-center">
                                Không có link tài liệu
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Contributor Metadata Bar */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-x-6 gap-y-2 flex-wrap text-xs text-slate-600 dark:text-slate-300 bg-slate-50/60 dark:bg-slate-900/30 p-3 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-500 dark:text-slate-400">Sinh viên:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{item.contributorName}</span>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-500 dark:text-slate-400">MSSV:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {item.studentId || 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400">Lớp:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{item.className || 'Chưa cập nhật'}</span>
                          </div>

                          {item.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-500 dark:text-slate-400">Email:</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{item.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          )}

          {/* Leaderboard Management Section */}
          {moderationSubTab === 'leaderboard_manage' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm sinh viên trên BXH theo tên, MSSV..."
                  value={leaderboardSearchQuery}
                  onChange={(e) => setLeaderboardSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {isLoadingLeaderboard ? (
                <div className="p-12 text-center text-slate-400 text-xs">Đang tải BXH...</div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  Không tìm thấy sinh viên nào.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Hạng</th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">MSSV / Lớp</th>
                        <th className="p-3">Danh hiệu</th>
                        <th className="p-3 text-center">Số tài liệu</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {filteredLeaderboard.map((item, idx) => (
                        <tr key={item.id || item.studentId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold">#{idx + 1}</td>
                          <td className="p-3 font-semibold">{item.name}</td>
                          <td className="p-3 font-mono text-slate-500">{item.studentId} • {item.className || 'CNTT'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium text-[11px]">
                              {item.badgeTitle || 'Đóng góp viên'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickAdjustContributorFiles(item.studentId || item.id, item.name, -1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="font-bold font-mono px-1.5">{item.filesCount || 0}</span>
                              <button
                                onClick={() => handleQuickAdjustContributorFiles(item.studentId || item.id, item.name, 1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => setEditingContributor(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Sửa thông tin"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContributor(item.studentId || item.id, item.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                title="Xóa khỏi BXH"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Feedback Filter Buttons & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'unread', 'read', 'resolved'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setFeedbackFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                    feedbackFilter === filterKey
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {filterKey === 'all'
                    ? `Tất cả (${feedbacks.length})`
                    : filterKey === 'unread'
                    ? `Chưa đọc (${unreadFeedbackCount})`
                    : filterKey === 'read'
                    ? 'Đã xem'
                    : 'Đã giải quyết'}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nội dung góp ý..."
                value={feedbackSearchQuery}
                onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Feedback Cards */}
          {isLoadingFeedbacks ? (
            <div className="p-12 text-center text-slate-400 text-xs">Đang tải danh sách góp ý...</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Không có ý kiến / báo lỗi nào.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        <Bug className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {fb.title || 'Báo lỗi hệ thống'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {fb.createdAt || fb.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          fb.status === 'resolved'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : fb.status === 'read'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {fb.status === 'resolved'
                          ? 'ĐÃ XỬ LÝ XONG'
                          : fb.status === 'read'
                          ? 'ĐÃ XEM'
                          : 'CHƯA ĐỌC'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {fb.content}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Gửi bởi: <strong>{fb.userName || 'Sinh viên'}</strong>
                    </div>
                  </div>

                  {/* Feedback Status Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {fb.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                        disabled={feedbackProcessingId === fb.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã xử lý</span>
                      </button>
                    )}
                    {fb.status === 'unread' && (
                      <button
                        onClick={() => handleUpdateFeedbackStatus(fb.id, 'read')}
                        disabled={feedbackProcessingId === fb.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Đánh dấu đã xem
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFeedback(fb.id)}
                      disabled={feedbackProcessingId === fb.id}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                      title="Xóa phản hồi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh sách thông báo bảng tin ({announcements.length})
            </h2>
            <button
              onClick={handleOpenCreateAnnouncement}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đăng thông báo mới</span>
            </button>
          </div>

          {isLoadingAnnouncements ? (
            <div className="p-12 text-center text-slate-400 text-xs">Đang tải thông báo...</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Chưa có thông báo nào được đăng.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {ann.typeLabel || 'THÔNG BÁO'}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {ann.title}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{ann.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {ann.summary}
                    </p>
                    {ann.linkUrl && (
                      <a
                        href={ann.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium pt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{ann.linkText || 'Xem liên kết'}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditAnnouncement(ann)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GOOGLE SHEET & DRIVE */}
      {activeTab === 'sheetsync' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Google Sheet nguồn ({sheetRecords.length} học phần)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono break-all">
                {sheetUrl}
              </p>
            </div>

            <button
              onClick={handleSyncGoogleSheet}
              disabled={isSyncingSheet || isContextSyncing}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet || isContextSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheet || isContextSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại dữ liệu'}</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã môn, tên môn học trong Google Sheet..."
              value={sheetSearchQuery}
              onChange={(e) => setSheetSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3">Mã HP</th>
                  <th className="p-3">Tên môn học</th>
                  <th className="p-3">Google Drive Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                {filteredSheetRecords.slice(0, 50).map((rec, idx) => (
                  <tr key={rec.code || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{rec.code}</td>
                    <td className="p-3 font-sans font-medium">{rec.name}</td>
                    <td className="p-3">
                      {rec.driveUrl ? (
                        <a
                          href={rec.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-xs">{rec.driveUrl}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">Chưa gắn link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ERROR LOGGING SERVICE & RUNTIME MONITOR */}
      {activeTab === 'errorlogs' && (
        <AdminErrorLogManager />
      )}

      {/* MODAL 1: Phê duyệt tài liệu với số lượng file */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Xác nhận phê duyệt tài liệu</span>
              </h3>
              <button onClick={() => setApproveModalItem(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <div>Sinh viên: <strong>{approveModalItem.contributorName}</strong> ({approveModalItem.studentId})</div>
              <div>Môn học: <strong>{approveModalItem.targetSubjectCode} - {approveModalItem.targetSubjectName}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số lượng tài liệu công nhận cộng vào BXH:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={approveModalFilesCount}
                onChange={(e) => setApproveModalFilesCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApprove(approveModalFilesCount)}
                disabled={actionProcessingId === approveModalItem.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                Xác nhận Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Thêm / Sửa sinh viên trên BXH */}
      {(isAddContributorModalOpen || editingContributor) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingContributor ? 'Chỉnh sửa sinh viên trên BXH' : 'Thêm sinh viên lên BXH'}
              </h3>
              <button
                onClick={() => {
                  setIsAddContributorModalOpen(false);
                  setEditingContributor(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={editingContributor ? handleSaveContributorEdit : handleCreateNewContributor}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Họ và tên:</label>
                <input
                  type="text"
                  required
                  value={editingContributor ? editingContributor.name : newContributorForm.name}
                  onChange={(e) =>
                    editingContributor
                      ? setEditingContributor({ ...editingContributor, name: e.target.value })
                      : setNewContributorForm({ ...newContributorForm, name: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">MSSV:</label>
                  <input
                    type="text"
                    value={editingContributor ? editingContributor.studentId : newContributorForm.studentId}
                    onChange={(e) =>
                      editingContributor
                        ? setEditingContributor({ ...editingContributor, studentId: e.target.value })
                        : setNewContributorForm({ ...newContributorForm, studentId: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lớp:</label>
                  <input
                    type="text"
                    value={editingContributor ? editingContributor.className : newContributorForm.className}
                    onChange={(e) =>
                      editingContributor
                        ? setEditingContributor({ ...editingContributor, className: e.target.value })
                        : setNewContributorForm({ ...newContributorForm, className: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Số tài liệu:</label>
                  <input
                    type="number"
                    min={0}
                    value={editingContributor ? editingContributor.filesCount : newContributorForm.filesCount}
                    onChange={(e) =>
                      editingContributor
                        ? setEditingContributor({ ...editingContributor, filesCount: parseInt(e.target.value) || 0 })
                        : setNewContributorForm({ ...newContributorForm, filesCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Danh hiệu:</label>
                  <input
                    type="text"
                    value={editingContributor ? editingContributor.badgeTitle : newContributorForm.badgeTitle}
                    onChange={(e) =>
                      editingContributor
                        ? setEditingContributor({ ...editingContributor, badgeTitle: e.target.value })
                        : setNewContributorForm({ ...newContributorForm, badgeTitle: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddContributorModalOpen(false);
                    setEditingContributor(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tạo / Sửa thông báo */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAnnouncement ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
              </h3>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tiêu đề thông báo:</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="VD: Lịch thi học kỳ II năm học 2025 - 2026..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loại thông báo:</label>
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value as AnnouncementType)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="important">QUAN TRỌNG</option>
                    <option value="update">CẬP NHẬT</option>
                    <option value="warning">CẢNH BÁO</option>
                    <option value="event">SỰ KIỆN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đơn vị đăng:</label>
                  <input
                    type="text"
                    value={annAuthor}
                    onChange={(e) => setAnnAuthor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nội dung tóm tắt:</label>
                <textarea
                  rows={3}
                  required
                  value={annSummary}
                  onChange={(e) => setAnnSummary(e.target.value)}
                  placeholder="Nhập nội dung ngắn gọn của thông báo..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên liên kết (tùy chọn):</label>
                  <input
                    type="text"
                    value={annLinkText}
                    onChange={(e) => setAnnLinkText(e.target.value)}
                    placeholder="VD: Xem chi tiết"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL liên kết (tùy chọn):</label>
                  <input
                    type="url"
                    value={annLinkUrl}
                    onChange={(e) => setAnnLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingAnn}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {isSavingAnn ? 'Đang lưu...' : 'Lưu thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
