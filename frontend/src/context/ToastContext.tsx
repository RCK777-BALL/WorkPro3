/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */
/*
 * SPDX-License-Identifier: MIT
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextState {
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error') => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextState>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: number) => {
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => removeToast(id), 3000);
    },
    [removeToast],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{
        message: string;
        type?: 'success' | 'error';
      }>).detail;
      addToast(message, type);
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, [addToast]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow text-white ${t.type === 'success' ? 'bg-success-600' : 'bg-error-600'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export const emitToast = (
  message: string,
  type: 'success' | 'error' = 'success',
) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
  }
};


