import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function globalSetup() {
  const configuredMailboxPath = process.env.DEV_MAILBOX_PATH ?? ".dev-mailbox.e2e.json";
  const mailboxPath = path.isAbsolute(configuredMailboxPath)
    ? configuredMailboxPath
    : path.join(process.cwd(), configuredMailboxPath);

  await mkdir(path.dirname(mailboxPath), { recursive: true });
  await writeFile(mailboxPath, "[]\n", "utf8");
}
