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
  const {
    isCreateModalOpen,
    setCreateModalOpen,
    isWriteRateLimited,
    writeRateLimitLabel,
    setWriteRateLimitRetryAt,
  } = useCreateProjectModal();
  const { pushToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const runMutation = useCallback(
    async (operation: () => Promise<DashboardActionResult>) => {
      if (isWriteRateLimited) {
        pushToast({
          title: "Write actions rate limited",
          description: writeRateLimitLabel ?? "Too many requests. Please try again shortly.",
        });
        return false;
      }

      setIsPending(true);
      try {
        const result = await operation();
        if (result.success) {
          router.refresh();
          return true;
        }

        if (typeof result.retryAt === "number") {
          setWriteRateLimitRetryAt(result.retryAt);
          pushToast({
            title: "Write actions rate limited",
            description: result.error,
          });
          return false;
        }

        pushToast({
          title: "Action failed",
          description: result.error,
        });
        return false;
      } catch {
        pushToast({
          title: "Action failed",
          description: "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [isWriteRateLimited, pushToast, router, setWriteRateLimitRetryAt, writeRateLimitLabel]
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

  return (
    <DashboardContent
      items={items}
      emptyMessage={emptyMessage}
      hasItems={hasItems}
      isPending={isPending}
      isMutationsDisabled={isWriteRateLimited}
      rateLimitLabel={writeRateLimitLabel}
      isCreateModalOpen={isCreateModalOpen}
      onCreateModalOpenChange={setCreateModalOpen}
      canImportSampleData={!hasItems}
      handlers={handlers}
    />
  );
}

export function DashboardCreateProjectButton({ hasItems }: { hasItems: boolean }) {
  const { setCreateModalOpen, isWriteRateLimited, writeRateLimitLabel } = useCreateProjectModal();

  if (!hasItems) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setCreateModalOpen(true)}
      disabled={isWriteRateLimited}
      className="btn-primary btn-sm"
    >
      {isWriteRateLimited && writeRateLimitLabel ? writeRateLimitLabel : "+ Create Project"}
    </button>
  );
}
