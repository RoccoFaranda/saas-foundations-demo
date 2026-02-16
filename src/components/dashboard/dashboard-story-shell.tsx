import { DashboardShell, type DashboardShellProps } from "./dashboard-shell";

export type DashboardStoryFocusArea =
  | "kpis"
  | "analytics"
  | "search"
  | "export"
  | "insights"
  | null;

export interface DashboardStoryShellProps extends Omit<
  DashboardShellProps,
  | "kpiSectionClassName"
  | "operationalPanelsClassName"
  | "tableSurfaceClassName"
  | "tableActionsWrapperClassName"
  | "filterControlsWrapperClassName"
  | "analyticsSectionClassName"
> {
  /** Story-driven visual focus mode */
  focusArea?: DashboardStoryFocusArea;
  /** Toggle for the operational middle section (table + side panels) */
  showOperationalPanels?: boolean;
  /** Whether operational panel visibility should animate */
  animateOperationalPanels?: boolean;
}

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getOperationalPanelsClassName({
  showOperationalPanels,
  animateOperationalPanels,
}: {
  showOperationalPanels: boolean;
  animateOperationalPanels: boolean;
}) {
  return joinClasses(
    animateOperationalPanels ? "transition-all duration-500" : undefined,
    showOperationalPanels
      ? "max-h-[140rem] translate-y-0 opacity-100"
      : "pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0"
  );
}

export function DashboardStoryShell({
  focusArea = null,
  showOperationalPanels = true,
  animateOperationalPanels = true,
  ...props
}: DashboardStoryShellProps) {
  const shouldHighlightInsights =
    focusArea === "insights" || focusArea === "kpis" || focusArea === "analytics";
  const insightsFocusClassName =
    "relative z-20 rounded-lg story-focus-glow transition-all duration-300";

  return (
    <DashboardShell
      {...props}
      kpiSectionClassName={shouldHighlightInsights ? insightsFocusClassName : undefined}
      analyticsSectionClassName={shouldHighlightInsights ? insightsFocusClassName : undefined}
      operationalPanelsClassName={getOperationalPanelsClassName({
        showOperationalPanels,
        animateOperationalPanels,
      })}
    />
  );
}
