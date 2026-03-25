"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export interface SessionRefreshOnVisibleOptions {
  enabled?: boolean;
  minIntervalMs?: number;
  includeWindowFocus?: boolean;
}

export function useSessionRefreshOnVisible(options: SessionRefreshOnVisibleOptions = {}): void {
  const { update } = useSession();
  const { enabled = true, minIntervalMs = 15_000, includeWindowFocus = false } = options;
  const inFlightRef = useRef<Promise<unknown> | null>(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshSession = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshAtRef.current < minIntervalMs) {
        return;
      }

      lastRefreshAtRef.current = now;

      const refreshPromise = Promise.resolve(update())
        .catch(() => {})
        .finally(() => {
          if (inFlightRef.current === refreshPromise) {
            inFlightRef.current = null;
          }
        });

      inFlightRef.current = refreshPromise;
      await refreshPromise;
    };

    const handleVisibilityChange = () => {
      void refreshSession();
    };

    const handleFocus = () => {
      void refreshSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange, false);

    if (includeWindowFocus) {
      window.addEventListener("focus", handleFocus, false);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange, false);

      if (includeWindowFocus) {
        window.removeEventListener("focus", handleFocus, false);
      }
    };
  }, [enabled, includeWindowFocus, minIntervalMs, update]);
}
