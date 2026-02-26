import { notFound } from "next/navigation";
import { isDevMailboxAccessAllowed } from "@/src/lib/auth/email";
import DevMailboxClient from "./dev-mailbox-client";

export default async function DevMailboxPage() {
  if (!isDevMailboxAccessAllowed()) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Dev Mailbox</h1>
        <p className="text-sm text-muted-foreground">
          Local-only inbox for testing verification and reset links.
        </p>
      </header>
      <DevMailboxClient />
    </main>
  );
}
