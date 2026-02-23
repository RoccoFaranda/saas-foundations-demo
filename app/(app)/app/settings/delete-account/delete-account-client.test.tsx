import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAccountClient from "./delete-account-client";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

const requestAccountDeletionMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/src/lib/auth/actions", () => ({
  requestAccountDeletion: requestAccountDeletionMock,
}));

function submitDeleteForm() {
  fireEvent.change(screen.getByLabelText("Current Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
    target: { value: "DELETE" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
}

describe("DeleteAccountClient", () => {
  beforeEach(() => {
    requestAccountDeletionMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows rate-limit message and re-enables submit after retryAt", async () => {
    vi.useFakeTimers();
    requestAccountDeletionMock.mockResolvedValue({
      success: false,
      error: "Too many requests. Try again in 1 minute.",
      retryAt: Date.now() + 2000,
    });

    render(<DeleteAccountClient graceDays={14} />);
    submitDeleteForm();

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Too many requests. Try again in 1 minute.")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: "Delete account" });
    expect(submitButton).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(submitButton).not.toBeDisabled();
    expect(screen.queryByText("Too many requests. Try again in 1 minute.")).not.toBeInTheDocument();
  });

  it("shows generic fallback for non-rate-limit action errors", async () => {
    requestAccountDeletionMock.mockRejectedValue(new Error("network"));

    render(<DeleteAccountClient graceDays={14} />);
    submitDeleteForm();

    await waitFor(() => {
      expect(screen.getByText(GENERIC_ACTION_ERROR)).toBeInTheDocument();
    });
  });

  it("redirects to login after successful deletion request", async () => {
    requestAccountDeletionMock.mockResolvedValue({
      success: true,
      redirectUrl: "/login?deleted=scheduled",
    });

    render(<DeleteAccountClient graceDays={14} />);
    submitDeleteForm();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login?deleted=scheduled");
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
