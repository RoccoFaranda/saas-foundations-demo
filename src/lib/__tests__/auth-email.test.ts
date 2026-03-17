// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appendDevMailboxMessageMock = vi.hoisted(() => vi.fn());
const mockResendSend = vi.hoisted(() => vi.fn());
const mockResendConstructor = vi.hoisted(() => vi.fn());

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

vi.mock("../auth/dev-mailbox", () => ({
  appendDevMailboxMessage: appendDevMailboxMessageMock,
}));

async function loadEmailModule() {
  await vi.resetModules();
  return import("../auth/email");
}

describe("email provider resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResendSend.mockResolvedValue({ id: "email-id" });
    appendDevMailboxMessageMock.mockResolvedValue(undefined);

    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  });

  it("uses test adapter in NODE_ENV=test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { getEmailAdapter, testEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();

    expect(adapter).toBe(testEmailAdapter);
  });

  it("ignores EMAIL_PROVIDER override in NODE_ENV=test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const { getEmailAdapter, testEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();

    expect(adapter).toBe(testEmailAdapter);
    expect(mockResendConstructor).not.toHaveBeenCalled();
  });

  it("defaults to dev-mailbox adapter in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "dev@example.com",
      subject: "Dev email",
      html: "<p>hello</p>",
    });

    expect(appendDevMailboxMessageMock).toHaveBeenCalledTimes(1);
    expect(mockResendConstructor).not.toHaveBeenCalled();
  });

  it("defaults to resend adapter in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "prod@example.com",
      subject: "Prod email",
      html: "<p>hello</p>",
    });

    expect(mockResendConstructor).toHaveBeenCalled();
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(appendDevMailboxMessageMock).not.toHaveBeenCalled();
  });

  it("forwards replyTo and tags to resend when provided in message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "metadata@example.com",
      subject: "Metadata",
      html: "<p>hello</p>",
      replyTo: "help@example.com",
      tags: [
        { name: "domain", value: "auth" },
        { name: "message_type", value: "verify_email_signup" },
      ],
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "help@example.com",
        tags: [
          { name: "domain", value: "auth" },
          { name: "message_type", value: "verify_email_signup" },
        ],
      })
    );
  });

  it("uses EMAIL_REPLY_TO when message replyTo is not provided", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubEnv("EMAIL_REPLY_TO", "replyto@example.com");
    vi.stubEnv("SUPPORT_EMAIL", "support@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "email-reply@example.com",
      subject: "Reply To",
      html: "<p>hello</p>",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "replyto@example.com",
      })
    );
  });

  it("falls back to SUPPORT_EMAIL when EMAIL_REPLY_TO is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    vi.stubEnv("SUPPORT_EMAIL", "support@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "support-fallback@example.com",
      subject: "Support Fallback",
      html: "<p>hello</p>",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "support@example.com",
      })
    );
  });

  it("supports EMAIL_PROVIDER=resend override", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "override@example.com",
      subject: "Override",
      html: "<p>hello</p>",
    });

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(appendDevMailboxMessageMock).not.toHaveBeenCalled();
  });

  it("throws for unsupported EMAIL_PROVIDER values", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_PROVIDER", "unknown-provider");
    const { getEmailAdapter } = await loadEmailModule();

    expect(() => getEmailAdapter()).toThrow("Unsupported EMAIL_PROVIDER value");
  });

  it("fails closed in production when EMAIL_PROVIDER=dev-mailbox and allow flag is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "dev-mailbox");
    const { getEmailAdapter } = await loadEmailModule();

    expect(() => getEmailAdapter()).toThrow("ALLOW_DEV_MAILBOX_IN_PROD=true");
  });

  it("allows EMAIL_PROVIDER=dev-mailbox in production with allow flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "dev-mailbox");
    vi.stubEnv("ALLOW_DEV_MAILBOX_IN_PROD", "true");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "allowed@example.com",
      subject: "Allowed",
      html: "<p>hello</p>",
    });

    expect(appendDevMailboxMessageMock).toHaveBeenCalledTimes(1);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("attempts both sends in resend+dev-mailbox mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend+dev-mailbox");
    vi.stubEnv("ALLOW_DEV_MAILBOX_IN_PROD", "true");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    await adapter.send({
      to: "dual@example.com",
      subject: "Dual",
      html: "<p>hello</p>",
    });

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(appendDevMailboxMessageMock).toHaveBeenCalledTimes(1);
  });

  it("keeps resend authoritative in dual mode when mailbox append fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend+dev-mailbox");
    vi.stubEnv("ALLOW_DEV_MAILBOX_IN_PROD", "true");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");
    appendDevMailboxMessageMock.mockRejectedValue(new Error("disk write failed"));
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      adapter.send({
        to: "dual@example.com",
        subject: "Dual",
        html: "<p>hello</p>",
      })
    ).resolves.toBeUndefined();

    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(appendDevMailboxMessageMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[EMAIL ERROR] Failed to append message to dev mailbox:",
      expect.objectContaining({
        subject: "Dual",
        error: "disk write failed",
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it("still attempts mailbox append when resend fails, then throws resend error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "resend+dev-mailbox");
    vi.stubEnv("ALLOW_DEV_MAILBOX_IN_PROD", "true");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "noreply@example.com");

    mockResendSend.mockRejectedValue(new Error("resend unavailable"));
    const { getEmailAdapter } = await loadEmailModule();

    const adapter = getEmailAdapter();

    await expect(
      adapter.send({
        to: "dual@example.com",
        subject: "Dual",
        html: "<p>hello</p>",
      })
    ).rejects.toThrow("resend unavailable");

    expect(appendDevMailboxMessageMock).toHaveBeenCalledTimes(1);
  });

  it("returns false for dev mailbox access in test env", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { isDevMailboxAccessAllowed } = await loadEmailModule();

    expect(isDevMailboxAccessAllowed()).toBe(false);
  });

  it("returns true for dev mailbox access in development defaults", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { isDevMailboxAccessAllowed } = await loadEmailModule();

    expect(isDevMailboxAccessAllowed()).toBe(true);
  });

  it("returns true for production dev-mailbox override only when allow flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_PROVIDER", "dev-mailbox");
    const { isDevMailboxAccessAllowed } = await loadEmailModule();

    expect(isDevMailboxAccessAllowed()).toBe(false);

    vi.stubEnv("ALLOW_DEV_MAILBOX_IN_PROD", "true");
    expect(isDevMailboxAccessAllowed()).toBe(true);
  });
});
