'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string, duration = 3000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => {
        const newToasts = [...prev, { id, type, title, message, duration }];
        return newToasts;
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div className={styles.toastContainer}>
          {toasts.map((toast) => (
            <div 
              key={toast.id} 
              className={`${styles.toast} ${
                toast.type === 'success' ? styles.borderSuccess : styles.borderError
              }`}
            >
              <div className={styles.icon}>
                {toast.type === 'success' ? (
                  <FiCheckCircle className={styles.successIcon} />
                ) : (
                  <FiAlertCircle className={styles.errorIcon} />
                )}
              </div>
              
              <div className={styles.content}>
                <h4 className={styles.title}>{toast.title}</h4>
                <p className={styles.message}>{toast.message}</p>
              </div>

              <button 
                className={styles.closeBtn}
                onClick={() => removeToast(toast.id)}
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
