"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/src/components/ui/toast";
import { downloadBlobFile } from "@/src/lib/dashboard/export-download";

interface ExportResult {
  blob: Blob;
  filename: string;
  rowCount?: number;
}

interface ExportRequestError {
  status?: number;
  message?: string;
  retryAt?: number;
}

export interface ExportCsvButtonProps {
  onExport: () => Promise<ExportResult>;
  disabled?: boolean;
  className?: string;
  label?: string;
  pendingLabel?: string;
  pendingDelayMs?: number;
}

export function ExportCsvButton({
  onExport,
  disabled = false,
  className = "btn-secondary btn-sm",
  label = "Export CSV",
  pendingLabel = "Exporting...",
  pendingDelayMs = 300,
}: ExportCsvButtonProps) {
  const { pushToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [showPendingLabel, setShowPendingLabel] = useState(false);
  const [rateLimitSecondsRemaining, setRateLimitSecondsRemaining] = useState<number | null>(null);
  const pendingLabelTimerRef = useRef<number | null>(null);

  const isRateLimited = rateLimitSecondsRemaining !== null;

  const formatRateLimitLabel = useCallback((remainingSeconds: number) => {
    const safeSeconds = Math.max(remainingSeconds, 1);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `Try again in ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const clearPendingLabelTimer = useCallback(() => {
    if (pendingLabelTimerRef.current) {
      window.clearTimeout(pendingLabelTimerRef.current);
      pendingLabelTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPendingLabelTimer();
    };
  }, [clearPendingLabelTimer]);

  useEffect(() => {
    if (rateLimitSecondsRemaining === null) {
      return;
    }

    if (rateLimitSecondsRemaining <= 0) {
      setRateLimitSecondsRemaining(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setRateLimitSecondsRemaining((current) => {
        if (current === null || current <= 1) {
          return null;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [rateLimitSecondsRemaining]);

  const handleClick = useCallback(async () => {
    if (disabled || isPending || isRateLimited) return;

    setIsPending(true);
    setShowPendingLabel(false);
    clearPendingLabelTimer();
    pendingLabelTimerRef.current = window.setTimeout(() => {
      setShowPendingLabel(true);
    }, pendingDelayMs);

    try {
      const result = await onExport();
      downloadBlobFile(result.blob, result.filename);

      const rowSuffix =
        typeof result.rowCount === "number"
          ? ` (${result.rowCount} ${result.rowCount === 1 ? "row" : "rows"})`
          : "";

      pushToast({
        title: "CSV downloaded",
        description: `${result.filename}${rowSuffix}`,
      });
    } catch (error) {
      const exportError = error as ExportRequestError;
      const isRateLimited = exportError?.status === 429;
      if (isRateLimited && typeof exportError?.retryAt === "number") {
        const secondsUntilRetry = Math.ceil((exportError.retryAt - Date.now()) / 1000);
        if (secondsUntilRetry > 0) {
          setRateLimitSecondsRemaining(secondsUntilRetry);
        }
      }
      const message = isRateLimited
        ? typeof exportError?.message === "string" && exportError.message.trim()
          ? exportError.message
          : "Please try again."
        : "Please try again.";

      pushToast({
        title: isRateLimited ? "Export rate limited" : "Export failed",
        description: message,
      });
    } finally {
      clearPendingLabelTimer();
      setShowPendingLabel(false);
      setIsPending(false);
    }
  }, [
    clearPendingLabelTimer,
    disabled,
    isPending,
    isRateLimited,
    onExport,
    pendingDelayMs,
    pushToast,
  ]);

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      disabled={disabled || isPending || isRateLimited}
      className={className}
    >
      {showPendingLabel
        ? pendingLabel
        : isRateLimited
          ? formatRateLimitLabel(rateLimitSecondsRemaining)
          : label}
    </button>
  );
}
