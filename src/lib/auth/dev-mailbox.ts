import "server-only";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailMessage } from "./email";

type StoredEmailMessage = EmailMessage & {
  id: string;
  createdAt: string;
};

const mailboxPath = process.env.DEV_MAILBOX_PATH ?? path.join(process.cwd(), ".dev-mailbox.json");

async function readMailbox(): Promise<StoredEmailMessage[]> {
  try {
    const raw = await readFile(mailboxPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredEmailMessage[]) : [];
  } catch {
    return [];
  }
}

export async function appendDevMailboxMessage(message: EmailMessage): Promise<void> {
  const entry: StoredEmailMessage = {
    ...message,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const messages = await readMailbox();
  messages.push(entry);
  await writeFile(mailboxPath, JSON.stringify(messages, null, 2), "utf8");
}

export async function getDevMailboxMessages(): Promise<StoredEmailMessage[]> {
  return readMailbox();
}
