"use client";

import type { ReactNode } from "react";
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
      {children ?? label}
    </button>
  );
}
