import "server-only";

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
 * In-memory mailbox for testing
 */
class TestMailbox {
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

const testMailbox = new TestMailbox();

/**
 * Test adapter: stores emails in memory for test assertions
 */
export const testEmailAdapter: EmailAdapter = {
  async send(message: EmailMessage) {
    testMailbox.add(message);
  },
};

/**
 * Test helpers for accessing the mailbox
 */
export const testEmailHelpers = {
  getAll: () => testMailbox.getAll(),
  findByTo: (email: string) => testMailbox.findByTo(email),
  findBySubject: (subject: string) => testMailbox.findBySubject(subject),
  findLatest: () => testMailbox.findLatest(),
  reset: () => testMailbox.reset(),
};

/**
 * Get the appropriate email adapter based on environment
 */
export function getEmailAdapter(): EmailAdapter {
  if (process.env.NODE_ENV === "test") {
    return testEmailAdapter;
  }
  return devEmailAdapter;
}
