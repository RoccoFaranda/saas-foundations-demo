import "server-only";
import { Resend } from "resend";
import { appendDevMailboxMessage } from "./dev-mailbox";
import { getSupportEmail } from "../config/support-email";
import { getDeploymentTarget, isProductionDeployment, parseBooleanEnv } from "../config/deployment";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailTag = {
  name: string;
  value: string;
};

export interface EmailMessage {
  to: string;
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: EmailTag[];
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Dev adapter: logs email messages with redacted tokens
 */
export const devEmailAdapter: EmailAdapter = {
  async send(message: EmailMessage) {
    console.log("[EMAIL DEV] Sending email:", {
      subject: message.subject,
    });
  },
};

/**
 * Dev mailbox adapter: stores emails on disk for local inspection
 */
export const devMailboxEmailAdapter: EmailAdapter = {
  async send(message: EmailMessage) {
    await appendDevMailboxMessage(message);
  },
};

/**
 * In-memory mailbox for dev/test
 */
class InMemoryMailbox {
  private messages: EmailMessage[] = [];

  add(message: EmailMessage): void {
    this.messages.push(message);
  }

  getAll(): EmailMessage[] {
    return [...this.messages];
  }

  findByTo(email: string): EmailMessage[] {
    return this.messages.filter((msg) => msg.to === email);
  }

  findBySubject(subject: string): EmailMessage[] {
    return this.messages.filter((msg) => msg.subject === subject);
  }

  findLatest(): EmailMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  reset(): void {
    this.messages = [];
  }
}

const mailbox = new InMemoryMailbox();

/**
 * In-memory adapter for dev/test assertions
 */
export const testEmailAdapter: EmailAdapter = {
  async send(message: EmailMessage) {
    mailbox.add(message);
  },
};

/**
 * Test helpers for accessing the mailbox
 */
export const testEmailHelpers = {
  getAll: () => mailbox.getAll(),
  findByTo: (email: string) => mailbox.findByTo(email),
  findBySubject: (subject: string) => mailbox.findBySubject(subject),
  findLatest: () => mailbox.findLatest(),
  reset: () => mailbox.reset(),
};

function normalizeEmailAddress(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  return EMAIL_PATTERN.test(trimmed) ? trimmed : null;
}

function resolveDefaultReplyTo(): string | undefined {
  const configuredReplyTo = normalizeEmailAddress(process.env.EMAIL_REPLY_TO);
  if (configuredReplyTo) {
    return configuredReplyTo;
  }

  try {
    return getSupportEmail() ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resend production adapter
 * Never logs tokens or PII
 */
function createResendAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Resend adapter requires RESEND_API_KEY and EMAIL_FROM environment variables");
  }

  const resend = new Resend(apiKey);

  return {
    async send(message: EmailMessage) {
      // Never log tokens or PII - only log subject for debugging
      try {
        const replyTo = normalizeEmailAddress(message.replyTo) ?? resolveDefaultReplyTo();
        await resend.emails.send({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          replyTo,
          tags: message.tags,
        });
      } catch (error) {
        // Log error without exposing tokens or PII
        console.error("[EMAIL ERROR] Failed to send email:", {
          subject: message.subject,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  };
}

/**
 * Check which email provider should be used.
 */
type EmailProvider = "resend" | "dev-mailbox" | "resend+dev-mailbox" | "test";

function isDevMailboxProvider(provider: EmailProvider): boolean {
  return provider === "dev-mailbox" || provider === "resend+dev-mailbox";
}

function isDevMailboxAllowedInProduction(): boolean {
  return parseBooleanEnv(process.env.ALLOW_DEV_MAILBOX_IN_PROD);
}

function parseConfiguredEmailProvider(provider: string): EmailProvider {
  if (provider === "resend" || provider === "dev-mailbox" || provider === "resend+dev-mailbox") {
    return provider;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER value: ${provider}`);
}

function resolveEmailProvider(): EmailProvider {
  const target = getDeploymentTarget();

  if (target === "test") {
    return "test";
  }

  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (configuredProvider) {
    return parseConfiguredEmailProvider(configuredProvider);
  }

  if (target === "development") {
    return "dev-mailbox";
  }

  return "resend";
}

function assertProductionDevMailboxGate(provider: EmailProvider): void {
  if (!isProductionDeployment()) {
    return;
  }

  if (!isDevMailboxProvider(provider)) {
    return;
  }

  if (!isDevMailboxAllowedInProduction()) {
    throw new Error(
      "EMAIL_PROVIDER includes dev-mailbox in production; set ALLOW_DEV_MAILBOX_IN_PROD=true to allow this override."
    );
  }
}

function createResendAndMailboxTeeAdapter(
  resendAdapter: EmailAdapter,
  mailboxAdapter: EmailAdapter
): EmailAdapter {
  return {
    async send(message: EmailMessage) {
      let resendError: unknown = null;

      try {
        await resendAdapter.send(message);
      } catch (error) {
        resendError = error;
      }

      try {
        await mailboxAdapter.send(message);
      } catch (error) {
        // Keep logging safe: no token/link content, only subject and generic error string.
        console.error("[EMAIL ERROR] Failed to append message to dev mailbox:", {
          subject: message.subject,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      if (resendError) {
        throw resendError;
      }
    },
  };
}

export function isDevMailboxAccessAllowed(): boolean {
  let provider: EmailProvider;

  try {
    provider = resolveEmailProvider();
  } catch {
    return false;
  }

  if (!isDevMailboxProvider(provider)) {
    return false;
  }

  if (isProductionDeployment() && !isDevMailboxAllowedInProduction()) {
    return false;
  }

  return true;
}

/**
 * Get the appropriate email adapter based on environment
 */
export function getEmailAdapter(): EmailAdapter {
  const provider = resolveEmailProvider();
  assertProductionDevMailboxGate(provider);

  if (provider === "test") {
    return testEmailAdapter;
  }

  if (provider === "dev-mailbox") {
    return devMailboxEmailAdapter;
  }

  if (provider === "resend+dev-mailbox") {
    return createResendAndMailboxTeeAdapter(createResendAdapter(), devMailboxEmailAdapter);
  }

  return createResendAdapter();
}
