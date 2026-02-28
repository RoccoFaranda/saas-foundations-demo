"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CreateProjectModalContextValue {
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  isWriteRateLimited: boolean;
  writeRateLimitLabel: string | null;
  setWriteRateLimitRetryAt: (retryAt: number | null | undefined) => void;
}

const CreateProjectModalContext = createContext<CreateProjectModalContextValue | null>(null);

export function CreateProjectModalProvider({ children }: { children: ReactNode }) {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [writeRateLimitSecondsRemaining, setWriteRateLimitSecondsRemaining] = useState<
    number | null
  >(null);

  const isWriteRateLimited = writeRateLimitSecondsRemaining !== null;

  const setWriteRateLimitRetryAt = useCallback((retryAt: number | null | undefined) => {
    if (typeof retryAt !== "number") {
      setWriteRateLimitSecondsRemaining(null);
      return;
    }

    const secondsUntilRetry = Math.ceil((retryAt - Date.now()) / 1000);
    setWriteRateLimitSecondsRemaining(secondsUntilRetry > 0 ? secondsUntilRetry : null);
  }, []);

  useEffect(() => {
    if (writeRateLimitSecondsRemaining === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setWriteRateLimitSecondsRemaining((current) => {
        if (current === null || current <= 1) {
          return null;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [writeRateLimitSecondsRemaining]);

  const writeRateLimitLabel = useMemo(() => {
    if (writeRateLimitSecondsRemaining === null) {
      return null;
    }

    const safeSeconds = Math.max(writeRateLimitSecondsRemaining, 1);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `Try again in ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [writeRateLimitSecondsRemaining]);

  const value = useMemo(
    () => ({
      isCreateModalOpen,
      setCreateModalOpen,
      isWriteRateLimited,
      writeRateLimitLabel,
      setWriteRateLimitRetryAt,
    }),
    [isCreateModalOpen, isWriteRateLimited, setWriteRateLimitRetryAt, writeRateLimitLabel]
  );

  return (
    <CreateProjectModalContext.Provider value={value}>
      {children}
    </CreateProjectModalContext.Provider>
  );
}

export function useCreateProjectModal() {
  const context = useContext(CreateProjectModalContext);
  if (!context) {
    throw new Error("useCreateProjectModal must be used within CreateProjectModalProvider");
  }
  return context;
}
