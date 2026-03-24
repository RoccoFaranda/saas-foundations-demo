// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const logAuthEventMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/logging", () => ({
  logAuthEvent: logAuthEventMock,
}));

import { getAppUrl } from "../auth/urls";

describe("getAppUrl", () => {
  const originalEnv = { ...process.env };

  const restoreEnv = () => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  };

  beforeEach(() => {
    logAuthEventMock.mockReset();
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("returns origin for a valid absolute URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/path?query=1");

    expect(getAppUrl()).toBe("https://example.com");
    expect(logAuthEventMock).not.toHaveBeenCalled();
  });

  it("returns fallback in non-production when missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppUrl()).toBe("http://localhost:3000");
    expect(logAuthEventMock).not.toHaveBeenCalled();
  });

  it("throws and logs in production when missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(() => getAppUrl()).toThrow("NEXT_PUBLIC_APP_URL");
    expect(logAuthEventMock).toHaveBeenCalledWith("app_url_missing");
  });

  it("throws and logs in production when invalid", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "ftp://example.com");

    expect(() => getAppUrl()).toThrow("NEXT_PUBLIC_APP_URL");
    expect(logAuthEventMock).toHaveBeenCalledWith("app_url_missing");
  });

  it("uses the preview deployment URL when NEXT_PUBLIC_APP_URL is unset in preview", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "preview-demo.vercel.app");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppUrl()).toBe("https://preview-demo.vercel.app");
    expect(logAuthEventMock).not.toHaveBeenCalled();
  });

  it("falls back to localhost in generic production-mode builds without Vercel deployment env", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppUrl()).toBe("http://localhost:3000");
    expect(logAuthEventMock).not.toHaveBeenCalled();
  });
});
