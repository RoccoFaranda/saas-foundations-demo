// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("dev mailbox storage", () => {
  let tempDir: string;
  let mailboxPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "dev-mailbox-test-"));
    mailboxPath = path.join(tempDir, "mailbox.json");
    vi.stubEnv("DEV_MAILBOX_PATH", mailboxPath);
    await vi.resetModules();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("appends and reads mailbox messages", async () => {
    const { appendDevMailboxMessage, getDevMailboxMessages } = await import("../auth/dev-mailbox");

    await appendDevMailboxMessage({
      to: "first@example.com",
      subject: "First",
      html: "<p>First</p>",
      text: "First",
    });

    const messages = await getDevMailboxMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        to: "first@example.com",
        subject: "First",
      })
    );
    expect(messages[0].id).toBeTypeOf("string");
    expect(messages[0].createdAt).toBeTypeOf("string");
  });

  it("serializes concurrent appends without losing messages", async () => {
    const { appendDevMailboxMessage, getDevMailboxMessages } = await import("../auth/dev-mailbox");

    await Promise.all([
      appendDevMailboxMessage({
        to: "one@example.com",
        subject: "One",
        html: "<p>One</p>",
        text: "One",
      }),
      appendDevMailboxMessage({
        to: "two@example.com",
        subject: "Two",
        html: "<p>Two</p>",
        text: "Two",
      }),
      appendDevMailboxMessage({
        to: "three@example.com",
        subject: "Three",
        html: "<p>Three</p>",
        text: "Three",
      }),
    ]);

    const messages = await getDevMailboxMessages();
    expect(messages).toHaveLength(3);
    expect(messages.map((entry) => entry.to).sort()).toEqual([
      "one@example.com",
      "three@example.com",
      "two@example.com",
    ]);
  });

  it("throws for malformed mailbox JSON", async () => {
    await writeFile(mailboxPath, "{not-valid-json", "utf8");
    const { getDevMailboxMessages } = await import("../auth/dev-mailbox");

    await expect(getDevMailboxMessages()).rejects.toThrow("invalid JSON");
  });
});
