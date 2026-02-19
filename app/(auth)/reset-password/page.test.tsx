// @vitest-environment node
import { createHash } from "node:crypto";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const getRequestIpMock = vi.hoisted(() => vi.fn());
const getPasswordResetTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getRequestIp: getRequestIpMock,
  toHashedTokenIdentifier: (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) {
      return "";
    }
    return `token:${createHash("sha256").update(value.trim()).digest("hex")}`;
  },
}));

vi.mock("@/src/lib/auth/tokens", () => ({
  getPasswordResetToken: getPasswordResetTokenMock,
}));

vi.mock("./reset-client", () => ({
  default: () => null,
}));

import Page from "./page";

type ResetClientProps = {
  token: string | null;
  tokenValid: boolean | null;
  precheckError?: string | null;
};

describe("reset-password page precheck", () => {
  beforeEach(() => {
    enforceRateLimitMock.mockReset();
    getRequestIpMock.mockReset();
    getPasswordResetTokenMock.mockReset();

    getRequestIpMock.mockResolvedValue("203.0.113.10");
    enforceRateLimitMock.mockResolvedValue(null);
    getPasswordResetTokenMock.mockResolvedValue({ id: "token-record" });
  });

  it("skips token lookup and passes precheck error when rate limited", async () => {
    enforceRateLimitMock.mockResolvedValue({
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 60_000,
    });
    const token = "abc123-token";

    const result = (await Page({
      searchParams: { token },
    })) as ReactElement<ResetClientProps>;

    expect(enforceRateLimitMock).toHaveBeenCalledWith("resetPasswordPrecheck", [
      "ip:203.0.113.10",
      `token:${createHash("sha256").update(token).digest("hex")}`,
    ]);
    expect(getPasswordResetTokenMock).not.toHaveBeenCalled();
    expect(result.props).toEqual(
      expect.objectContaining({
        token,
        tokenValid: false,
        precheckError: "Too many requests. Try again in 1 minute.",
      })
    );
  });

  it("checks token and passes valid state when precheck is allowed", async () => {
    const token = "allowed-token";

    const result = (await Page({
      searchParams: { token },
    })) as ReactElement<ResetClientProps>;

    expect(enforceRateLimitMock).toHaveBeenCalledWith("resetPasswordPrecheck", [
      "ip:203.0.113.10",
      `token:${createHash("sha256").update(token).digest("hex")}`,
    ]);
    expect(getPasswordResetTokenMock).toHaveBeenCalledWith(token);
    expect(result.props).toEqual(
      expect.objectContaining({
        token,
        tokenValid: true,
        precheckError: null,
      })
    );
  });
});
