"use client";

import {
  HAS_NON_ESSENTIAL_CONSENT_SERVICES,
  getConsentRowsByCategory,
  getConsentTableRows,
  type ConsentParty,
  type ConsentStorageType,
} from "@/src/lib/consent/services";
import type { ConsentCategory } from "@/src/lib/consent/types";

type CookieTableVariant = "modal" | "page";

interface CookieTableProps {
  variant?: CookieTableVariant;
  className?: string;
  showOptionalStatusNote?: boolean;
}

const CATEGORY_LABELS: Record<ConsentCategory, string> = {
  necessary: "Necessary",
  functional: "Functional",
  analytics: "Analytics",
  marketing: "Marketing",
};

const STORAGE_TYPE_LABELS: Record<ConsentStorageType, string> = {
  cookie: "Cookie",
  local_storage: "Local storage",
  session_storage: "Session storage",
  token_or_request: "Token / request",
};

const PARTY_LABELS: Record<ConsentParty, string> = {
  first_party: "First-party",
  third_party: "Third-party",
};

function EmptyOptionalState() {
  return (
    <p className="rounded-lg border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
      Optional categories currently have no active cookie technologies in this release. If optional
      services are enabled later, this declaration will update accordingly.
    </p>
  );
}

function PageTable() {
  const rows = getConsentTableRows();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          Cookie declaration table listing categories, services, identifiers, providers, storage,
          duration, and purpose.
        </caption>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="px-3 py-2 font-semibold">Required</th>
            <th className="px-3 py-2 font-semibold">Service</th>
            <th className="px-3 py-2 font-semibold">Identifier key</th>
            <th className="px-3 py-2 font-semibold">Storage type</th>
            <th className="px-3 py-2 font-semibold">Provider</th>
            <th className="px-3 py-2 font-semibold">Party</th>
            <th className="px-3 py-2 font-semibold">Duration</th>
            <th className="px-3 py-2 font-semibold">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.serviceId}-${row.storageType}-${row.key}`}
              className="border-b border-border/70 align-top"
            >
              <td className="px-3 py-2">{CATEGORY_LABELS[row.category]}</td>
              <td className="px-3 py-2">{row.required ? "Yes" : "No"}</td>
              <td className="px-3 py-2">
                <div className="font-medium text-foreground">{row.serviceName}</div>
                <div className="text-xs text-muted-foreground">{row.description}</div>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.key}</td>
              <td className="px-3 py-2">{STORAGE_TYPE_LABELS[row.storageType]}</td>
              <td className="px-3 py-2">{row.provider}</td>
              <td className="px-3 py-2">{PARTY_LABELS[row.party]}</td>
              <td className="px-3 py-2">{row.duration}</td>
              <td className="px-3 py-2">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModalTable() {
  const groups = getConsentRowsByCategory();

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.category} className="rounded-lg border border-border bg-muted/25 p-3">
          <h3 className="text-sm font-semibold text-foreground">
            {CATEGORY_LABELS[group.category]}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[660px] w-full border-collapse text-left text-xs">
              <caption className="sr-only">
                {CATEGORY_LABELS[group.category]} cookie technologies
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-1.5 font-semibold">Service</th>
                  <th className="px-2 py-1.5 font-semibold">Identifier</th>
                  <th className="px-2 py-1.5 font-semibold">Duration</th>
                  <th className="px-2 py-1.5 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr
                    key={`${row.serviceId}-${row.storageType}-${row.key}`}
                    className="border-b border-border/60 align-top"
                  >
                    <td className="px-2 py-2">
                      <div className="font-medium text-foreground">{row.serviceName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {row.provider} | {PARTY_LABELS[row.party]} |{" "}
                        {STORAGE_TYPE_LABELS[row.storageType]}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{row.key}</td>
                    <td className="px-2 py-2">{row.duration}</td>
                    <td className="px-2 py-2">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function CookieTable({
  variant = "page",
  className = "",
  showOptionalStatusNote = true,
}: CookieTableProps) {
  return (
    <div className={className}>
      {variant === "modal" ? <ModalTable /> : <PageTable />}
      {showOptionalStatusNote && !HAS_NON_ESSENTIAL_CONSENT_SERVICES ? (
        <EmptyOptionalState />
      ) : null}
    </div>
  );
}
