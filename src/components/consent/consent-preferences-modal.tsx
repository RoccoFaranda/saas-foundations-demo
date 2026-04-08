"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import {
  HAS_NON_ESSENTIAL_CONSENT_SERVICES,
  getConsentRowsByCategory,
  type ConsentTableRow,
} from "@/src/lib/consent/services";
import type { ConsentCategory, ConsentCategories } from "@/src/lib/consent/types";
import { Modal } from "@/src/components/ui/modal";

const CATEGORY_LABELS: Record<ConsentCategory, string> = {
  necessary: "Necessary",
  functional: "Functional",
  analytics: "Analytics",
  marketing: "Marketing",
};

const CATEGORY_DESCRIPTIONS: Record<ConsentCategory, string> = {
  necessary: "Required for sign-in, security, and core application operation.",
  functional: "Supports optional quality-of-life behavior beyond strict core operation.",
  analytics: "Helps us measure usage and improve performance over time.",
  marketing: "Used for personalized promotion and campaign effectiveness.",
};

const STORAGE_TYPE_LABELS: Record<ConsentTableRow["storageType"], string> = {
  cookie: "Cookie",
  local_storage: "Local storage",
  session_storage: "Session storage",
  token_or_request: "Token / request",
};

interface CategoryDisclosureProps {
  summary: string;
  children: React.ReactNode;
}

