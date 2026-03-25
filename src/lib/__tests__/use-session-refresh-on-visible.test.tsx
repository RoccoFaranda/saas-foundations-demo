// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSessionRefreshOnVisible,
  type SessionRefreshOnVisibleOptions,
} from "../auth/use-session-refresh-on-visible";

const mockUpdate = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    update: mockUpdate,
  }),
}));

function HookHarness(props: SessionRefreshOnVisibleOptions) {
  useSessionRefreshOnVisible(props);
  return null;
}

describe("useSessionRefreshOnVisible", () => {
  let visibilityState: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00.000Z"));
    vi.clearAllMocks();

    visibilityState = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    mockUpdate.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes once when the document becomes visible", async () => {
    render(<HookHarness />);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not refresh again within the cooldown window", async () => {
    render(<HookHarness minIntervalMs={15_000} />);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("dedupes overlapping refresh attempts while one is in flight", async () => {
    let resolveUpdate: (() => void) | null = null;
    mockUpdate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
    );

    render(<HookHarness minIntervalMs={0} />);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.();
    });
  });

  it("does nothing when disabled", async () => {
    render(<HookHarness enabled={false} />);

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not refresh on focus when includeWindowFocus is false", async () => {
    render(<HookHarness />);

    visibilityState = "visible";
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refreshes on focus when includeWindowFocus is true", async () => {
    render(<HookHarness includeWindowFocus />);

    visibilityState = "visible";
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("removes listeners on unmount", async () => {
    const { unmount } = render(<HookHarness />);
    unmount();

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
