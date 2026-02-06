import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

function ToastHarness({ onAction }: { onAction?: () => void }) {
  const { pushToast } = useToast();

  return (
    <button
      type="button"
      onClick={() =>
        pushToast({
          title: "Project archived",
          description: "Demo project",
          actions: onAction
            ? [
                {
                  label: "Undo",
                  onClick: onAction,
                },
              ]
            : undefined,
        })
      }
    >
      Notify
    </button>
  );
}

describe("Toast", () => {
  it("renders and auto-dismisses after timeout", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByText("Project archived")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Project archived")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("invokes action and dismisses the toast", async () => {
    const onAction = vi.fn();

    render(
      <ToastProvider>
        <ToastHarness onAction={onAction} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));

    const actionButton = screen.getByRole("button", { name: "Undo" });
    fireEvent.click(actionButton);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Project archived")).not.toBeInTheDocument();
  });
});
