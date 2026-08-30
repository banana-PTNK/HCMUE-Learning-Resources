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
  ZapOff,
  Copy,
  CheckCheck
} from 'lucide-react';
import subjectsData from '../data/subjects.json';
import { getRankLevel } from '../utils/rankingUtils';
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
  fetchContributorsFromFirestore,
  subscribeToContributions,
  subscribeToContributors
} from '../services/contributionService';
import {
  Announcement,
  AnnouncementType,
  Contributor,
  Subject
} from '../types';
import {
  fetchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getStoredAnnouncements,
  ANNOUNCEMENTS_UPDATED_EVENT
} from '../services/announcementService';
import {
  UserFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  subscribeToFeedbacks
} from '../services/feedbackService';
import {
  getStoredContributors,
  getLocalCachedSubmissions
} from '../utils/contributorStorage';
import {
  DEFAULT_FORM_RESPONSES_URL,
  getActiveFormSheetId,
  setActiveFormSheetId,
  syncGoogleFormResponsesToContributions,
  FormSyncResult
} from '../services/formResponsesSyncService';
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

  // Helper to get subject name from subject code
  const getSubjectNameByCode = (code: string): string => {
    if (!code) return '';
    const allSubjects = subjectsData as Subject[];
    const found = allSubjects.find((s) => s.code.toUpperCase() === code.toUpperCase());
    return found ? found.name : '';
  };

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
  const [contributions, setContributions] = useState<FirestoreContribution[]>(() => getLocalCachedSubmissions());
  const [isLoadingContribs, setIsLoadingContribs] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [moderationSubTab, setModerationSubTab] = useState<'submissions' | 'leaderboard_manage'>('submissions');

  // Manual Refresh & Sync state
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  // Google Form Sync State
  const [isSyncingFormResponses, setIsSyncingFormResponses] = useState(false);
  const [formSheetUrlInput, setFormSheetUrlInput] = useState<string>(() => {
    const id = getActiveFormSheetId();
    return `https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`;
  });
  const [isEditingFormUrl, setIsEditingFormUrl] = useState(false);
  const [formSyncSummary, setFormSyncSummary] = useState<FormSyncResult | null>(null);
  const [isFormGuideModalOpen, setIsFormGuideModalOpen] = useState(false);

  // Leaderboard Direct Manager State
  const [leaderboardList, setLeaderboardList] = useState<Contributor[]>(() => getStoredContributors());
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const LEADERBOARD_PAGE_SIZE = 30;
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
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>(() => []);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'unread' | 'read' | 'resolved'>('all');
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackProcessingId, setFeedbackProcessingId] = useState<string | null>(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());
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

  // Reject & Rejection Email Modal State
  interface RejectModalState {
    item: FirestoreContribution;
    presetKey: string;
    customReason: string;
    copied: boolean;
  }
  const [rejectModalData, setRejectModalData] = useState<RejectModalState | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Rejection Presets
  const REJECTION_PRESETS = [
    {
      id: 'duplicate',
      label: 'Tài liệu đã có trong kho',
      text: 'Tài liệu đã có sẵn trong kho học liệu HCMUE-FIT StudyVault hoặc đã được đóng góp trước đó.'
    },
    {
      id: 'incompatible',
      label: 'Tài liệu không phù hợp',
      text: 'Nội dung tài liệu chưa phù hợp với đề cương hoặc chương trình học phần hiện hành của Khoa CNTT.'
    },
    {
      id: 'quality',
      label: 'Lỗi file / Link bị khóa quyền',
      text: 'File tài liệu bị lỗi hiển thị, chất lượng scan/chụp mờ hoặc link Google Drive chưa được mở quyền truy cập công khai.'
    },
    {
      id: 'incomplete',
      label: 'Tài liệu chưa đủ nội dung',
      text: 'Tài liệu chưa hoàn thiện đầy đủ nội dung hoặc thiếu thông tin định danh học phần cần thiết.'
    },
    {
      id: 'custom',
      label: 'Lý do tùy chỉnh khác',
      text: ''
    }
  ];



  // Manual Trigger Refresh All with Animation & Toast
  const handleManualRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      // 1. Fetch contributions, leaderboard, announcements, and feedbacks in parallel
      const [contribsRes, leaderboardRes, annRes] = await Promise.allSettled([
        fetchAllContributions(),
        fetchContributorsFromFirestore(),
        fetchAnnouncements()
      ]);

      if (contribsRes.status === 'fulfilled') {
        setContributions(contribsRes.value);
      }
      if (leaderboardRes.status === 'fulfilled') {
        setLeaderboardList(leaderboardRes.value);
      }
      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value);
      }

      const d = new Date();
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      setLastRefreshedAt(timeStr);
      toast.success('Đã làm mới dữ liệu!', `Đã tải lại toàn bộ danh sách duyệt (${contribsRes.status === 'fulfilled' ? contribsRes.value.length : 0} mục) lúc ${timeStr}`);
    } catch (err: any) {
      toast.error('Lỗi làm mới', err?.message || 'Không thể cập nhật dữ liệu quản trị.');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Google Form Responses Sync Handler
  const handleSyncGoogleForm = async () => {
    setIsSyncingFormResponses(true);
    try {
      const res = await syncGoogleFormResponsesToContributions(formSheetUrlInput);
      setFormSyncSummary(res);

      // Refresh contributions list
      const updatedContribs = await fetchAllContributions();
      setContributions(updatedContribs);

      if (res.newImported > 0) {
        toast.success(
          'Đồng bộ Google Form thành công!',
          `Đã nhập ${res.newImported} tài liệu mới vào hàng đợi duyệt (${res.alreadyExisted} bản ghi đã có sẵn).`
        );
      } else if (res.totalInSheet > 0) {
        toast.info(
          'Đã kiểm tra Google Form',
          `Tất cả ${res.totalInSheet} phản hồi trong Google Sheet đã được đồng bộ trước đó.`
        );
      } else {
        toast.warning('Google Form chưa có phản hồi nào mới.');
      }
    } catch (err: any) {
      toast.error('Lỗi đồng bộ Google Form', err?.message || 'Không thể kết nối đến Google Spreadsheet.');
    } finally {
      setIsSyncingFormResponses(false);
    }
  };

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

  useEffect(() => {
    if (isAuthenticated) {
      // Immediate load
      loadContributions();
      loadLeaderboard();
      loadAnnouncements();

      // Realtime subscription to contributions
      setIsLoadingContribs(true);
      const unsubscribeContribs = subscribeToContributions((data) => {
        setContributions(data);
        setIsLoadingContribs(false);
      });

      // Realtime subscription to leaderboard
      setIsLoadingLeaderboard(true);
      const unsubscribeLeaderboard = subscribeToContributors((data) => {
        setLeaderboardList(data);
        setIsLoadingLeaderboard(false);
      });

      // Realtime subscription to feedbacks
      setIsLoadingFeedbacks(true);
      const unsubscribeFeedbacks = subscribeToFeedbacks((data) => {
        setFeedbacks(data);
        setIsLoadingFeedbacks(false);
      });

      const handleAnnUpdate = () => loadAnnouncements();
      window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleAnnUpdate);

      // Realtime subscription to error logs
      const unsubscribeErrorLogger = errorLogger.subscribe((latestLogs) => {
        setErrorLogs(latestLogs);
      });

      return () => {
        window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleAnnUpdate);
        unsubscribeContribs();
        unsubscribeLeaderboard();
        unsubscribeFeedbacks();
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
        toast.success('Đăng nhập thành công', 'Chào mừng Quản trị viên vào Ban điều hành!');
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
    try {
      // 1. Optimistic update - remove immediately
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      toast.info('Đã xóa phản hồi', 'Đã loại bỏ góp ý khỏi hệ thống.');

      // 2. Perform delete in background
      deleteFeedback(id).catch((err) => {
        console.error('Firestore delete feedback error:', err);
        toast.error('Lỗi lưu trữ', 'Không thể đồng bộ trạng thái xóa lên máy chủ.');
      });
    } catch {
      toast.error('Lỗi xóa', 'Không thể xóa phản hồi.');
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
      // 1. Instant optimistic update in local state - update status to approved
      setContributions((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                status: 'approved',
                filesCount: count,
                approvedAt: new Date().toISOString(),
                approvedBy: 'Admin'
              }
            : c
        )
      );
      setApproveModalItem(null);

      // 2. Perform atomic approval (updates contribution status & increments contributor record)
      await approveContribution(item, 'Admin', count);

      // 3. Immediately refresh Leaderboard in Admin page state
      const updatedLeaderboard = getStoredContributors();
      setLeaderboardList(updatedLeaderboard);
      fetchContributorsFromFirestore().then((serverList) => {
        if (serverList && serverList.length > 0) setLeaderboardList(serverList);
      }).catch(() => {});

      toast.success(
        'Đã duyệt tài liệu thành công!',
        `Đã công nhận ${count} tài liệu cho ${item.contributorName} và cập nhật Bảng Xếp Hạng.`
      );
    } catch (err: any) {
      console.error('Approval error:', err);
      toast.error('Lỗi phê duyệt', 'Không thể đồng bộ trạng thái duyệt lên máy chủ.');
      // Rollback optimistic update by fetching latest contributions
      loadContributions();
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
      const updated = getStoredContributors();
      setLeaderboardList(updated);
    } catch {
      toast.error('Lỗi cập nhật', 'Không thể lưu số lượng mới');
    } finally {
      setActionProcessingId(null);
    }
  };

  // Open Rejection Modal
  const handleOpenRejectModal = (item: FirestoreContribution) => {
    setRejectModalData({
      item,
      presetKey: 'duplicate',
      customReason: 'Tài liệu đã có sẵn trong kho học liệu HCMUE-FIT StudyVault hoặc đã được đóng góp trước đó.',
      copied: false
    });
  };

  // Compute effective rejection reason and apology email content
  const getEffectiveRejectionReason = (state: RejectModalState) => {
    if (state.presetKey === 'custom') {
      return state.customReason.trim() || 'Tài liệu chưa phù hợp với yêu cầu của kho học liệu.';
    }
    const preset = REJECTION_PRESETS.find((p) => p.id === state.presetKey);
    return state.customReason.trim() || preset?.text || 'Tài liệu không phù hợp hoặc đã xuất hiện trong kho.';
  };

  const generateRejectionEmail = (item: FirestoreContribution, reasonText: string) => {
    const subjectName = item.targetSubjectName || item.customSubjectName || getSubjectNameByCode(item.targetSubjectCode) || 'Học phần';
    const subjectLine = `[HCMUE-FIT StudyVault] Phản hồi đóng góp tài liệu môn [${item.targetSubjectCode}] ${subjectName}`;
    const studentName = item.contributorName || 'bạn';

    const bodyText = `Kính gửi ${studentName},

Admin Kho học liệu CNTT (HCMUE-FIT StudyVault) xin chân thành cảm ơn bạn đã quan tâm và gửi tài liệu đóng góp cho học phần [${item.targetSubjectCode}] ${subjectName}.

Sau khi rà soát và kiểm duyệt, Admin rất tiếc phải thông báo rằng tài liệu này chưa thể được phê duyệt vào kho học liệu chung với lý do:
👉 "${reasonText}"

Admin rất trân trọng tinh thần học tập, chia sẻ và cống hiến vì cộng đồng sinh viên Khoa Công nghệ Thông tin - Trường Đại học Sư phạm TP.HCM. Rất mong sẽ tiếp tục nhận được những tài liệu học tập bổ ích khác từ bạn trong tương lai!

Chúc bạn luôn có những kỳ học thành công và đạt kết quả xuất sắc!

Trân trọng,
Admin HCMUE-FIT StudyVault
Khoa Công nghệ Thông tin - Trường ĐH Sư phạm TP.HCM
Website: https://fit-hcmue-studyvault.web.app`;

    return {
      toEmail: item.email || '',
      subjectLine,
      bodyText
    };
  };

  // Perform Rejection Action
  const handleConfirmReject = async (sendMailClient: boolean) => {
    if (!rejectModalData) return;
    const { item } = rejectModalData;
    const reasonText = getEffectiveRejectionReason(rejectModalData);
    const { toEmail, subjectLine, bodyText } = generateRejectionEmail(item, reasonText);

    setIsRejecting(true);
    setActionProcessingId(item.id);

    try {
      // 1. Optimistic update - update item to rejected
      setContributions((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? { ...c, status: 'rejected', adminFeedback: reasonText }
            : c
        )
      );

      // 2. Reject in backend in the background
      rejectContribution(item.id, reasonText).catch((err) => {
        console.error('Firestore rejection error:', err);
        toast.error('Lỗi lưu trữ', 'Không thể đồng bộ trạng thái từ chối lên máy chủ.');
      });

      // 3. Open mailto client if requested and email exists
      if (sendMailClient && toEmail) {
        const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyText)}`;
        window.location.href = mailtoUrl;
      }

      toast.info('Đã từ chối tài liệu', 'Đã lưu lý do phản hồi.');
      setRejectModalData(null);
    } catch {
      toast.error('Lỗi xử lý', 'Không thể cập nhật trạng thái từ chối.');
    } finally {
      setIsRejecting(false);
      setActionProcessingId(null);
    }
  };

  // Copy rejection email body
  const handleCopyRejectionEmail = async () => {
    if (!rejectModalData) return;
    const reasonText = getEffectiveRejectionReason(rejectModalData);
    const { bodyText } = generateRejectionEmail(rejectModalData.item, reasonText);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(bodyText);
        setRejectModalData((prev) => (prev ? { ...prev, copied: true } : null));
        toast.success('Đã sao chép nội dung email', 'Bạn có thể dán vào Gmail hoặc hòm thư để gửi cho sinh viên.');
        setTimeout(() => {
          setRejectModalData((prev) => (prev ? { ...prev, copied: false } : null));
        }, 3000);
      }
    } catch {
      toast.error('Lỗi sao chép', 'Không thể sao chép văn bản vào clipboard.');
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
      const updated = getStoredContributors();
      setLeaderboardList(updated);
      toast.success('Cập nhật BXH thành công', `${delta > 0 ? `+${delta}` : delta} tài liệu cho ${name}.`);
    } catch {
      toast.error('Lỗi cập nhật BXH', 'Không thể điều chỉnh điểm số');
    }
  };

  const handleSaveContributorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContributor) return;

    try {
      const updated = await updateContributorRecord(editingContributor.id || editingContributor.studentId, {
        name: editingContributor.name,
        className: editingContributor.className,
        studentId: editingContributor.studentId,
        filesCount: Math.max(0, Number(editingContributor.filesCount) || 0),
        entriesCount: Math.max(0, Number(editingContributor.entriesCount) || 1),
        badgeTitle: editingContributor.badgeTitle,
        specialty: editingContributor.specialty,
        email: editingContributor.email
      });

      const updatedList = getStoredContributors();
      setLeaderboardList(updatedList);
      toast.success('Đã lưu thông tin sinh viên', `Hồ sơ vinh danh của ${updated?.name || editingContributor.name} đã được cập nhật thành công.`);
      setEditingContributor(null);
    } catch (err: any) {
      console.error('Lỗi khi lưu thông tin sinh viên:', err);
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

      const updatedList = getStoredContributors();
      setLeaderboardList(updatedList);
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
    } catch {
      toast.error('Lỗi thêm mới', 'Không thể thêm sinh viên vào BXH');
    }
  };

  const handleDeleteContributor = async (studentIdOrId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${name} khỏi Bảng Xếp Hạng?`)) return;
    try {
      // 1. Optimistic update
      setLeaderboardList((prev) => prev.filter((c) => c.studentId !== studentIdOrId && c.id !== studentIdOrId));
      toast.info('Đã xóa', `Đã xóa ${name} khỏi BXH`);

      // 2. Delete in background
      deleteContributorFromLeaderboard(studentIdOrId).catch((err) => {
        console.error('Firestore delete contributor error:', err);
        toast.error('Lỗi lưu trữ', 'Không thể đồng bộ trạng thái xóa lên máy chủ.');
      });
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

  const totalLeaderboardPages = Math.ceil(filteredLeaderboard.length / LEADERBOARD_PAGE_SIZE) || 1;
  const paginatedLeaderboard = filteredLeaderboard.slice(
    (leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE,
    leaderboardPage * LEADERBOARD_PAGE_SIZE
  );

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
            Ban Điều Hành Quản Trị
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
            {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập vào Ban điều hành'}
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
                Ban Điều Hành Quản Trị
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualRefreshAll}
            disabled={isRefreshingAll}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Tải lại toàn bộ dữ liệu quản trị ngay lập tức"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin' : ''}`} />
            <span>{isRefreshingAll ? 'Đang làm mới...' : 'Làm mới dữ liệu'}</span>
          </button>
          {lastRefreshedAt && (
            <span className="hidden sm:inline-block px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] font-mono border border-slate-200 dark:border-slate-800" title="Thời gian làm mới gần nhất">
              {lastRefreshedAt}
            </span>
          )}
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
              {/* Google Form Responses Sync Banner & Controls */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-indigo-950/20 to-purple-950/30 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>Đồng bộ đóng góp từ Google Form</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Auto Parser & BXH Sync
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tự động trích xuất phản hồi gửi từ Google Form, bóc tách môn học, MSSV và chuyển vào hàng đợi duyệt tài liệu
                      </p>
                    </div>
                  </div>

                  {/* Form URL display & inline edit */}
                  <div className="pt-0.5 flex items-center gap-2 text-xs flex-wrap">
                    {isEditingFormUrl ? (
                      <div className="flex items-center gap-2 w-full max-w-xl">
                        <input
                          type="text"
                          value={formSheetUrlInput}
                          onChange={(e) => setFormSheetUrlInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0c1220] border border-emerald-500/50 text-xs text-slate-900 dark:text-white"
                          placeholder="Dán link Google Sheet Form Responses..."
                        />
                        <button
                          onClick={() => {
                            setActiveFormSheetId(formSheetUrlInput);
                            setIsEditingFormUrl(false);
                            toast.success('Đã lưu cấu hình Google Form Sheet!');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setIsEditingFormUrl(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 flex-wrap">
                        <span className="font-semibold text-[11px] text-slate-500 dark:text-slate-400">Google Sheet phản hồi:</span>
                        <a
                          href={formSheetUrlInput}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] hover:underline flex items-center gap-1 truncate max-w-xs sm:max-w-md"
                          title={formSheetUrlInput}
                        >
                          <span className="truncate">{formSheetUrlInput}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <button
                          onClick={() => setIsEditingFormUrl(true)}
                          className="text-[11px] text-indigo-500 hover:text-indigo-400 font-medium underline cursor-pointer"
                        >
                          Đổi link Sheet
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => setIsFormGuideModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700/60"
                    title="Xem quy trình bóc tách logic và cập nhật BXH"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hướng dẫn logic BXH</span>
                  </button>

                  <button
                    onClick={handleSyncGoogleForm}
                    disabled={isSyncingFormResponses}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFormResponses ? 'animate-spin' : ''}`} />
                    <span>{isSyncingFormResponses ? 'Đang đồng bộ Form...' : 'Đồng bộ từ Google Form'}</span>
                  </button>
                </div>
              </div>

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
                                  {(() => {
                                    if (!item.createdAt) return '';
                                    let d: Date;
                                    if (typeof item.createdAt === 'object' && (item.createdAt as any)?.toDate) {
                                      d = (item.createdAt as any).toDate();
                                    } else {
                                      d = new Date(item.createdAt);
                                    }
                                    return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
                                  })()}
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
                                  onClick={() => handleOpenRejectModal(item)}
                                  disabled={actionProcessingId === item.id}
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}
                            {item.status === 'rejected' && (
                              <button
                                onClick={() => handleOpenRejectModal(item)}
                                disabled={actionProcessingId === item.id}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                title="Xem nội dung thư phản hồi từ chối"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Thư phản hồi</span>
                              </button>
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
                <div className="space-y-3">
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
                        {paginatedLeaderboard.map((item, idx) => {
                          const globalRank = (leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE + idx + 1;
                          return (
                            <tr key={item.id || item.studentId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-3 font-mono font-bold">#{globalRank}</td>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 30-item Pagination Controls */}
                  {totalLeaderboardPages > 1 && (
                    <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        Hiển thị <span className="font-bold text-slate-900 dark:text-white">{filteredLeaderboard.length}</span> người dùng (Trang {leaderboardPage}/{totalLeaderboardPages})
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={leaderboardPage === 1}
                          onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-medium"
                        >
                          Trước
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {leaderboardPage} / {totalLeaderboardPages}
                        </span>
                        <button
                          disabled={leaderboardPage === totalLeaderboardPages}
                          onClick={() => setLeaderboardPage((p) => Math.min(totalLeaderboardPages, p + 1))}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-medium"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
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
                        {(() => {
                          const dateVal = fb.createdAt || (fb as any).date;
                          if (!dateVal) return '';
                          let d: Date;
                          if (typeof dateVal === 'object' && (dateVal as any)?.toDate) {
                            d = (dateVal as any).toDate();
                          } else {
                            d = new Date(dateVal);
                          }
                          return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
                        })()}
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
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      const levelRank = getRankLevel(count).rank;
                      if (editingContributor) {
                        setEditingContributor({ ...editingContributor, filesCount: count, badgeTitle: levelRank });
                      } else {
                        setNewContributorForm({ ...newContributorForm, filesCount: count, badgeTitle: levelRank });
                      }
                    }}
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

      {/* MODAL 4: Hộp thoại Từ chối & Gửi Email Phản hồi / Xin lỗi */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {rejectModalData.item.status === 'rejected' ? 'Thư phản hồi từ chối tài liệu' : 'Từ chối tài liệu & Gửi thư phản hồi'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phản hồi lịch sự, xin lỗi và nêu rõ lý do không thể tiếp nhận tài liệu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalData(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Contributor Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400">Sinh viên: </span>
                  <strong className="text-slate-900 dark:text-white">{rejectModalData.item.contributorName}</strong> ({rejectModalData.item.studentId || 'Chưa rõ MSSV'})
                </div>
                <div>
                  <span className="text-slate-400">Email: </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{rejectModalData.item.email || 'Chưa cung cấp email'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">Học phần: </span>
                  <strong className="text-slate-900 dark:text-white">[{rejectModalData.item.targetSubjectCode}] {rejectModalData.item.targetSubjectName || rejectModalData.item.customSubjectName || getSubjectNameByCode(rejectModalData.item.targetSubjectCode)}</strong>
                </div>
              </div>

              {/* Presets Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Chọn lý do từ chối chính:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REJECTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setRejectModalData((prev) =>
                          prev
                            ? {
                                ...prev,
                                presetKey: preset.id,
                                customReason: preset.id === 'custom' ? '' : preset.text
                              }
                            : null
                        )
                      }
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-2.5 ${
                        rejectModalData.presetKey === preset.id
                          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 shadow-xs'
                          : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        rejectModalData.presetKey === preset.id
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {rejectModalData.presetKey === preset.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-semibold text-xs leading-tight">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom reason / Note edit */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Chi tiết lý do phản hồi (sẽ hiển thị trực tiếp trong thư gửi sinh viên):
                </label>
                <textarea
                  rows={2}
                  value={rejectModalData.customReason}
                  onChange={(e) => {
                    const text = e.target.value;
                    setRejectModalData((prev) => (prev ? { ...prev, customReason: text } : null));
                  }}
                  placeholder="Nhập chi tiết lý do từ chối hoặc hướng dẫn bổ sung cho sinh viên..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                />
              </div>

              {/* Live Email Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Xem trước nội dung email phản hồi:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRejectionEmail}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    {rejectModalData.copied ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép nội dung email</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all border border-slate-800 max-h-48 overflow-y-auto">
                  {generateRejectionEmail(rejectModalData.item, getEffectiveRejectionReason(rejectModalData)).bodyText}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRejectionEmail}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>

                {rejectModalData.item.email && (
                  <button
                    type="button"
                    disabled={isRejecting}
                    onClick={() => handleConfirmReject(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                    title="Mở ứng dụng thư điện tử để gửi phản hồi và cập nhật từ chối"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Mail & Lưu</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => handleConfirmReject(false)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isRejecting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Form & Leaderboard Sync Logic Guide Modal */}
      {isFormGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Quy trình xử lý Google Form & Cập nhật BXH
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cơ chế tự động hóa từ khi sinh viên gửi Form đến khi cập nhật lên Bảng Vinh Danh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormGuideModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Sinh viên gửi tài liệu qua Google Form</span>
                </div>
                <p className="pl-7 text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sinh viên điền thông tin (Họ tên, MSSV, Email, Mô tả tài liệu, Link Google Drive). Câu trả lời được lưu trực tiếp vào Google Spreadsheet liên kết.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Thuật toán bóc tách & Đưa vào hàng đợi duyệt</span>
                </div>
                <p className="pl-7 text-slate-500 dark:text-slate-400 leading-relaxed">
                  Khi Admin nhấn <b>&quot;Đồng bộ từ Google Form&quot;</b>, hệ thống tự động:
                </p>
                <ul className="pl-11 list-disc space-y-1 text-slate-500 dark:text-slate-400">
                  <li>Trích xuất loại tài liệu: <b>Đề thi</b>, <b>Bài tập</b>, <b>Bài giảng</b>, <b>Đồ án</b>.</li>
                  <li>Nhận diện mã môn (ví dụ: <code className="text-indigo-400 font-mono">COMP1010</code>) và tên môn học từ kho dữ liệu Khoa CNTT.</li>
                  <li>Lấy MSSV, Họ tên, Email và Link file Google Drive.</li>
                  <li>Tự động loại bỏ trùng lặp và chuyển các bản ghi mới vào danh sách <b>Chờ duyệt</b>.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Admin kiểm duyệt & Xác nhận số lượng file</span>
                </div>
                <p className="pl-7 text-slate-500 dark:text-slate-400 leading-relaxed">
                  Admin bấm vào link Drive để kiểm tra nhanh file. Nhấn <b>&quot;Phê duyệt&quot;</b> và điều chỉnh số file đóng góp (1, 2, 3...) để tính điểm chuẩn xác nhất cho sinh viên.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Tự động cập nhật Bảng Xếp Hạng & Kho học liệu</span>
                </div>
                <p className="pl-7 text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  - <b>Bảng Xếp Hạng</b>: Tự động cộng dồn số lượng tài liệu theo <b>MSSV</b> của sinh viên, trao huy hiệu vinh danh và tự động sắp xếp lại thứ hạng theo thời gian thực.<br />
                  - <b>Môn học</b>: Tài liệu được kích hoạt và xuất hiện ngay trong trang chi tiết môn học tương ứng.<br />
                  - <b>Từ chối</b>: Nếu tài liệu không phù hợp/hỏng link, hệ thống tạo sẵn mẫu email phản hồi chuyên nghiệp để Admin gửi sinh viên chỉ với 1 click.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsFormGuideModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Đã hiểu quy trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
