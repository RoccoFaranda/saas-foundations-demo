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
 * Check if Resend should be used
 */
type EmailProvider = "resend" | "dev" | "test";

function resolveEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (provider) {
    if (provider !== "resend") {
      throw new Error(`Unsupported EMAIL_PROVIDER value: ${provider}`);
    }
    return "resend";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.NODE_ENV === "development") {
    return "dev";
  }

  return "resend";
}

/**
 * Get the appropriate email adapter based on environment
 */
export function getEmailAdapter(): EmailAdapter {
  const provider = resolveEmailProvider();

  if (provider === "test") {
    return testEmailAdapter;
  }

  if (provider === "dev") {
    return devMailboxEmailAdapter;
  }

  return createResendAdapter();
}
