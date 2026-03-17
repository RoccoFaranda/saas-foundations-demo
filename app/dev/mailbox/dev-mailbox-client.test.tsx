import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DevMailboxClient from "./dev-mailbox-client";

const originalFetch = global.fetch;

describe("DevMailboxClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("loads and renders mailbox messages from the API", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          messages: [
            {
              id: "message-1",
              to: "user@example.com",
              subject: "Verify your email",
              preheader: "Confirm your email to finish setup.",
              html: "<p>Body</p>",
              text: "Body",
              createdAt: "2026-02-23T00:00:00.000Z",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    });
    global.fetch = fetchMock as typeof fetch;

    render(<DevMailboxClient />);

    expect(screen.getByText("Loading messages...")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/dev/mailbox", {
        method: "GET",
        cache: "no-store",
      });
    });

    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(screen.getByText("Confirm your email to finish setup.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("shows an error when mailbox API returns non-OK response", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    global.fetch = fetchMock as typeof fetch;

    render(<DevMailboxClient />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to load mailbox messages. Please try again."
      );
    });
  });

  it("refreshes mailbox data on button click", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            messages: [
              {
                id: "message-1",
                to: "first@example.com",
                subject: "First",
                preheader: "First preheader",
                html: "<p>First</p>",
                text: "First",
                createdAt: "2026-02-23T00:00:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            messages: [
              {
                id: "message-2",
                to: "second@example.com",
                subject: "Second",
                preheader: "Second preheader",
                html: "<p>Second</p>",
                text: "Second",
                createdAt: "2026-02-23T00:01:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    global.fetch = fetchMock as typeof fetch;

    render(<DevMailboxClient />);

    await waitFor(() => {
      expect(screen.getByText("first@example.com")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText("second@example.com")).toBeInTheDocument();
    });
  });
});
