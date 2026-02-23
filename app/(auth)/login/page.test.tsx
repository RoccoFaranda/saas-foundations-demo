// @vitest-environment node
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("./login-client", () => ({
  default: () => null,
}));

import LoginPage from "./page";

describe("login page", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  it("passes reset/deleted/restored flags to LoginClient", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = (await LoginPage({
      searchParams: {
        callbackUrl: "/app/dashboard",
        reset: "success",
        deleted: "scheduled",
        restored: "success",
      },
    })) as ReactElement<{
      callbackUrl: string;
      resetSuccess: boolean;
      deletionScheduled: boolean;
      accountRestored: boolean;
    }>;

    expect(result.props).toEqual(
      expect.objectContaining({
        callbackUrl: "/app/dashboard",
        resetSuccess: true,
        deletionScheduled: true,
        accountRestored: true,
      })
    );
  });

  it("redirects verified users to dashboard", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date(),
    });

    await expect(LoginPage({})).rejects.toThrow("REDIRECT:/app/dashboard");
  });
});
