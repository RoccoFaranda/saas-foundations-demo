"use client";

import { useCallback } from "react";
import { ExportCsvButton } from "@/src/components/dashboard";
import { resolveFilenameFromContentDisposition } from "@/src/lib/dashboard/export-download";

interface DashboardExportButtonProps {
  exportHref: string;
  rowCount?: number;
  disabled?: boolean;
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
      throw new Error("Export request failed");
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
