import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  Send,
  Link as LinkIcon,
  User,
  ExternalLink,
  Mail,
  Hash,
  GraduationCap,
  FileText,
  RotateCcw,
  Sparkles,
  Trophy,
  ShieldCheck,
  AlertTriangle,
  Info,
  PlusCircle,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { mockSubjects, mockContributors } from '../data/mockData';
import { Contributor } from '../types';
import { ContributorLeaderboard } from '../components/ContributorLeaderboard';
import { useToast } from '../context/ToastContext';
import { useGoogleSheet } from '../context/GoogleSheetContext';
import { OFFICIAL_CONTRIBUTION_FORM_URL } from '../config/driveLinks';
import {
  submitContributionToFirestore,
  subscribeToContributors
} from '../services/contributionService';
import {
  getStoredContributors
} from '../utils/contributorStorage';
import { sanitizeAndValidateResourceUrl } from '../utils/contributionUtils';

interface ContributePageProps {
  onNavigate?: (path: string) => void;
  onOpenContributeModal?: (tab?: 'submit' | 'lookup') => void;
  onOpenLookupModal?: (initialQuery?: string) => void;
}

export const ContributePage: React.FC<ContributePageProps> = ({
  onNavigate,
  onOpenContributeModal,
  onOpenLookupModal
}) => {
  const { toast } = useToast();
  const { subjects } = useGoogleSheet();
  const formRef = useRef<HTMLDivElement>(null);

  // Form State
  const [targetSubjectCode, setTargetSubjectCode] = useState(subjects[0]?.code || 'IT002');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [studentId, setStudentId] = useState(() => localStorage.getItem('last_student_id') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('last_student_class') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('last_student_email') || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    isExisting: boolean;
    name: string;
    studentId: string;
    className?: string;
  } | null>(null);

  // URL real-time validation state
  const urlCheck = driveUrl.trim() ? sanitizeAndValidateResourceUrl(driveUrl) : null;

  // Dynamic contributors state synced from Firestore / memory
  const [contributors, setContributors] = useState<Contributor[]>(() => getStoredContributors());

  useEffect(() => {
    // Subscribe to real-time leaderboard changes
    const unsubscribe = subscribeToContributors((list) => {
      if (list && list.length > 0) {
        setContributors(list);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenGoogleForm = () => {
    window.open(OFFICIAL_CONTRIBUTION_FORM_URL, '_blank', 'noopener,noreferrer');
    toast.info(
      'Đang mở Google Form',
      'Bạn có thể điền link tài liệu hoặc file Google Drive trực tiếp trên biểu mẫu Google Form.'
    );
  };

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstInput = formRef.current?.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check basic required fields
    if (!driveUrl.trim() || !studentClass.trim() || !studentId.trim() || !contributorName.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc có dấu (*)');
      return;
    }

    // 2. Validate custom subject if OTHER is selected
    if (targetSubjectCode === 'OTHER' && !customSubjectName.trim()) {
      toast.error('Chưa nhập tên môn', 'Vui lòng nhập tên môn học hoặc mã môn bạn muốn đề xuất.');
      return;
    }

    // 3. Sanitize and validate URL
    const checkedUrl = sanitizeAndValidateResourceUrl(driveUrl);
    if (!checkedUrl.isValid) {
      toast.error('Liên kết không hợp lệ', checkedUrl.errorMessage || 'Vui lòng kiểm tra lại liên kết tài liệu.');
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem('last_student_id', studentId.trim());
      localStorage.setItem('last_student_class', studentClass.trim());
      if (email.trim()) localStorage.setItem('last_student_email', email.trim());

      await submitContributionToFirestore({
        targetSubjectCode,
        customSubjectName: targetSubjectCode === 'OTHER' ? customSubjectName.trim() : undefined,
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
      setIsSuccess(true);
      setSubmissionFeedback({
        isExisting: false,
        name: contributorName.trim(),
        studentId: studentId.trim(),
        className: studentClass.trim()
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(
        'Đã gửi đóng góp thành công!',
        `Cảm ơn ${contributorName.trim()}! Tài liệu đã được chuyển đến Admin để kiểm duyệt và cập nhật lên BXH chính thức.`
      );
    } catch (err: any) {
      console.error('Error submitting contribution to Firestore:', err);
      setIsSubmitting(false);
      toast.error('Lỗi khi gửi tài liệu', 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
    }
  };

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 -mb-4 font-mono">
        <button
          onClick={() => {
            if (typeof onNavigate === 'function') {
              onNavigate('/');
            }
          }}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          Trang chủ
        </button>
        <span>/</span>
        <span>Cộng đồng & Vinh danh</span>
        <span>/</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Đóng góp học thuật</span>
      </nav>

      {/* Top Banner / Hero */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-50 via-white to-blue-50/60 dark:from-[#0d1527] dark:via-[#131b2e] dark:to-[#0f172a] text-slate-900 dark:text-white relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-indigo-100/80 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Chia sẻ tài liệu & Tích lũy vinh danh
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 max-w-2xl leading-relaxed mt-2.5 font-normal border-l-2 border-indigo-500/80 dark:border-indigo-400/80 pl-3.5 py-0.5">
            Mỗi tài liệu được chia sẻ sẽ hỗ trợ trực tiếp hàng ngàn sinh viên khoa CNTT, đồng thời ghi danh bạn trên Bảng Xếp Hạng Đóng Góp Học Thuật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleOpenGoogleForm}
            id="open-google-form-btn"
            className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center gap-3 shadow-lg shadow-blue-600/35 hover:shadow-xl hover:shadow-blue-600/50 hover:scale-[1.02] transition-all duration-200 cursor-pointer active:scale-95 border border-blue-400/30"
            title="Mở Google Form đóng góp tài liệu"
          >
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight leading-none select-none">Form</span>
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Contribution Form Section */}
      <div ref={formRef} className="w-full">
        <div className="p-5 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 sm:space-y-6">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center shrink-0 shadow-xs">
                <Upload className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Gửi tài liệu đóng góp học thuật
                </h2>
              </div>
            </div>
          </div>

          {isSuccess ? (
            <div className="p-6 sm:p-10 text-center space-y-5 animate-in fade-in">
              {/* Animated Checkmark Icon */}
              <div className="relative inline-flex items-center justify-center">
                {/* Radiant Backdrop */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.8, 1.2, 1], opacity: [0.3, 0.6, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                  className="absolute w-24 h-24 rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 blur-xl"
                />

                {/* Animated Circle */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1
                  }}
                  className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 border-4 border-emerald-100 dark:border-emerald-950/80"
                >
                  <motion.svg
                    className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-current"
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

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="space-y-1.5"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>CẢM ƠN BẠN ĐÃ ĐÓNG GÓP!</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {submissionFeedback?.isExisting ? 'Cộng dồn thành tích thành công!' : 'Ghi nhận đóng góp thành công!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Đã ghi nhận đóng góp cho <strong className="text-slate-900 dark:text-white">{submissionFeedback?.name}</strong> (MSSV: {submissionFeedback?.studentId}). Dữ liệu trên Bảng Xếp Hạng đã được tự động cập nhật!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left flex items-center justify-between gap-4 max-w-md mx-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs font-mono border border-indigo-200 dark:border-indigo-800">
                    {submissionFeedback?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{submissionFeedback?.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono">
                        +1 Lượt gửi
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
                      <span>MSSV: {submissionFeedback?.studentId}</span>
                      {submissionFeedback?.className && (
                        <span>• Lớp: {submissionFeedback.className}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Đồng bộ BXH</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="pt-1 flex justify-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setDriveUrl('');
                    setNotes('');
                  }}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Gửi thêm tài liệu khác</span>
                </button>
              </motion.div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* 2-Column Responsive Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
                {/* CỘT TRÁI - KHỐI 1: THÔNG TIN TÀI LIỆU */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b-2 border-indigo-100 dark:border-indigo-950/80">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                      1
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Thông tin tài liệu học thuật
                    </h3>
                  </div>

                  {/* Mục 1: Môn học liên quan */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Môn học liên quan <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={targetSubjectCode}
                        onChange={(e) => setTargetSubjectCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none cursor-pointer transition shadow-2xs"
                      >
                        <optgroup label="Danh sách môn học hiện có">
                          {subjects.map((s) => (
                            <option key={s.code} value={s.code} className="py-1">
                              {s.code} - {s.name} ({s.credits} TC)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Khác">
                          <option value="OTHER" className="py-1 font-bold text-indigo-600 dark:text-indigo-400">
                            ➕ Đề xuất môn học khác / Môn mới...
                          </option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Ô nhập môn học đề xuất nếu chọn OTHER */}
                    {targetSubjectCode === 'OTHER' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-1.5 mt-2"
                      >
                        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Thông tin môn học đề xuất mới</span>
                        </div>
                        <input
                          type="text"
                          required={targetSubjectCode === 'OTHER'}
                          placeholder="Nhập mã môn & tên môn học (ví dụ: MT002 - Toán cao cấp 2)..."
                          value={customSubjectName}
                          onChange={(e) => setCustomSubjectName(e.target.value)}
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                          Admin sẽ tạo chuyên mục mới cho môn này khi duyệt bài đóng góp của bạn.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Mục 2: Liên kết tài liệu */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Liên kết tài liệu (Google Drive / GitHub / OneDrive) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="https://drive.google.com/drive/folders/..."
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
                        className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900/90 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:outline-none transition shadow-2xs font-mono ${
                          urlCheck && !urlCheck.isValid
                            ? 'border-rose-300 dark:border-rose-700/80 focus:border-rose-500 focus:ring-rose-500/10'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-indigo-500/10'
                        }`}
                      />
                    </div>

                    {/* Cảnh báo link không hợp lệ */}
                    {urlCheck && !urlCheck.isValid && (
                      <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium pl-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{urlCheck.errorMessage}</span>
                      </p>
                    )}

                    {/* Cảnh báo My Drive cá nhân */}
                    {urlCheck?.warningMessage && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span>{urlCheck.warningMessage}</span>
                      </div>
                    )}

                    {/* Hướng dẫn quyền truy cập Google Drive */}
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 shadow-2xs">
                      <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="leading-snug">
                        <strong>Lưu ý:</strong> Vui lòng bật chế độ <strong>"Bất kỳ ai có liên kết đều có thể xem"</strong> trên Google Drive để được duyệt ngay.
                      </p>
                    </div>
                  </div>

                  {/* Mục 3: Ghi chú thêm (Không bắt buộc) */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Ghi chú thêm <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">(Không bắt buộc)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ví dụ: Đề thi cuối kỳ năm học 2024-2025 có kèm lời giải chi tiết của nhóm..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none resize-none transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* CỘT PHẢI - KHỐI 2: THÔNG TIN NGƯỜI ĐÓNG GÓP & VINH DANH */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b-2 border-blue-100 dark:border-blue-950/80">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                      2
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Thông tin vinh danh & Tích điểm
                    </h3>
                  </div>

                  {/* Họ tên */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
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
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Mã số sinh viên (MSSV) */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
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
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Lớp học / Khóa sinh viên */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Lớp học / Khóa sinh viên <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 48.01.CNTT.A, K48..."
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Email nhận kết quả */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Email nhận kết quả</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Khuyến khích</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="student@hcmue.edu.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hàng Submit */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 font-bold text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang gửi tài liệu...' : 'Gửi tài liệu đóng góp ngay'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Dedicated Contributor Leaderboard Component Section */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <ContributorLeaderboard
          contributors={contributors}
          onScrollToForm={handleScrollToForm}
          onOpenContributeModal={onOpenContributeModal}
          onOpenLookupModal={onOpenLookupModal}
        />
      </div>
    </div>
  );
};
