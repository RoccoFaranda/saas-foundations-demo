import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_OPEN_PREFERENCES_EVENT, CONSENT_SYNC_STORAGE_KEY } from "@/src/lib/consent/config";
import { createConsentState } from "@/src/lib/consent/state";
import { createConsentSyncMessage } from "@/src/lib/consent/sync";
import { ConsentProvider, useConsent } from "./consent-provider";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  readonly postMessage = vi.fn((data: unknown) => {
    for (const instance of MockBroadcastChannel.instances) {
      if (instance === this || instance.name !== this.name) {
        continue;
      }
      instance.emit(data);
    }
  });

  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  static reset() {
    MockBroadcastChannel.instances = [];
  }

  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    if (type !== "message") {
      return;
    }
    this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    if (type !== "message") {
      return;
    }
    this.listeners.delete(listener);
  }

  close() {
    this.listeners.clear();
  }

  private emit(data: unknown) {
    const event = { data } as MessageEvent<unknown>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function ConsentAnalyticsProbe() {
  const { consentState } = useConsent();
  return (
    <div data-testid="analytics-consent">{String(consentState?.categories.analytics ?? false)}</div>
  );
}

describe("ConsentProvider cross-tab sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    MockBroadcastChannel.reset();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  it("broadcasts a sync signal after successful consent save", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            source: "preferences_save" | "banner_accept_all" | "banner_reject_all" | "gpc";
            categories: { functional: boolean; analytics: boolean; marketing: boolean };
          };
          const state = createConsentState({
            source: body.source,
            categories: body.categories,
          });
          return {
            ok: true,
            status: 200,
            json: async () => ({ state }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <div>Child</div>
      </ConsentProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(CONSENT_OPEN_PREFERENCES_EVENT));
    });

    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    const providerChannel = MockBroadcastChannel.instances[0];
    expect(providerChannel).toBeDefined();
    expect(providerChannel.postMessage).toHaveBeenCalledTimes(1);
    expect(providerChannel.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "consent_updated",
      })
    );
  });

  it("treats /api/consent 429 as terminal (no local change, no replay enqueue)", async () => {
    const retryAt = Date.now() + 60_000;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: "Too many requests. Try again in 1 minute.",
              retryAt,
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <ConsentAnalyticsProbe />
      </ConsentProvider>
    );

    const acceptAllButton = screen.getByRole("button", { name: "Accept all" });
    await user.click(acceptAllButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getByTestId("analytics-consent")).toHaveTextContent("false");
    expect(JSON.parse(window.localStorage.getItem("sf-consent-audit-queue:v2") ?? "[]")).toEqual(
      []
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Accept all" })).toBeDisabled();
    });
  });

  it("keeps modal close enabled after /api/consent 429 while save actions are locked", async () => {
    const retryAt = Date.now() + 60_000;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          return {
            ok: false,
            status: 429,
            json: async () => ({
              error: "Too many requests. Try again in 1 minute.",
              retryAt,
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <div>Child</div>
      </ConsentProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(CONSENT_OPEN_PREFERENCES_EVENT));
    });

    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save preferences" })).toBeDisabled();
  });

  it("queues replay only when /api/consent returns a signed replay token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            source: "preferences_save" | "banner_accept_all" | "banner_reject_all" | "gpc";
            categories: { functional: boolean; analytics: boolean; marketing: boolean };
          };
          const state = createConsentState({
            source: body.source,
            categories: body.categories,
          });
          return {
            ok: true,
            status: 200,
            json: async () => ({
              state,
              auditAccepted: false,
              auditEventId: "audit-event-1",
              replayToken: "signed-replay-token-1",
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <div>Child</div>
      </ConsentProvider>
    );

    await user.click(screen.getByRole("button", { name: "Accept all" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent/audit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ replayToken: "signed-replay-token-1" }),
        })
      );
    });
    expect(JSON.parse(window.localStorage.getItem("sf-consent-audit-queue:v2") ?? "[]")).toEqual(
      []
    );
  });

  it("does not queue replay when /api/consent request fails before server response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          throw new Error("network down");
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <ConsentAnalyticsProbe />
      </ConsentProvider>
    );

    await user.click(screen.getByRole("button", { name: "Accept all" }));

    await waitFor(() => {
      expect(screen.getByTestId("analytics-consent")).toHaveTextContent("true");
    });
    expect(JSON.parse(window.localStorage.getItem("sf-consent-audit-queue:v2") ?? "[]")).toEqual(
      []
    );
  });

  it("refreshes consent state when another tab broadcasts an update", async () => {
    const syncedState = createConsentState({
      source: "preferences_save",
      categories: {
        functional: false,
        analytics: true,
        marketing: false,
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && (!init?.method || init.method === "GET")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ state: syncedState }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    render(
      <ConsentProvider initialConsentState={null}>
        <ConsentAnalyticsProbe />
      </ConsentProvider>
    );

    expect(screen.getByTestId("analytics-consent")).toHaveTextContent("false");

    await waitFor(() => {
      expect(MockBroadcastChannel.instances.length).toBeGreaterThan(0);
    });

    const otherTabChannel = new MockBroadcastChannel("sf-consent-sync");
    otherTabChannel.postMessage(createConsentSyncMessage("external-tab"));

    await waitFor(() => {
      expect(screen.getByTestId("analytics-consent")).toHaveTextContent("true");
    });
  });

  it("uses storage events as fallback when BroadcastChannel is unavailable", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);

    const syncedState = createConsentState({
      source: "preferences_save",
      categories: {
        functional: false,
        analytics: true,
        marketing: false,
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && (!init?.method || init.method === "GET")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ state: syncedState }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    render(
      <ConsentProvider initialConsentState={null}>
        <ConsentAnalyticsProbe />
      </ConsentProvider>
    );

    expect(screen.getByTestId("analytics-consent")).toHaveTextContent("false");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CONSENT_SYNC_STORAGE_KEY,
          newValue: JSON.stringify(createConsentSyncMessage("external-tab")),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("analytics-consent")).toHaveTextContent("true");
    });
  });

  it("ignores self-originated sync messages", async () => {
    let getRefreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/consent" && init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as {
            source: "preferences_save" | "banner_accept_all" | "banner_reject_all" | "gpc";
            categories: { functional: boolean; analytics: boolean; marketing: boolean };
          };
          const state = createConsentState({
            source: body.source,
            categories: body.categories,
          });
          return {
            ok: true,
            status: 200,
            json: async () => ({ state }),
          } as Response;
        }

        if (url === "/api/consent" && (!init?.method || init.method === "GET")) {
          getRefreshCalls += 1;
          return {
            ok: true,
            status: 200,
            json: async () => ({ state: null }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response;
      })
    );

    const user = userEvent.setup();

    render(
      <ConsentProvider initialConsentState={null}>
        <div>Child</div>
      </ConsentProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent(CONSENT_OPEN_PREFERENCES_EVENT));
    });

    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/consent",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    const providerChannel = MockBroadcastChannel.instances[0];
    const selfMessage = providerChannel.postMessage.mock.calls[0]?.[0];
    expect(selfMessage).toBeTruthy();

    const otherTabChannel = new MockBroadcastChannel("sf-consent-sync");
    otherTabChannel.postMessage(selfMessage);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getRefreshCalls).toBe(0);
  });

  it("queues at most one extra refresh while a refresh is already in flight", async () => {
    let resolveFirstRefresh: () => void = () => {
      throw new Error("Expected first refresh resolver to be captured");
    };
    let refreshCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/consent" && (!init?.method || init.method === "GET")) {
          refreshCalls += 1;

          if (refreshCalls === 1) {
            return new Promise<Response>((resolve) => {
              resolveFirstRefresh = () => {
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({
                    state: createConsentState({
                      source: "preferences_save",
                      categories: {
                        functional: false,
                        analytics: false,
                        marketing: false,
                      },
                    }),
                  }),
                } as Response);
              };
            });
          }

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              state: createConsentState({
                source: "preferences_save",
                categories: {
                  functional: false,
                  analytics: true,
                  marketing: false,
                },
              }),
            }),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ state: null }),
        } as Response);
      })
    );

    render(
      <ConsentProvider initialConsentState={null}>
        <ConsentAnalyticsProbe />
      </ConsentProvider>
    );

    const otherTabChannel = new MockBroadcastChannel("sf-consent-sync");
    otherTabChannel.postMessage(createConsentSyncMessage("external-tab"));
    otherTabChannel.postMessage(createConsentSyncMessage("external-tab"));

    await waitFor(() => {
      expect(refreshCalls).toBe(1);
    });

    resolveFirstRefresh();

    await waitFor(() => {
      expect(refreshCalls).toBe(2);
    });
  });
});
