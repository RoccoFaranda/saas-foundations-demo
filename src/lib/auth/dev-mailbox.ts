import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailMessage } from "./email";

export type StoredEmailMessage = EmailMessage & {
  id: string;
  createdAt: string;
};

const mailboxPath = process.env.DEV_MAILBOX_PATH ?? path.join(process.cwd(), ".dev-mailbox.json");
const mailboxDirectory = path.dirname(mailboxPath);
let writeQueue: Promise<void> = Promise.resolve();

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

function parseMailbox(raw: string): StoredEmailMessage[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Dev mailbox file must contain a JSON array.");
  }

  return parsed as StoredEmailMessage[];
}

async function readMailbox(): Promise<StoredEmailMessage[]> {
  try {
    const raw = await readFile(mailboxPath, "utf8");
    return parseMailbox(raw);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return [];
    }

    if (error instanceof SyntaxError) {
      throw new Error("Dev mailbox file contains invalid JSON.");
    }

    if (error instanceof Error && error.message.includes("must contain a JSON array")) {
      throw error;
    }

    throw error;
  }
}

async function writeMailbox(messages: StoredEmailMessage[]): Promise<void> {
  await mkdir(mailboxDirectory, { recursive: true });

  const tempPath = `${mailboxPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(messages, null, 2), "utf8");

  try {
    await rename(tempPath, mailboxPath);
  } catch (error) {
    if (hasErrorCode(error, "EPERM") || hasErrorCode(error, "EEXIST")) {
      try {
        await unlink(mailboxPath);
      } catch (unlinkError) {
        if (!hasErrorCode(unlinkError, "ENOENT")) {
          throw unlinkError;
        }
      }

      await rename(tempPath, mailboxPath);
    } else {
      throw error;
    }
  } finally {
    try {
      await unlink(tempPath);
    } catch (cleanupError) {
      if (!hasErrorCode(cleanupError, "ENOENT")) {
        throw cleanupError;
      }
    }
  }
}

export async function appendDevMailboxMessage(message: EmailMessage): Promise<void> {
  const entry: StoredEmailMessage = {
    ...message,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const operation = writeQueue.then(async () => {
    const messages = await readMailbox();
    messages.push(entry);
    await writeMailbox(messages);
  });

  writeQueue = operation.catch(() => {});
  await operation;
}

export async function getDevMailboxMessages(): Promise<StoredEmailMessage[]> {
  return readMailbox();
}
