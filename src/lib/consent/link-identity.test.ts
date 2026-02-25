import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkIdentityWithRetry } from "./link-identity";

describe("linkIdentityWithRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("succeeds on first successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const linked = await linkIdentityWithRetry({
      fetchImpl,
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
    });

    expect(linked).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/consent/link",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("retries retryable status codes and succeeds when a later attempt returns ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const linked = await linkIdentityWithRetry({
      fetchImpl,
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
    });

    expect(linked).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable status codes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    } as Response);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const linked = await linkIdentityWithRetry({
      fetchImpl,
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
    });

    expect(linked).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("retries network errors and fails after max attempts", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const linked = await linkIdentityWithRetry({
      fetchImpl,
      maxAttempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 1,
    });

    expect(linked).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();
  });
});
