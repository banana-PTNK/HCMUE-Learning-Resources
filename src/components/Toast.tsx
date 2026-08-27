import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ToastItem, ToastType } from '../types';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<
  ToastType,
  {
    icon: React.ReactNode;
    iconContainer: string;
    borderAccent: string;
    progressBar: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    iconContainer: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    borderAccent: 'border-emerald-300 dark:border-emerald-500/40',
    progressBar: 'bg-emerald-500',
  },
  info: {
    icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    iconContainer: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400',
    borderAccent: 'border-blue-300 dark:border-blue-500/40',
    progressBar: 'bg-blue-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    iconContainer: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
    borderAccent: 'border-amber-300 dark:border-amber-500/40',
    progressBar: 'bg-amber-500',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    iconContainer: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400',
    borderAccent: 'border-rose-300 dark:border-rose-500/40',
    progressBar: 'bg-rose-500',
  },
};

export const ToastItemComponent: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const { id, message, description, type = 'info', duration = 3800, action } = toast;
  const config = typeStyles[type] || typeStyles.info;

  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (duration <= 0) return;

    if (isPaused) {
      remainingTimeRef.current = Math.max(
        0,
        remainingTimeRef.current - (Date.now() - startTimeRef.current)
      );
      return;
    }

    startTimeRef.current = Date.now();
    const intervalTime = 20;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
      const newProgress = (currentRemaining / duration) * 100;
      setProgress(newProgress);

      if (currentRemaining <= 0) {
        clearInterval(timer);
        onDismiss(id);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [id, duration, isPaused, onDismiss]);

  return (
    <motion.div
      id={`toast-item-${id}`}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative w-full sm:w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/10 dark:shadow-black/40 backdrop-blur-md p-3.5 transition-all duration-200 overflow-hidden ${config.borderAccent}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5 ${config.iconContainer}`}
        >
          {config.icon}
        </div>

        {/* Message and Description */}
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {message}
          </p>
          {description && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}

          {/* Action button if provided */}
          {action && (
            <div className="mt-2">
              <button
                id={`toast-action-${id}`}
                onClick={() => {
                  action.onClick();
                  onDismiss(id);
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          id={`toast-close-${id}`}
          onClick={() => onDismiss(id)}
          className="shrink-0 p-1 -mr-1 -mt-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtle Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
          <div
            className={`h-full ${config.progressBar} opacity-70 transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-notifications-container"
      aria-label="Thông báo hệ thống"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5 pointer-events-none sm:bottom-6 sm:right-6"
    >
      <div className="pointer-events-auto flex flex-col gap-2.5 items-end">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItemComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
