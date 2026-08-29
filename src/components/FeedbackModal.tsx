import React, { useState } from 'react';
import {
  X,
  Bug,
  Send,
  CheckCircle2,
  Loader2,
  Sparkles,
  MessageSquarePlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitUserFeedback } from '../services/feedbackService';
import { useToast } from '../context/ToastContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Vui lòng nhập mô tả vấn đề hoặc góp ý');
      return;
    }

    setIsSubmitting(true);
    try {
      // Instant submission (< 10ms)
      submitUserFeedback({
        type: 'general',
        title: 'Báo lỗi / Góp ý hệ thống',
        content: content.trim(),
        userName: senderName.trim() || 'Sinh viên FIT HCMUE',
        userEmail: senderContact.includes('@') ? senderContact.trim() : undefined,
        studentId: !senderContact.includes('@') && senderContact.trim() ? senderContact.trim() : undefined,
        rating: 5
      });

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      setIsSuccess(true);
      toast.success('Đã gửi phản hồi thành công!', 'Cảm ơn đóng góp quý báu của bạn cho StudyVault.');

      setTimeout(() => {
        setIsSuccess(false);
        setContent('');
        onClose();
      }, 1200);
    } catch (err: any) {
      toast.error('Không thể gửi báo lỗi', err?.message || 'Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="feedback-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="feedback-modal-card"
        className="w-full max-w-lg bg-[#0e1626] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bug className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-lg font-bold text-amber-400 tracking-tight">
              Báo lỗi / Góp ý hệ thống
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-bold text-white">
              Đã gửi phản hồi thành công!
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Cảm ơn đóng góp của bạn giúp Admin hoàn thiện hệ thống tốt hơn mỗi ngày.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Nội dung báo lỗi hoặc ý kiến góp ý <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mô tả chi tiết lỗi gặp phải, liên kết học liệu bị hỏng, hoặc đóng góp ý tưởng cải tiến hệ thống StudyVault..."
                className="w-full p-3.5 rounded-xl bg-[#080d19] border border-amber-500/60 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition resize-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Họ tên (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-xl bg-[#080d19] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Email / MSSV (để phản hồi)
                </label>
                <input
                  type="text"
                  value={senderContact}
                  onChange={(e) => setSenderContact(e.target.value)}
                  placeholder="VD: 51.01.104.xxx hoặc email"
                  className="w-full px-3 py-2 rounded-xl bg-[#080d19] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#232f45] hover:bg-[#2c3b57] text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi phản hồi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
