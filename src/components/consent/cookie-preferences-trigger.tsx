"use client";

import type { ReactNode } from "react";
import { CookieMark } from "@/src/components/icons/cookie-mark";
import { CONSENT_OPEN_PREFERENCES_EVENT } from "@/src/lib/consent/config";

interface CookiePreferencesTriggerProps {
  className?: string;
  label?: string;
  ariaLabel?: string;
  title?: string;
  children?: ReactNode;
}

export function CookiePreferencesTrigger({
  className = "link-subtle cursor-pointer focus-ring",
  label = "Cookie Preferences",
  ariaLabel,
  title,
  children,
}: CookiePreferencesTriggerProps) {
  const accessibleLabel = ariaLabel ?? label;
  const isCustomContent = children !== undefined && children !== null;
  const content = isCustomContent ? (
    children
  ) : (
    <span className="inline-flex items-center gap-1">
      <CookieMark className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );

  return (
    <button
      type="button"
      className={className}
      aria-label={accessibleLabel}
      title={title ?? accessibleLabel}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(CONSENT_OPEN_PREFERENCES_EVENT));
      }}
    >
      {content}
    </button>
  );
}
