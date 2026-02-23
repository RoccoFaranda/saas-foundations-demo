"use client";

import { useCallback, useEffect, useState } from "react";

type DevMailboxMessage = {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  createdAt: string;
};

type DevMailboxResponse = {
  messages: DevMailboxMessage[];
};

const LOAD_ERROR = "Unable to load mailbox messages. Please try again.";

export default function DevMailboxClient() {
  const [messages, setMessages] = useState<DevMailboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
              {message.html ? (
                <div className="prose prose-invert max-w-none text-sm">
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
