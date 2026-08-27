import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastItem, ToastType, ToastAction } from '../types';
import { ToastContainer } from '../components/Toast';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (item: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => string;
    info: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => string;
    warning: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => string;
    error: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => string;
    custom: (item: Omit<ToastItem, 'id'>) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      id,
      duration: 3800,
      ...item,
    };

    setToasts((prev) => {
      // Keep up to 4 toasts simultaneously to avoid screen clutter
      const filtered = prev.length >= 4 ? prev.slice(prev.length - 3) : prev;
      return [...filtered, newToast];
    });

    return id;
  }, []);

  const parseToastArgs = (
    type: ToastType,
    message: string,
    descriptionOrOptions?: string | ToastOptions,
    options?: ToastOptions
  ): Omit<ToastItem, 'id'> => {
    if (typeof descriptionOrOptions === 'string') {
      return {
        type,
        message,
        description: descriptionOrOptions,
        ...options,
      };
    }
    return {
      type,
      message,
      description: descriptionOrOptions?.description,
      duration: descriptionOrOptions?.duration,
      action: descriptionOrOptions?.action,
      ...options,
    };
  };

  const toast = {
    success: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return showToast(parseToastArgs('success', message, descriptionOrOptions, options));
    },
    info: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return showToast(parseToastArgs('info', message, descriptionOrOptions, options));
    },
    warning: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return showToast(parseToastArgs('warning', message, descriptionOrOptions, options));
    },
    error: (message: string, descriptionOrOptions?: string | ToastOptions, options?: ToastOptions) => {
      return showToast(parseToastArgs('error', message, descriptionOrOptions, options));
    },
    custom: (item: Omit<ToastItem, 'id'>) => {
      return showToast(item);
    },
    dismiss: (id: string) => {
      dismissToast(id);
    },
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
