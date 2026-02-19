"use client";

import { useCallback } from "react";
import { ExportCsvButton } from "@/src/components/dashboard";
import { resolveFilenameFromContentDisposition } from "@/src/lib/dashboard/export-download";

interface DashboardExportButtonProps {
  exportHref: string;
  rowCount?: number;
  disabled?: boolean;
}

interface ExportErrorPayload {
  error?: string;
  retryAt?: number;
}

function toExportErrorMessage(
  payload: unknown,
  fallback: string
): { message: string; retryAt?: number } {
  if (typeof payload !== "object" || payload === null) {
    return { message: fallback };
  }

  const maybePayload = payload as ExportErrorPayload;
  const message =
    typeof maybePayload.error === "string" && maybePayload.error.trim()
      ? maybePayload.error
      : fallback;
  const retryAt = typeof maybePayload.retryAt === "number" ? maybePayload.retryAt : undefined;
  return { message, retryAt };
}

export function DashboardExportButton({
  exportHref,
  rowCount,
  disabled = false,
}: DashboardExportButtonProps) {
  const handleExport = useCallback(async () => {
    const response = await fetch(exportHref, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const defaultErrorMessage = "Please try again.";
      let errorMessage = defaultErrorMessage;
      let retryAt: number | undefined;

      if (response.status === 429) {
        try {
          const payload = (await response.json()) as unknown;
          const parsed = toExportErrorMessage(payload, defaultErrorMessage);
          errorMessage = parsed.message;
          retryAt = parsed.retryAt;
        } catch {
          // Ignore parse failures and keep fallback.
        }
      }

      throw Object.assign(new Error(errorMessage), {
        status: response.status,
        retryAt,
      });
    }

    const blob = await response.blob();
    const fallbackFilename = `projects-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    const filename = resolveFilenameFromContentDisposition(
      response.headers.get("content-disposition"),
      fallbackFilename
    );

    return {
      blob,
      filename,
      rowCount,
    };
  }, [exportHref, rowCount]);

  return <ExportCsvButton onExport={handleExport} disabled={disabled} />;
}
