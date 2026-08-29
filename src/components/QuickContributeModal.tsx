import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  GraduationCap,
  Link as LinkIcon,
  User,
  Hash,
  Mail,
  Send,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Trophy,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { mockSubjects } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { OFFICIAL_CONTRIBUTION_FORM_URL } from '../config/driveLinks';
import {
  submitContributionToFirestore,
  searchContributionsByStudent,
  FirestoreContribution
} from '../services/contributionService';
import { sanitizeAndValidateResourceUrl } from '../utils/contributionUtils';

interface QuickContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectCode?: string;
  initialTab?: 'submit' | 'lookup';
}

export const QuickContributeModal: React.FC<QuickContributeModalProps> = ({
  isOpen,
  onClose,
  defaultSubjectCode,
  initialTab = 'submit'
}) => {
  const { toast } = useToast();
  const subjects = mockSubjects;

  const [activeTab, setActiveTab] = useState<'submit' | 'lookup'>(initialTab);
  const [subjectCode, setSubjectCode] = useState(defaultSubjectCode || 'IT002');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [studentId, setStudentId] = useState(() => localStorage.getItem('last_student_id') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('last_student_class') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('last_student_email') || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    isExisting: boolean;
    name: string;
    studentId: string;
    className?: string;
    subjectName: string;
  } | null>(null);

  // URL real-time validation
  const urlCheck = driveUrl.trim() ? sanitizeAndValidateResourceUrl(driveUrl) : null;

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState(() => localStorage.getItem('last_student_id') || '');
  const [lookupResults, setLookupResults] = useState<FirestoreContribution[]>([]);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialTab === 'lookup' && lookupQuery.trim()) {
        handleLookup();
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.code === subjectCode);

  const handleResetForm = () => {
    setIsSubmitted(false);
    setDriveUrl('');
    setNotes('');
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setDriveUrl('');
    setNotes('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl.trim() || !studentClass.trim() || !studentId.trim() || !contributorName.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ các thông tin bắt buộc có dấu (*)');
      return;
    }

    // Validate custom subject if OTHER is selected
    if (subjectCode === 'OTHER' && !customSubjectName.trim()) {
      toast.error('Chưa nhập tên môn', 'Vui lòng nhập tên môn học hoặc mã môn bạn muốn đề xuất.');
      return;
    }

    // Sanitize and validate URL
    const checkedUrl = sanitizeAndValidateResourceUrl(driveUrl);
    if (!checkedUrl.isValid) {
      toast.error('Liên kết không hợp lệ', checkedUrl.errorMessage || 'Vui lòng kiểm tra lại liên kết tài liệu.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save info for seamless lookup next time
      localStorage.setItem('last_student_id', studentId.trim());
      localStorage.setItem('last_student_class', studentClass.trim());
      if (email.trim()) localStorage.setItem('last_student_email', email.trim());

      await submitContributionToFirestore({
        targetSubjectCode: subjectCode,
        customSubjectName: subjectCode === 'OTHER' ? customSubjectName.trim() : undefined,
        assetType: 'all',
        driveUrl: checkedUrl.sanitizedUrl,
        filesCount: 1,
        contributorName: contributorName.trim(),
        studentId: studentId.trim(),
        className: studentClass.trim(),
        email: email.trim(),
        notes: notes.trim()
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
      setFeedback({
        isExisting: false,
        name: contributorName.trim(),
        studentId: studentId.trim(),
        className: studentClass.trim(),
        subjectName: subjectCode === 'OTHER' ? `Môn đề xuất: ${customSubjectName.trim()}` : (currentSubject ? `${currentSubject.code} - ${currentSubject.name}` : subjectCode)
      });

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.55 }
      });

      toast.success(
        'Đã gửi đóng góp thành công!',
        `Tài liệu đã được gửi đến Admin để kiểm duyệt. Bạn có thể dùng MSSV ${studentId.trim()} để tra cứu trạng thái bất kỳ lúc nào!`
      );
    } catch (err) {
      console.error('Submit contribution error:', err);
      setIsSubmitting(false);
      toast.error('Lỗi khi gửi tài liệu', 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
    }
  };

  const handleLookup = async (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : lookupQuery).trim();
    if (!q) {
      toast.info('Nhập thông tin tra cứu', 'Vui lòng nhập MSSV, Email hoặc Họ tên để tra cứu tiến độ xét duyệt.');
      return;
    }

    setIsLoadingLookup(true);
    setHasSearched(true);
    try {
      const results = await searchContributionsByStudent(q);
      setLookupResults(results);
    } catch (error) {
      console.error('Error during contribution lookup:', error);
      toast.error('Lỗi tra cứu', 'Không thể kết nối đến hệ thống kiểm duyệt. Vui lòng thử lại.');
    } finally {
      setIsLoadingLookup(false);
    }
  };

  return (
    <div
      id="quick-contribute-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
      onClick={handleClose}
    >
      <div
        id="quick-contribute-modal"
        className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090e18] shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Cổng Đóng Góp & Tra Cứu Tài Liệu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hệ thống chia sẻ học thuật & vinh danh sinh viên Khoa CNTT - HCMUE
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          {!isSubmitted && (
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'submit'
                    ? 'bg-white dark:bg-[#131b2e] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Đóng Góp Mới</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('lookup');
                  if (lookupQuery.trim()) {
                    handleLookup(lookupQuery);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'lookup'
                    ? 'bg-white dark:bg-[#131b2e] text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra Cứu Tiến Độ & Phản Hồi</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isSubmitted ? (
          <div className="p-6 sm:p-10 text-center space-y-6 my-auto overflow-y-auto flex-1">
            {/* Animated Checkmark Icon */}
            <div className="relative inline-flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 1], opacity: [0.3, 0.6, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute w-28 h-28 rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 blur-xl"
              />

              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }}
                className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 border-4 border-emerald-100 dark:border-emerald-950/80"
              >
                <motion.svg
                  className="w-10 h-10 text-white stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
                  />
                </motion.svg>
              </motion.div>
            </div>

            {/* Thank You Headings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="space-y-2"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>CẢM ƠN BẠN ĐÃ ĐÓNG GÓP!</span>
              </div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gửi tài liệu thành công!
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Tài liệu môn <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{feedback?.subjectName}</strong> của bạn đã được chuyển tới Admin. Bạn có thể tra cứu tiến độ xét duyệt bất kỳ lúc nào bằng MSSV <strong className="text-slate-900 dark:text-white font-mono">{feedback?.studentId}</strong>!
              </p>
            </motion.div>

            {/* Contributor Card Summary */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left flex items-center justify-between gap-4 max-w-md mx-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm font-mono border border-indigo-200 dark:border-indigo-800">
                  {feedback?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{feedback?.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-mono">
                      Chờ duyệt
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                    <span>MSSV: {feedback?.studentId}</span>
                    {feedback?.className && (
                      <span>• Lớp: {feedback.className}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <span>Tài liệu học tập</span>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2"
            >
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setActiveTab('lookup');
                  setLookupQuery(studentId);
                  handleLookup(studentId);
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer active:scale-98"
              >
                <Search className="w-4 h-4" />
                <span>Tra cứu tiến độ ngay</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Gửi thêm tài liệu khác</span>
              </button>
            </motion.div>
          </div>
        ) : activeTab === 'lookup' ? (
          /* TAB 2: TRA CỨU TIẾN ĐỘ & PHẢN HỒI ADMIN */
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
            {/* Guide banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed text-indigo-950 dark:text-indigo-200">
                <p className="font-bold">
                  Không cần kiểm tra email — Tra cứu phản hồi trực tiếp bằng MSSV:
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Dù bạn có điền email hay không, bạn luôn có thể nhập <strong>Mã số sinh viên (MSSV)</strong> dưới đây để xem tình trạng kiểm duyệt, điểm số BXH đã cộng, hoặc <strong>đọc lý do phản hồi chi tiết</strong> từ Admin nếu tài liệu bị từ chối/cần mở quyền link Drive.
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập MSSV của bạn (VD: 48.01.104.xxx hoặc email/tên)..."
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookup();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={isLoadingLookup}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                {isLoadingLookup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Tra cứu</span>
              </button>
            </div>

            {/* Lookup Results */}
            <div className="space-y-3 pt-1">
              {isLoadingLookup ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>Đang tra cứu lịch sử đóng góp trên hệ thống...</span>
                </div>
              ) : hasSearched && lookupResults.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Chưa tìm thấy bản ghi nào với từ khóa "{lookupQuery}"
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Vui lòng kiểm tra lại chính xác MSSV hoặc chuyển sang tab <strong>"Gửi Đóng Góp Mới"</strong> để chia sẻ tài liệu học tập đầu tiên nhé!
                  </p>
                </div>
              ) : lookupResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>Tìm thấy {lookupResults.length} lượt gửi đóng góp:</span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                      Cập nhật mới nhất
                    </span>
                  </div>

                  {lookupResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      {/* Top Header of item */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                              {item.targetSubjectCode}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                              {item.assetType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-mono">
                            <span>MSSV: {item.studentId}</span>
                            {item.className && <span>• Lớp: {item.className}</span>}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Đang chờ duyệt</span>
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã duyệt thành công</span>
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Đã từ chối / Cần chỉnh sửa</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Feedback & Notes Details */}
                      {item.status === 'rejected' && (
                        <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-1.5">
                          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Lý do phản hồi từ Admin:</span>
                          </div>
                          <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed font-medium pl-5.5">
                            "{item.adminFeedback || 'Link Drive chưa mở quyền truy cập công khai hoặc tài liệu chưa đúng định dạng.'}"
                          </p>
                          <div className="text-[11px] text-rose-500 dark:text-rose-400 pl-5.5 pt-0.5">
                            👉 Bạn vui lòng kiểm tra lại quyền truy cập Drive (chọn <em>Bất kỳ ai có liên kết</em>) rồi chuyển sang tab <strong>"Gửi Đóng Góp Mới"</strong> để gửi lại nhé!
                          </div>
                        </div>
                      )}

                      {item.status === 'approved' && (
                        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Tài liệu đã được kiểm duyệt và đưa vào kho học liệu chung của sinh viên.</span>
                        </div>
                      )}

                      {item.status === 'pending' && (
                        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Tài liệu đang trong hàng đợi xét duyệt (thường mất từ vài giờ đến 1 ngày làm việc).</span>
                        </div>
                      )}

                      {/* Footer Info: Drive Link & Notes */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <a
                          href={item.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Xem link đã nộp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {item.notes && (
                          <span className="text-[11px] text-slate-400 italic truncate max-w-[200px]" title={item.notes}>
                            "{item.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nhập Mã số sinh viên (MSSV) của bạn ở trên và nhấn <strong>"Tra cứu"</strong> để xem tình trạng xét duyệt các tài liệu đã gửi.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 1: FORM GỬI ĐÓNG GÓP TÀI LIỆU */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
            {/* KHỐI 1 - THÔNG TIN TÀI LIỆU */}
            <div className="space-y-4">
              {/* Mục 1: Môn học liên quan */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                  Môn học liên quan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  <optgroup label="Danh sách môn học hiện có">
                    {subjects.map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.code} - {sub.name} ({sub.credits} TC)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Khác">
                    <option value="OTHER" className="font-bold text-indigo-600 dark:text-indigo-400">
                      ➕ Đề xuất môn học khác / Môn mới...
                    </option>
                  </optgroup>
                </select>

                {/* Ô nhập môn học đề xuất nếu chọn OTHER */}
                {subjectCode === 'OTHER' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1.5 mt-2"
                  >
                    <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Thông tin môn học đề xuất mới</span>
                    </div>
                    <input
                      type="text"
                      required={subjectCode === 'OTHER'}
                      placeholder="Nhập mã môn & tên môn học (ví dụ: MT002 - Toán cao cấp 2)..."
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                    />
                  </motion.div>
                )}
              </div>

              {/* Mục 2: Liên kết tài liệu */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                  Liên kết tài liệu (Google Drive / GitHub / OneDrive) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="https://drive.google.com/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    onBlur={() => {
                      if (driveUrl.trim()) {
                        const res = sanitizeAndValidateResourceUrl(driveUrl);
                        if (res.sanitizedUrl && res.sanitizedUrl !== driveUrl) {
                          setDriveUrl(res.sanitizedUrl);
                        }
                      }
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/90 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden font-mono ${
                      urlCheck && !urlCheck.isValid
                        ? 'border-rose-300 dark:border-rose-700/80 focus:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    }`}
                  />
                </div>

                {/* Cảnh báo link không hợp lệ */}
                {urlCheck && !urlCheck.isValid && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{urlCheck.errorMessage}</span>
                  </p>
                )}

                {/* Cảnh báo My Drive cá nhân */}
                {urlCheck?.warningMessage && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>{urlCheck.warningMessage}</span>
                  </div>
                )}

                {/* Hướng dẫn quyền truy cập Google Drive (Đảm bảo độ tương phản chuẩn WCAG) */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="leading-snug">
                    <strong>Lưu ý:</strong> Vui lòng bật chế độ <strong>"Bất kỳ ai có liên kết đều có thể xem"</strong> trên Drive để được duyệt ngay.
                  </p>
                </div>
              </div>

              {/* Mục 4: Ghi chú thêm (Không bắt buộc) */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                  Ghi chú thêm <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Không bắt buộc)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đề thi cuối kỳ năm học 2024-2025 có kèm lời giải chi tiết..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            {/* KHỐI 2 - THÔNG TIN NGƯỜI ĐÓNG GÓP (TÍCH ĐIỂM VINH DANH) */}
            <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thông tin vinh danh & Nhận phản hồi
                </h4>
              </div>

              {/* Hàng 1 (Grid 2 cột): Họ tên & MSSV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    Họ tên / Nickname <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    Mã số sinh viên (MSSV) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="48.01.104.088"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Hàng 2 (Grid 2 cột): Lớp học & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                    Lớp <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Không bắt buộc)</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ví dụ: 48.01.CNTT.A... (hoặc để trống)"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>Email nhận phản hồi</span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">Khuyến khích</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="student@hcmue.edu.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Nút Gửi đóng góp ngay */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-99"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang gửi đóng góp...' : 'Gửi đóng góp ngay'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(OFFICIAL_CONTRIBUTION_FORM_URL, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Mở Google Form tiếp nhận chính thức</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
