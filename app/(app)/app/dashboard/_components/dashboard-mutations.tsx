"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardContent } from "@/src/components/dashboard";
import type { DashboardItem } from "@/src/components/dashboard/model";
import type { DashboardMutationHandlers } from "@/src/components/dashboard";
import {
  type DashboardActionResult,
  createItemAction,
  updateItemAction,
  deleteItemAction,
  archiveItemAction,
  unarchiveItemAction,
  importSampleDataAction,
} from "../actions";

interface DashboardMutationsProps {
  items: DashboardItem[];
  emptyMessage: string;
  hasItems: boolean;
}

/**
 * Client component wrapper that handles all dashboard mutations.
 * Provides server action implementations to the shared DashboardContent.
 */
export function DashboardMutations({ items, emptyMessage, hasItems }: DashboardMutationsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMutation = useCallback(
    async (operation: () => Promise<DashboardActionResult>) => {
      setIsPending(true);
      try {
        const result = await operation();
        if (result.success) {
          router.refresh();
          return;
        }
        setError(result.error);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsPending(false);
      }
    },
    [router]
  );

  // Create mutation handlers that wrap server actions
  const handlers: DashboardMutationHandlers = useMemo(
    () => ({
      onCreate: async (item: DashboardItem) => {
        await runMutation(async () =>
          createItemAction({
            name: item.name,
            status: item.status,
            tag: item.tag,
            summary: item.summary,
            checklist: item.checklist,
          })
        );
      },
      onUpdate: async (item: DashboardItem) => {
        await runMutation(async () =>
          updateItemAction(item.id, {
            name: item.name,
            status: item.status,
            tag: item.tag,
            summary: item.summary,
            checklist: item.checklist,
          })
        );
      },
      onDelete: async (item: DashboardItem) => {
        await runMutation(async () => deleteItemAction(item.id));
      },
      onArchive: async (item: DashboardItem) => {
        await runMutation(async () => archiveItemAction(item.id));
      },
      onUnarchive: async (item: DashboardItem) => {
        await runMutation(async () => unarchiveItemAction(item.id));
      },
      onImportSampleData: async () => {
        await runMutation(importSampleDataAction);
      },
    }),
    [runMutation]
  );

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <DashboardContent
      items={items}
      emptyMessage={emptyMessage}
      hasItems={hasItems}
      isPending={isPending}
      error={error}
      canImportSampleData={!hasItems}
      handlers={handlers}
      onClearError={handleClearError}
    />
  );
}
