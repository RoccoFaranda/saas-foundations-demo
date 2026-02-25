"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CONSENT_OPEN_PREFERENCES_EVENT,
  CONSENT_SYNC_CHANNEL_NAME,
  CONSENT_SYNC_STORAGE_KEY,
  DEFAULT_CONSENT_CATEGORIES,
} from "@/src/lib/consent/config";
import {
  enqueueConsentAuditReplay,
  flushConsentAuditReplayQueue,
  type ConsentAuditReplayPayload,
} from "@/src/lib/consent/audit-queue";
import {
  createConsentAuditEventId,
  createConsentAuditOccurredAt,
} from "@/src/lib/consent/audit-metadata";
import { consentStateSchema } from "@/src/lib/consent/schema";
import { HAS_NON_ESSENTIAL_CONSENT_SERVICES } from "@/src/lib/consent/services";
import {
  applyGpcToOptionalCategories,
  createConsentState,
  normalizeConsentState,
} from "@/src/lib/consent/state";
import {
  createConsentSyncMessage,
  createConsentSyncSenderId,
  parseConsentSyncMessage,
} from "@/src/lib/consent/sync";
import type {
  ConsentCategories,
  ConsentCategory,
  ConsentSource,
  ConsentState,
} from "@/src/lib/consent/types";
import { ConsentBanner } from "./consent-banner";
import { ConsentPreferencesModal } from "./consent-preferences-modal";

type OptionalConsentCategories = Omit<ConsentCategories, "necessary">;

interface ConsentContextValue {
  consentState: ConsentState | null;
  gpcDetected: boolean;
  hasConsentForCategory: (category: ConsentCategory) => boolean;
  openPreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

interface ConsentProviderProps {
  initialConsentState: ConsentState | null;
  children: ReactNode;
}

function createReplayPayloadFromState(
  state: ConsentState,
  eventId: string,
  occurredAt: string
): ConsentAuditReplayPayload {
  return {
    eventId,
    occurredAt,
    consentId: state.consentId,
    version: state.version,
    source: state.source,
    gpcHonored: state.gpcHonored,
    categories: state.categories,
  };
}

export function ConsentProvider({ initialConsentState, children }: ConsentProviderProps) {
  const [consentState, setConsentState] = useState<ConsentState | null>(() =>
    normalizeConsentState(initialConsentState)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [gpcDetected, setGpcDetected] = useState(false);
  const gpcSyncAttemptedRef = useRef(false);
  const senderIdRef = useRef(createConsentSyncSenderId());
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const syncFetchInFlightRef = useRef(false);
  const syncFetchQueuedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const applyRetryAt = useCallback((nextRetryAt: number | null | undefined) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (nextRetryAt && nextRetryAt > Date.now()) {
      setIsRateLimited(true);
      const delay = Math.max(nextRetryAt - Date.now(), 0);
      retryTimerRef.current = setTimeout(() => {
        setIsRateLimited(false);
        retryTimerRef.current = null;
        setSaveError(null);
      }, delay);
      return;
    }

    setIsRateLimited(false);
  }, []);

  const parseConsentPayloadState = useCallback((value: unknown) => {
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = consentStateSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error("Unexpected consent payload shape.");
    }
    return normalizeConsentState(parsed.data);
  }, []);