function CategoryDisclosure({ summary, children }: CategoryDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="mt-3 rounded-md border border-border bg-muted/20 p-3"
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="focus-ring cursor-pointer list-none rounded-sm text-sm font-medium text-foreground">
        <span className="flex items-center justify-between gap-2">
          <span>{summary}</span>
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            {isOpen ? "▲" : "▼"}
          </span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

interface ConsentPreferencesModalProps {
  isOpen: boolean;
  isSaving: boolean;
  isActionsDisabled: boolean;
  gpcLocked: boolean;
  errorMessage?: string | null;
  initialCategories: ConsentCategories;
  onClose: () => void;
  onSave: (categories: Omit<ConsentCategories, "necessary">) => void;
}

export function ConsentPreferencesModal({
  isOpen,
  isSaving,
  isActionsDisabled,
  gpcLocked,
  errorMessage,
  initialCategories,
  onClose,
  onSave,
}: ConsentPreferencesModalProps) {
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const rowsByCategory = useMemo(() => {
    const groupedRows = getConsentRowsByCategory();
    return new Map(groupedRows.map((group) => [group.category, group.rows]));
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="cookie-preferences-title"
      initialFocusRef={saveButtonRef}
      closeOnRouteChange
    >
      <ConsentPreferencesModalBody
        initialCategories={initialCategories}
        isSaving={isSaving}
        isActionsDisabled={isActionsDisabled}
        gpcLocked={gpcLocked}
        errorMessage={errorMessage}
        onClose={onClose}
        onSave={onSave}
        rowsByCategory={rowsByCategory}
        saveButtonRef={saveButtonRef}
      />
    </Modal>
  );
}

interface ConsentPreferencesModalBodyProps {
  initialCategories: ConsentCategories;
  isSaving: boolean;
  isActionsDisabled: boolean;
  gpcLocked: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSave: (categories: Omit<ConsentCategories, "necessary">) => void;
  rowsByCategory: Map<ConsentCategory, ConsentTableRow[]>;
  saveButtonRef: RefObject<HTMLButtonElement | null>;
}

function ConsentPreferencesModalBody({
  initialCategories,
  isSaving,
  isActionsDisabled,
  gpcLocked,
  errorMessage,
  onClose,
  onSave,
  rowsByCategory,
  saveButtonRef,
}: ConsentPreferencesModalBodyProps) {
  const [functional, setFunctional] = useState(initialCategories.functional);
  const [analytics, setAnalytics] = useState(initialCategories.analytics);
  const [marketing, setMarketing] = useState(initialCategories.marketing);

  return (
    <div className="surface-card-elevated max-h-[calc(100vh-2.5rem)] w-full max-w-2xl overflow-y-auto bg-surface px-5 py-5 sm:px-6">
      <h2 id="cookie-preferences-title" className="text-xl font-semibold">
        Cookie Preferences
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage optional cookies used for feature enhancements, analytics, and marketing. Required
        cookies are always enabled.
      </p>

      <div className="mt-4 space-y-3">
        <section className="surface-card motion-colors px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked
              disabled
              className="form-checkbox mt-1 h-4 w-4 rounded border-border text-primary"
              aria-label="Necessary cookies"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {CATEGORY_LABELS.necessary}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {CATEGORY_DESCRIPTIONS.necessary}
              </span>
            </span>
          </label>
          <CategoryDisclosure summary="View Necessary cookie details">
            <CategoryRows rows={rowsByCategory.get("necessary") ?? []} />
          </CategoryDisclosure>
        </section>

        <section className="surface-card motion-colors px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={functional}
              disabled={isActionsDisabled || gpcLocked}
              onChange={(event) => setFunctional(event.currentTarget.checked)}
              className="form-checkbox mt-1 h-4 w-4 rounded border-border text-primary focus-ring"
              aria-label="Functional cookies"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {CATEGORY_LABELS.functional}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {CATEGORY_DESCRIPTIONS.functional}
              </span>
            </span>
          </label>
          <CategoryDisclosure summary="View Functional cookie details">
            <CategoryRows rows={rowsByCategory.get("functional") ?? []} />
          </CategoryDisclosure>
        </section>

        <section className="surface-card motion-colors px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={analytics}
              disabled={isActionsDisabled || gpcLocked}
              onChange={(event) => setAnalytics(event.currentTarget.checked)}
              className="form-checkbox mt-1 h-4 w-4 rounded border-border text-primary focus-ring"
              aria-label="Analytics cookies"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {CATEGORY_LABELS.analytics}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {CATEGORY_DESCRIPTIONS.analytics}
              </span>
            </span>
          </label>
          <CategoryDisclosure summary="View Analytics cookie details">
            <CategoryRows rows={rowsByCategory.get("analytics") ?? []} />
          </CategoryDisclosure>
        </section>

        <section className="surface-card motion-colors px-4 py-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              disabled={isActionsDisabled || gpcLocked}
              onChange={(event) => setMarketing(event.currentTarget.checked)}
              className="form-checkbox mt-1 h-4 w-4 rounded border-border text-primary focus-ring"
              aria-label="Marketing cookies"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {CATEGORY_LABELS.marketing}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {CATEGORY_DESCRIPTIONS.marketing}
              </span>
            </span>
          </label>
          <CategoryDisclosure summary="View Marketing cookie details">
            <CategoryRows rows={rowsByCategory.get("marketing") ?? []} />
          </CategoryDisclosure>
        </section>
      </div>

      {gpcLocked && (
        <p className="mt-4 rounded-lg border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
          Global Privacy Control (GPC) was detected in your browser, so optional cookie categories
          are disabled.
        </p>
      )}

      {!HAS_NON_ESSENTIAL_CONSENT_SERVICES ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
          Optional categories currently have no active cookie technologies in this release.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-3">
        <Link href="/cookies" className="btn-link text-sm">
          Open full cookie declaration
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isActionsDisabled || gpcLocked}
            onClick={() => {
              setFunctional(false);
              setAnalytics(false);
              setMarketing(false);
            }}
          >
            Reject all
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isActionsDisabled || gpcLocked}
            onClick={() => {
              setFunctional(true);
              setAnalytics(true);
              setMarketing(true);
            }}
          >
            Accept all
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isSaving}
            onClick={onClose}
          >
            Close
          </button>
          <button
            ref={saveButtonRef}
            type="button"
            className="btn-primary btn-sm"
            disabled={isActionsDisabled}
            onClick={() => {
              onSave({
                functional,
                analytics,
                marketing,
              });
            }}
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRows({ rows }: { rows: ConsentTableRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No active technologies in this category for the current release.
      </p>
    );
  }

  return (
    <div
      tabIndex={0}
      aria-label="Cookie details table"
      className="focus-ring overflow-x-auto rounded-md"
    >
      <table className="min-w-165 w-full border-collapse text-left text-xs">
        <caption className="sr-only">Category cookie details</caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2 py-1.5 font-semibold">Identifier</th>
            <th className="px-2 py-1.5 font-semibold">Service</th>
            <th className="px-2 py-1.5 font-semibold">Duration</th>
            <th className="px-2 py-1.5 font-semibold">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.serviceId}-${row.storageType}-${row.key}`}
              className="border-b border-border/60 align-top"
            >
              <td className="px-2 py-2 font-mono text-xs">{row.key}</td>
              <td className="px-2 py-2">
                <div className="font-medium text-foreground">{row.serviceName}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {row.provider} | {row.party === "first_party" ? "First-party" : "Third-party"} |{" "}
                  {STORAGE_TYPE_LABELS[row.storageType]}
                </div>
              </td>
              <td className="px-2 py-2">{row.duration}</td>
              <td className="px-2 py-2">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
