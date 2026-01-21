import "server-only";
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
 * Dev helpers for accessing the mailbox (dev-only)
 */

/**
 * Get the appropriate email adapter based on environment
 */
export function getEmailAdapter(): EmailAdapter {
  if (process.env.NODE_ENV === "test") {
    return testEmailAdapter;
  }
  if (process.env.NODE_ENV === "development") {
    return devMailboxEmailAdapter;
  }
  return devEmailAdapter;
}
