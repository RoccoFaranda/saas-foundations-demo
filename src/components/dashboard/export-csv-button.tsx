"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/src/components/ui/toast";
import { downloadBlobFile } from "@/src/lib/dashboard/export-download";

interface ExportResult {
  blob: Blob;
  filename: string;
  rowCount?: number;
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
  const pendingLabelTimerRef = useRef<number | null>(null);

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

  const handleClick = useCallback(async () => {
    if (disabled || isPending) return;

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
    } catch {
      pushToast({
        title: "Export failed",
        description: "Please try again.",
      });
    } finally {
      clearPendingLabelTimer();
      setShowPendingLabel(false);
      setIsPending(false);
    }
  }, [clearPendingLabelTimer, disabled, isPending, onExport, pendingDelayMs, pushToast]);

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      disabled={disabled || isPending}
      className={className}
    >
      {showPendingLabel ? pendingLabel : label}
    </button>
  );
}