  const refreshConsentFromServer = useCallback(async () => {
    if (syncFetchInFlightRef.current) {
      syncFetchQueuedRef.current = true;
      return;
    }

    syncFetchInFlightRef.current = true;
    try {
      do {
        syncFetchQueuedRef.current = false;

        const response = await fetch("/api/consent", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to refresh consent state with status ${response.status}.`);
        }

        const payload = (await response.json()) as { state?: unknown };
        const nextState = parseConsentPayloadState(payload.state ?? null);
        setConsentState(nextState);
      } while (syncFetchQueuedRef.current);
    } catch (error) {
      console.warn("[consent] Failed to refresh consent state from sync event:", error);
    } finally {
      syncFetchInFlightRef.current = false;
    }
  }, [parseConsentPayloadState]);

  const broadcastConsentUpdated = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const message = createConsentSyncMessage(senderIdRef.current);
    const channel = syncChannelRef.current;

    if (channel) {
      channel.postMessage(message);
      return;
    }

    try {
      window.localStorage.setItem(CONSENT_SYNC_STORAGE_KEY, JSON.stringify(message));
    } catch (error) {
      console.warn("[consent] Failed to broadcast consent sync fallback event:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const flushQueue = () => {
      void flushConsentAuditReplayQueue();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        flushQueue();
      }
    };

    flushQueue();
    window.addEventListener("online", flushQueue);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", flushQueue);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const persistConsent = useCallback(
    async (source: ConsentSource, categories: OptionalConsentCategories): Promise<boolean> => {
      const auditEventId = createConsentAuditEventId();
      const auditOccurredAt = createConsentAuditOccurredAt();
      setIsSaving(true);
      setSaveError(null);

      try {
        const response = await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            categories,
            eventId: auditEventId,
            occurredAt: auditOccurredAt,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            let errorMessage = "Too many requests. Please wait and try again.";
            let retryAt: number | undefined;

            try {
              const payload = (await response.json()) as {
                error?: unknown;
                retryAt?: unknown;
              };
              if (typeof payload.error === "string") {
                errorMessage = payload.error;
              }
              if (typeof payload.retryAt === "number") {
                retryAt = payload.retryAt;
              }
            } catch {
              // Ignore malformed payloads on rate-limited responses.
            }

            setSaveError(errorMessage);
            applyRetryAt(retryAt);
            return false;
          }

          throw new Error("Failed to persist cookie preferences.");
        }

        applyRetryAt(null);
        const payload = (await response.json()) as {
          state?: unknown;
          auditAccepted?: boolean;
        };
        const nextState = parseConsentPayloadState(payload.state ?? null);
        const resolvedState =
          nextState ??
          createConsentState({
            source,
            categories,
            gpcHonored: source === "gpc",
            consentId: consentState?.consentId,
          });
        setConsentState(resolvedState);
        broadcastConsentUpdated();

        if (payload.auditAccepted === false) {
          enqueueConsentAuditReplay({
            kind: "consent",
            payload: createReplayPayloadFromState(resolvedState, auditEventId, auditOccurredAt),
          });
          void flushConsentAuditReplayQueue();
        }

        return true;
      } catch (error) {
        applyRetryAt(null);
        console.error("[consent] Failed to save consent preferences:", error);
        // Keep local UI state in sync even when persistence fails.
        const fallbackState = createConsentState({
          source,
          categories,
          gpcHonored: source === "gpc",
          consentId: consentState?.consentId,
        });
        setConsentState(fallbackState);
        enqueueConsentAuditReplay({
          kind: "consent",
          payload: createReplayPayloadFromState(fallbackState, auditEventId, auditOccurredAt),
        });
        void flushConsentAuditReplayQueue();
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [applyRetryAt, broadcastConsentUpdated, consentState?.consentId, parseConsentPayloadState]
  );

  useEffect(() => {
    const openPreferences = () => setIsPreferencesOpen(true);
    window.addEventListener(CONSENT_OPEN_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.removeEventListener(CONSENT_OPEN_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const handleExternalSyncSignal = useCallback(
    (messageInput: unknown) => {
      const message = parseConsentSyncMessage(messageInput);
      if (!message) {
        return;
      }
      if (message.senderId === senderIdRef.current) {
        return;
      }
      void refreshConsentFromServer();
    },
    [refreshConsentFromServer]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== CONSENT_SYNC_STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue) as unknown;
        handleExternalSyncSignal(parsed);
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    const handleBroadcastMessage = (event: MessageEvent<unknown>) => {
      handleExternalSyncSignal(event.data);
    };

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CONSENT_SYNC_CHANNEL_NAME);
      syncChannelRef.current = channel;
      channel.addEventListener("message", handleBroadcastMessage);
    } else {
      syncChannelRef.current = null;
    }

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      if (channel) {
        channel.removeEventListener("message", handleBroadcastMessage);
        channel.close();
      }
      syncChannelRef.current = null;
    };
  }, [handleExternalSyncSignal]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    const enabled = Boolean(
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    );
    setGpcDetected(enabled);
    if (!enabled || gpcSyncAttemptedRef.current) {
      return;
    }

    const categories = applyGpcToOptionalCategories();
    const alreadyCompliant =
      consentState?.gpcHonored &&
      !consentState.categories.functional &&
      !consentState.categories.analytics &&
      !consentState.categories.marketing;
    if (alreadyCompliant) {
      gpcSyncAttemptedRef.current = true;
      return;
    }

    gpcSyncAttemptedRef.current = true;
    const nextState = createConsentState({
      source: "gpc",
      categories,
      gpcHonored: true,
      consentId: consentState?.consentId,
    });
    setConsentState(nextState);
    void persistConsent("gpc", categories);
  }, [consentState, persistConsent]);

  const hasConsentForCategory = useCallback(
    (category: ConsentCategory) => {
      if (category === "necessary") {
        return true;
      }
      if (!consentState) {
        return false;
      }
      return consentState.categories[category];
    },
    [consentState]
  );

  const contextValue = useMemo<ConsentContextValue>(
    () => ({
      consentState,
      gpcDetected,
      hasConsentForCategory,
      openPreferences: () => setIsPreferencesOpen(true),
    }),
    [consentState, gpcDetected, hasConsentForCategory]
  );

  const currentCategories = consentState?.categories ?? DEFAULT_CONSENT_CATEGORIES;
  const shouldShowBanner =
    HAS_NON_ESSENTIAL_CONSENT_SERVICES && !consentState && !isPreferencesOpen;
  const isInteractionLocked = isSaving || isRateLimited;

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      <ConsentPreferencesModal
        isOpen={isPreferencesOpen}
        isSaving={isSaving}
        isActionsDisabled={isInteractionLocked}
        gpcLocked={gpcDetected}
        errorMessage={saveError}
        initialCategories={currentCategories}
        onClose={() => setIsPreferencesOpen(false)}
        onSave={async (categories) => {
          const saved = await persistConsent("preferences_save", categories);
          if (saved) {
            setIsPreferencesOpen(false);
          }
        }}
      />

      {shouldShowBanner ? (
        <ConsentBanner
          isSaving={isInteractionLocked}
          errorMessage={saveError}
          onAcceptAll={() => {
            void persistConsent("banner_accept_all", {
              functional: true,
              analytics: true,
              marketing: true,
            });
          }}
          onRejectAll={() => {
            void persistConsent("banner_reject_all", {
              functional: false,
              analytics: false,
              marketing: false,
            });
          }}
          onCustomize={() => setIsPreferencesOpen(true)}
        />
      ) : null}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentProvider.");
  }
  return context;
}
