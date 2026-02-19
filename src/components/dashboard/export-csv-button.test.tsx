import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/src/components/ui/toast";
import { ExportCsvButton } from "./export-csv-button";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("ExportCsvButton", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:export"),
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows delayed pending label, then downloads and toasts on success", async () => {
    vi.useFakeTimers();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const deferred = createDeferred<{ blob: Blob; filename: string; rowCount: number }>();
    const onExport = vi.fn(() => deferred.promise);

    render(
      <ToastProvider>
        <ExportCsvButton onExport={onExport} pendingDelayMs={300} />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Export CSV" });
    fireEvent.click(button);

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Export CSV");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(button).toHaveTextContent("Export CSV");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(button).toHaveTextContent("Exporting...");

    await act(async () => {
      deferred.resolve({
        blob: new Blob(["csv"], { type: "text/csv;charset=utf-8" }),
        filename: "projects.csv",
        rowCount: 3,
      });
      await Promise.resolve();
    });

    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("Export CSV");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("CSV downloaded")).toBeInTheDocument();
    expect(screen.getByText("projects.csv (3 rows)")).toBeInTheDocument();
  });

  it("shows error toast and resets button when export fails", async () => {
    const onExport = vi.fn(async () => {
      throw new Error("network");
    });

    render(
      <ToastProvider>
        <ExportCsvButton onExport={onExport} />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Export CSV" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Export failed")).toBeInTheDocument();
    });

    expect(screen.getByText("Please try again.")).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("Export CSV");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("disables export until retryAt when rate limited, then re-enables", async () => {
    vi.useFakeTimers();
    const onExport = vi.fn(async () => {
      throw Object.assign(new Error("Too many requests. Try again in 1 minute."), {
        status: 429,
        message: "Too many requests. Try again in 1 minute.",
        retryAt: Date.now() + 2000,
      });
    });

    render(
      <ToastProvider>
        <ExportCsvButton onExport={onExport} />
      </ToastProvider>
    );

    const button = screen.getByRole("button", { name: "Export CSV" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Export rate limited")).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Try again in 0:02");

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(onExport).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Try again in 0:01");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("Export CSV");

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(onExport).toHaveBeenCalledTimes(2);
  });
});
