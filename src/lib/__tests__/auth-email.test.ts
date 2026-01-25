// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEmailAdapter, testEmailAdapter, testEmailHelpers } from "../auth/email";

// Mock Resend
const mockResendSend = vi.fn();
const mockResendConstructor = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      mockResendConstructor();
    }
    emails = {
      send: mockResendSend,
    };
  },
}));

describe("getEmailAdapter", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    testEmailHelpers.reset();
    // Reset env to original
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    // Restore original env
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it("should return test adapter in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const adapter = getEmailAdapter();
    expect(adapter).toBe(testEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("should return dev mailbox adapter in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const adapter = getEmailAdapter();
    expect(adapter).not.toBe(testEmailAdapter);
    // Should be dev mailbox adapter (we can't directly compare, but it should work)
    expect(adapter.send).toBeDefined();
    vi.unstubAllEnvs();
  });

  it("should use Resend adapter in production when RESEND_API_KEY is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");

    const adapter = getEmailAdapter();
    expect(adapter.send).toBeDefined();

    // Verify it's not the test adapter
    expect(adapter).not.toBe(testEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("should use Resend adapter when EMAIL_PROVIDER=resend", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");

    const adapter = getEmailAdapter();
    expect(adapter.send).toBeDefined();
    expect(adapter).not.toBe(testEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("should throw error if Resend adapter created without RESEND_API_KEY", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
    delete process.env.RESEND_API_KEY;

    expect(() => getEmailAdapter()).toThrow("RESEND_API_KEY");
    vi.unstubAllEnvs();
  });

  it("should throw error if Resend adapter created without EMAIL_FROM", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    delete process.env.EMAIL_FROM;

    expect(() => getEmailAdapter()).toThrow("EMAIL_FROM");
    vi.unstubAllEnvs();
  });

  it("should not use Resend in development even if RESEND_API_KEY is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");

    const adapter = getEmailAdapter();
    // Should not throw (dev mailbox adapter doesn't need Resend)
    expect(adapter.send).toBeDefined();
    vi.unstubAllEnvs();
  });

  it("should not use Resend in test even if RESEND_API_KEY is set", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");

    const adapter = getEmailAdapter();
    expect(adapter).toBe(testEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("should use Resend in development when EMAIL_PROVIDER=resend", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");

    const adapter = getEmailAdapter();
    expect(adapter.send).toBeDefined();
    expect(adapter).not.toBe(testEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("should fail closed in production when Resend is not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;

    expect(() => getEmailAdapter()).toThrow("RESEND_API_KEY");
    vi.unstubAllEnvs();
  });

  it("should send email via Resend adapter without logging tokens", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");

    // Clear any previous calls
    mockResendSend.mockClear();
    mockResendConstructor.mockClear();
    mockResendSend.mockResolvedValue({ id: "email-id" });

    // Force module reload to pick up new env vars
    await vi.resetModules();
    const { getEmailAdapter: getAdapter } = await import("../auth/email");

    const adapter = getAdapter();

    // Verify Resend was instantiated when adapter is created
    expect(mockResendConstructor).toHaveBeenCalled();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await adapter.send({
      to: "user@example.com",
      subject: "Test Email",
      html: "<p>Test with token: abc123</p>",
      text: "Test with token: abc123",
    });

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(mockResendSend).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "Test Email",
      html: "<p>Test with token: abc123</p>",
      text: "Test with token: abc123",
    });

    // Verify no tokens were logged
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should log error without tokens when Resend send fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const error = new Error("Resend API error");

    // Clear and reset mocks
    mockResendSend.mockClear();
    mockResendConstructor.mockClear();
    mockResendSend.mockRejectedValue(error);

    // Force module reload to pick up new env vars
    await vi.resetModules();
    const { getEmailAdapter: getAdapter } = await import("../auth/email");

    const adapter = getAdapter();

    // Verify Resend was instantiated
    expect(mockResendConstructor).toHaveBeenCalled();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      adapter.send({
        to: "user@example.com",
        subject: "Test Email",
        html: "<p>Test with token: secret123</p>",
        text: "Test with token: secret123",
      })
    ).rejects.toThrow("Resend API error");

    // Verify error was logged but without tokens
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[EMAIL ERROR] Failed to send email:",
      expect.objectContaining({
        subject: "Test Email",
        error: "Resend API error",
      })
    );

    // Verify token was not logged
    const errorCall = consoleErrorSpy.mock.calls[0];
    const errorString = JSON.stringify(errorCall);
    expect(errorString).not.toContain("secret123");

    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
