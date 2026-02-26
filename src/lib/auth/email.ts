import "server-only";
import { Resend } from "resend";
import { appendDevMailboxMessage } from "./dev-mailbox";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
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
        await resend.emails.send({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
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
  // Tests are always isolated to the in-memory adapter.
  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (configuredProvider) {
    return parseConfiguredEmailProvider(configuredProvider);
  }

  if (process.env.NODE_ENV === "development") {
    return "dev-mailbox";
  }

  return "resend";
}

function assertProductionDevMailboxGate(provider: EmailProvider): void {
  if (process.env.NODE_ENV !== "production") {
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

  if (process.env.NODE_ENV === "production" && !isDevMailboxAllowedInProduction()) {
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
