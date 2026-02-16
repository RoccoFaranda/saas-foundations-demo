import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/src/components/ui/toast";
import { DashboardExportButton } from "./dashboard-export-button";

const originalFetch = global.fetch;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("DashboardExportButton", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:dashboard-export"),
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });

    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });

    vi.restoreAllMocks();
  });

  it("fetches export route, downloads blob, and shows toast", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => {
      return new Response("name,status\nProject,active", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="projects-2026.csv"',
        },
      });
    });

    global.fetch = fetchMock as typeof fetch;

    render(
      <ToastProvider>
        <DashboardExportButton exportHref="/app/dashboard/export" rowCount={12} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/app/dashboard/export", {
        method: "GET",
        cache: "no-store",
      });
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("CSV downloaded")).toBeInTheDocument();
    expect(screen.getByText("projects-2026.csv (12 rows)")).toBeInTheDocument();
  });
});
