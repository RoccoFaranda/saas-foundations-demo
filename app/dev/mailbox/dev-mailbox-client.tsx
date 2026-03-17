"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";

type DevMailboxMessage = {
  id: string;
  to: string;
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  createdAt: string;
};

type DevMailboxResponse = {
  messages: DevMailboxMessage[];
};

const LOAD_ERROR = "Unable to load mailbox messages. Please try again.";

const DEV_MAILBOX_EMAIL_THEME_OVERRIDES = `
.mailbox-force-light .email-bg { background-color: #f1f5f9 !important; }
.mailbox-force-light .email-card { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
.mailbox-force-light .email-brand, .mailbox-force-light .email-link { color: #1f4db8 !important; }
.mailbox-force-light .email-heading { color: #020617 !important; }
.mailbox-force-light .email-copy, .mailbox-force-light .email-detail { color: #0f172a !important; }
.mailbox-force-light .email-security, .mailbox-force-light .email-support, .mailbox-force-light .email-fallback-copy { color: #334155 !important; }
.mailbox-force-light .email-fallback { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
.mailbox-force-light .email-button-cell { background-color: #1f4db8 !important; }
.mailbox-force-light .email-button { color: #ffffff !important; }

.mailbox-force-dark .email-bg { background-color: #0b1220 !important; }
.mailbox-force-dark .email-card { background-color: #111827 !important; border-color: #334155 !important; }
.mailbox-force-dark .email-brand, .mailbox-force-dark .email-link { color: #bfdbfe !important; }
.mailbox-force-dark .email-heading { color: #f8fafc !important; }
.mailbox-force-dark .email-copy, .mailbox-force-dark .email-detail { color: #e2e8f0 !important; }
.mailbox-force-dark .email-security, .mailbox-force-dark .email-support, .mailbox-force-dark .email-fallback-copy { color: #cbd5e1 !important; }
.mailbox-force-dark .email-fallback { background-color: #1e293b !important; border-color: #334155 !important; }
.mailbox-force-dark .email-button-cell { background-color: #7fb3e8 !important; }
.mailbox-force-dark .email-button { color: #0a1324 !important; }
`;

export default function DevMailboxClient() {
  const { resolvedTheme } = useTheme();
  const [messages, setMessages] = useState<DevMailboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previewThemeClass = resolvedTheme === "dark" ? "mailbox-force-dark" : "mailbox-force-light";

  const loadMessages = useCallback(async (isManualRefresh: boolean) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setMessages(null);
    }
    setError(null);

    try {
      const response = await fetch("/api/dev/mailbox", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Mailbox request failed.");
      }

      const payload = (await response.json()) as Partial<DevMailboxResponse>;
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch {
      setError(LOAD_ERROR);
      setMessages([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages(false);
  }, [loadMessages]);

  if (messages === null) {
    return <div className="state-info p-4">Loading messages...</div>;
  }

  return (
    <section className="space-y-4">
      <style>{DEV_MAILBOX_EMAIL_THEME_OVERRIDES}</style>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void loadMessages(true)}
          disabled={isRefreshing}
          className="btn-secondary btn-sm"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="state-error p-4" role="alert">
          {error}
        </div>
      ) : messages.length === 0 ? (
        <div className="state-info p-4">No messages yet.</div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="surface-card p-4">
              <div className="text-sm text-muted-foreground">To</div>
              <div className="mb-3 text-sm font-medium">{message.to}</div>
              <div className="text-sm text-muted-foreground">Subject</div>
              <div className="mb-3 text-sm font-medium">{message.subject}</div>
              {message.preheader ? (
                <>
                  <div className="text-sm text-muted-foreground">Preheader</div>
                  <div className="mb-3 text-sm font-medium">{message.preheader}</div>
                </>
              ) : null}
              {message.html ? (
                <div className={`prose max-w-none text-sm dark:prose-invert ${previewThemeClass}`}>
                  <div dangerouslySetInnerHTML={{ __html: message.html }} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-foreground">{message.text}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
