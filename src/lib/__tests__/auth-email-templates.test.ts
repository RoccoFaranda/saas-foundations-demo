// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAccountDeletionScheduledTemplate,
  buildResetPasswordTemplate,
  buildVerifyEmailTemplate,
  buildVerifyNewEmailTemplate,
} from "../auth/email-templates";

describe("auth email templates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("buildVerifyEmailTemplate includes subject, CTA, fallback URL, and security copy", () => {
    const verifyUrl = "https://app.example.com/verify-email?token=abc123";
    const template = buildVerifyEmailTemplate(verifyUrl);

    expect(template.subject).toBe("Verify your email - SaaS Foundations Demo");
    expect(template.preheader).toContain("Confirm your email");
    expect(template.html).toContain("Verify your email");
    expect(template.html).toContain(`href="${verifyUrl}"`);
    expect(template.html).toContain("If the button does not work");
    expect(template.html).toContain("This link expires in 1 hour.");
    expect(template.html).toContain("If you didn&#39;t create this account");
    expect(template.html).toContain("display:none");
    expect(template.text).toContain(`Verify email: ${verifyUrl}`);
    expect(template.text).toContain("If you didn't create this account");
    expect(template.text).toContain("This link expires in 1 hour.");
  });

  it("buildResetPasswordTemplate includes support footer when support email is configured", () => {
    vi.stubEnv("SUPPORT_EMAIL", "support@example.com");

    const resetUrl = "https://app.example.com/reset-password?token=reset123";
    const template = buildResetPasswordTemplate(resetUrl);

    expect(template.subject).toBe("Reset your password - SaaS Foundations Demo");
    expect(template.html).toContain("support@example.com");
    expect(template.text).toContain("Need help? Contact support@example.com.");
    expect(template.text).toContain(`Reset password: ${resetUrl}`);
    expect(template.text).toContain("If you didn't request a password reset");
  });

  it("buildVerifyNewEmailTemplate escapes interpolated email values", () => {
    const maliciousEmail = 'new-email"><script>alert(1)</script>@example.com';
    const verifyUrl = "https://app.example.com/verify-email-change?token=change123";
    const template = buildVerifyNewEmailTemplate(verifyUrl, maliciousEmail);

    expect(template.subject).toBe("Verify your new email - SaaS Foundations Demo");
    expect(template.html).toContain("Requested new email:");
    expect(template.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(template.html).not.toContain("<script>alert(1)</script>");
    expect(template.text).toContain("you can safely ignore this email");
    expect(template.text).toContain("only be updated if this link is used");
    expect(template.text).toContain(maliciousEmail);
    expect(template.text).toContain(`Verify new email: ${verifyUrl}`);
  });

  it("buildAccountDeletionScheduledTemplate includes restore URL and deletion deadline", () => {
    const scheduledFor = new Date("2026-03-01T15:30:00.000Z");
    const restoreUrl = "https://app.example.com/restore-account?token=restore123";
    const template = buildAccountDeletionScheduledTemplate(restoreUrl, scheduledFor);

    expect(template.subject).toBe("Account deletion scheduled - SaaS Foundations Demo");
    expect(template.preheader).toContain("scheduled for permanent deletion");
    expect(template.html).toContain(`href="${restoreUrl}"`);
    expect(template.html).toContain("Permanent deletion date:");
    expect(template.html).toContain("UTC");
    expect(template.html).toContain("If you didn&#39;t request this deletion");
    expect(template.text).toContain(`Restore account: ${restoreUrl}`);
    expect(template.text).toContain("If you didn't request this deletion");
    expect(template.text).toContain("Permanent deletion date:");
    expect(template.text).toContain("UTC");
  });
});
