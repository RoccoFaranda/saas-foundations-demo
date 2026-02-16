"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  title: string;
  description?: string;
  actions?: ToastAction[];
}

interface Toast extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  pushToast: (toast: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const TOAST_TIMEOUT_MS = 5000;

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastOptions) => {
      const id = createToastId();
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }];
        return next.slice(-MAX_TOASTS);
      });
      setTimeout(() => removeToast(id), TOAST_TIMEOUT_MS);
    },
    [removeToast]
  );

  const contextValue = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-100 flex w-[320px] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="surface-card-elevated relative bg-surface-elevated/95 px-4 pb-4 pt-3 backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="row-action"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
            {toast.actions && toast.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      action.onClick();
                      removeToast(toast.id);
                    }}
                    className="btn-secondary btn-xs"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg bg-muted">
              <div
                className="toast-progress h-full bg-muted-foreground/50"
                style={{ animationDuration: `${TOAST_TIMEOUT_MS}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
