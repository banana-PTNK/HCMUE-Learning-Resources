import React, { useState } from 'react';
import {
  X,
  Bug,
  Send,
  CheckCircle2,
  Loader2
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
      await submitUserFeedback({
        type: 'bug',
        title: 'Báo lỗi hệ thống từ người dùng',
        content: content.trim(),
        userName: 'Sinh viên FIT HCMUE',
        rating: 5
      });

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      setIsSuccess(true);
      toast.success('Cảm ơn bạn đã gửi báo lỗi!');

      setTimeout(() => {
        setIsSuccess(false);
        setContent('');
        onClose();
      }, 1500);
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
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <Bug className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-lg font-bold text-amber-400 tracking-tight">
              Báo lỗi hệ thống
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
              Đã gửi báo lỗi thành công!
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Cảm ơn đóng góp của bạn giúp nhóm phát triển hoàn thiện hệ thống tốt hơn.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              Hệ thống có chỗ nào chưa tốt hoặc bạn gặp lỗi gì, hãy mô tả bên dưới để gửi phản hồi cho nhóm phát triển. Câu hỏi và câu trả lời gần nhất sẽ được gửi kèm để hỗ trợ kiểm tra.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-white">
                Mô tả vấn đề
              </label>
              <textarea
                required
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="VD: Các môn học chưa có tài liệu"
                className="w-full p-3.5 rounded-xl bg-[#080d19] border border-amber-500/80 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition resize-none"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#232f45] hover:bg-[#2c3b57] text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi báo lỗi</span>
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
