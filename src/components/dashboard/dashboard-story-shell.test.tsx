import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardStoryShell } from "./dashboard-story-shell";

describe("DashboardStoryShell", () => {
  it("applies glow styling to kpis and analytics in insights mode without magnifying", () => {
    render(
      <DashboardStoryShell
        title="Dashboard"
        subtitle="Subtitle"
        kpis={{ total: 10, active: 3, completed: 5, avgProgress: 70, archived: 0 }}
        filterControls={<div>Filters</div>}
        tableContent={<div>Table</div>}
        activities={[{ id: "a-1", message: "Created item", timestamp: "2026-01-01T00:00:00Z" }]}
        analyticsContent={<div data-testid="analytics-panel">Analytics panel</div>}
        focusArea="insights"
      />
    );

    const kpiSection = screen.getByText("Total Projects").closest("div.mb-8");
    const analyticsSection = screen.getByTestId("analytics-panel").parentElement?.parentElement;

    expect(kpiSection?.className).toContain("story-focus-glow");
    expect(analyticsSection?.className).toContain("story-focus-glow");
    expect(kpiSection?.className).toContain("rounded-lg");
    expect(analyticsSection?.className).toContain("rounded-lg");
    expect(kpiSection?.className).not.toContain("scale-[1.");
    expect(analyticsSection?.className).not.toContain("scale-[1.");
  });

  it("does not apply colored focus highlighting in story mode", () => {
    render(
      <DashboardStoryShell
        title="Dashboard"
        subtitle="Subtitle"
        kpis={{ total: 10, active: 3, completed: 5, avgProgress: 70, archived: 0 }}
        filterControls={<div data-testid="filters">Filters</div>}
        tableContent={<div data-testid="table-content">Table</div>}
        activities={[{ id: "a-1", message: "Created item", timestamp: "2026-01-01T00:00:00Z" }]}
        quickActionsContent={<button type="button">Action</button>}
        analyticsContent={<div>Analytics</div>}
        focusArea="search"
      />
    );

    const filterWrapper = screen.getByTestId("filters").parentElement;
    const tableSurface = screen.getByTestId("table-content").closest(".surface-card");

    expect(filterWrapper?.className).not.toContain("ring-info-border/70");
    expect(tableSurface?.className).not.toContain("ring-info-border/70");
  });

  it("collapses operational panels when requested", () => {
    render(
      <DashboardStoryShell
        title="Dashboard"
        subtitle="Subtitle"
        kpis={{ total: 10, active: 3, completed: 5, avgProgress: 70, archived: 0 }}
        filterControls={<div>Filters</div>}
        tableContent={<div data-testid="table-content">Table</div>}
        activities={[{ id: "a-1", message: "Created item", timestamp: "2026-01-01T00:00:00Z" }]}
        analyticsContent={<div>Analytics</div>}
        showOperationalPanels={false}
        animateOperationalPanels={false}
        focusArea="kpis"
      />
    );

    const tableContent = screen.getByTestId("table-content");
    const operationalPanels =
      tableContent.parentElement?.parentElement?.parentElement?.parentElement;
    expect(operationalPanels?.className).toContain("max-h-0");
    expect(operationalPanels?.className).toContain("opacity-0");
  });
});
