import { notFound } from "next/navigation";
import { getDevMailboxMessages } from "@/src/lib/auth/dev-mailbox";

export const dynamic = "force-dynamic";

export default async function DevMailboxPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const messages = (await getDevMailboxMessages()).slice().reverse();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6" suppressHydrationWarning>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Dev Mailbox</h1>
        <p className="text-sm text-foreground/60">
          Local-only inbox for testing verification and reset links.
        </p>
      </header>

      {messages.length === 0 ? (
        <div className="rounded-md border border-foreground/20 bg-background p-4 text-sm text-foreground/70">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.subject}-${index}`}
              className="rounded-md border border-foreground/20 bg-background p-4"
            >
              <div className="text-sm text-foreground/60">To</div>
              <div className="mb-3 text-sm font-medium">{message.to}</div>
              <div className="text-sm text-foreground/60">Subject</div>
              <div className="mb-3 text-sm font-medium">{message.subject}</div>
              {message.html ? (
                <div className="prose prose-invert max-w-none text-sm">
                  <div dangerouslySetInnerHTML={{ __html: message.html }} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-foreground/80">{message.text}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
