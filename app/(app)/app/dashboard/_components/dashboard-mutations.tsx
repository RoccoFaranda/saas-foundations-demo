"use client";

import { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardContent } from "@/src/components/dashboard";
import type { DashboardItem } from "@/src/components/dashboard/model";
import type { DashboardMutationHandlers } from "@/src/components/dashboard";
import { useCreateProjectModal } from "./create-project-modal-context";
import { useToast } from "@/src/components/ui/toast";
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCreateModalOpen, setCreateModalOpen } = useCreateProjectModal();
  const { pushToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMutation = useCallback(
    async (operation: () => Promise<DashboardActionResult>) => {
      setIsPending(true);
      try {
        const result = await operation();
        if (result.success) {
          router.refresh();
          return true;
        }
        setError(result.error);
        return false;
      } catch {
        setError("Something went wrong. Please try again.");
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [router]
  );

  const viewArchived = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("showArchived", "true");
    params.set("sortBy", "archivedAt");
    params.set("sortDir", "desc");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

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
        const success = await runMutation(async () => archiveItemAction(item.id));
        if (!success) return;

        pushToast({
          title: "Project archived",
          description: item.name,
          actions: [
            {
              label: "Undo",
              onClick: () => {
                void runMutation(async () => unarchiveItemAction(item.id));
              },
            },
            {
              label: "View archived",
              onClick: viewArchived,
            },
          ],
        });
      },
      onUnarchive: async (item: DashboardItem) => {
        await runMutation(async () => unarchiveItemAction(item.id));
      },
      onImportSampleData: async () => {
        await runMutation(importSampleDataAction);
      },
    }),
    [runMutation, pushToast, viewArchived]
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
      isCreateModalOpen={isCreateModalOpen}
      onCreateModalOpenChange={setCreateModalOpen}
      error={error}
      canImportSampleData={!hasItems}
      handlers={handlers}
      onClearError={handleClearError}
    />
  );
}

export function DashboardCreateProjectButton({ hasItems }: { hasItems: boolean }) {
  const { setCreateModalOpen } = useCreateProjectModal();

  if (!hasItems) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setCreateModalOpen(true)}
      className="h-8 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
    >
      + Create Project
    </button>
  );
}
