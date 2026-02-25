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
import { useSession } from "next-auth/react";
import {
  CONSENT_OPEN_PREFERENCES_EVENT,
  CONSENT_SYNC_CHANNEL_NAME,
  CONSENT_SYNC_STORAGE_KEY,
  DEFAULT_CONSENT_CATEGORIES,
} from "@/src/lib/consent/config";
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

export function ConsentProvider({ initialConsentState, children }: ConsentProviderProps) {
  const { status: sessionStatus, data: session } = useSession();
  const [consentState, setConsentState] = useState<ConsentState | null>(() =>
    normalizeConsentState(initialConsentState)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [gpcDetected, setGpcDetected] = useState(false);
  const gpcSyncAttemptedRef = useRef(false);
  const lastIdentityLinkAttemptedKeyRef = useRef<string | null>(null);
  const senderIdRef = useRef(createConsentSyncSenderId());
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const syncFetchInFlightRef = useRef(false);
  const syncFetchQueuedRef = useRef(false);

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

  const persistConsent = useCallback(
    async (source: ConsentSource, categories: OptionalConsentCategories) => {
      setIsSaving(true);
      try {
        const response = await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, categories }),
        });
        if (!response.ok) {
          throw new Error("Failed to persist cookie preferences.");
        }
        const payload = (await response.json()) as { state?: unknown };
        const nextState = parseConsentPayloadState(payload.state ?? null);
        setConsentState(nextState);
        broadcastConsentUpdated();
      } catch (error) {
        console.error("[consent] Failed to save consent preferences:", error);
        // Keep local UI state in sync even when persistence fails.
        setConsentState((previousState) =>
          createConsentState({
            source,
            categories,
            gpcHonored: source === "gpc",
            consentId: previousState?.consentId,
          })
        );
      } finally {
        setIsSaving(false);
      }
    },
    [broadcastConsentUpdated, parseConsentPayloadState]
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
    const sessionUserId = session?.user?.id ?? null;
    if (sessionStatus !== "authenticated" || !sessionUserId || !consentState) {
      return;
    }

    const linkSignature = [
      sessionUserId,
      consentState.consentId,
      consentState.version,
      consentState.gpcHonored ? "1" : "0",
      consentState.categories.functional ? "1" : "0",
      consentState.categories.analytics ? "1" : "0",
      consentState.categories.marketing ? "1" : "0",
    ].join(":");

    if (lastIdentityLinkAttemptedKeyRef.current === linkSignature) {
      return;
    }
    lastIdentityLinkAttemptedKeyRef.current = linkSignature;

    let canceled = false;
    void (async () => {
      try {
        const response = await fetch("/api/consent/link", {
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Identity link request failed with status ${response.status}.`);
        }
      } catch (error) {
        if (canceled) {
          return;
        }
        if (lastIdentityLinkAttemptedKeyRef.current === linkSignature) {
          lastIdentityLinkAttemptedKeyRef.current = null;
        }
        console.warn("[consent] Failed to persist identity link:", error);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [consentState, session?.user?.id, sessionStatus]);

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

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}

      <ConsentPreferencesModal
        isOpen={isPreferencesOpen}
        isSaving={isSaving}
        gpcLocked={gpcDetected}
        initialCategories={currentCategories}
        onClose={() => setIsPreferencesOpen(false)}
        onSave={(categories) => {
          void persistConsent("preferences_save", categories);
          setIsPreferencesOpen(false);
        }}
      />

      {shouldShowBanner ? (
        <ConsentBanner
          isSaving={isSaving}
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
