import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickyDashboardStory } from "./sticky-dashboard-story";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("StickyDashboardStory", () => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  it("marks the preview canvas as decorative and non-interactive", () => {
    render(<StickyDashboardStory />);

    const preview = screen.getByTestId("story-preview-decorative");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(preview).toHaveAttribute("inert");
    expect(within(preview).getByText("Export CSV")).toBeInTheDocument();
    expect(within(preview).getByText("CSV downloaded")).toBeInTheDocument();
  });
});
