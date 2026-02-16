"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DashboardStoryShell,
  ItemsTable,
  StatusDistributionChart,
  TableFilters,
  TablePagination,
  TrendChart,
  type ActivityEntry,
} from "@/src/components/dashboard";
import { getSampleDashboardItems } from "@/src/lib/dashboard/sample-items";
import { buildInMemoryDashboardViewModel } from "@/src/lib/dashboard/view-model";
import { PageContainer } from "@/src/components/layout/page-container";
import {
  BASE_SHOW_ARCHIVED,
  BASE_SORT_DIRECTION,
  BASE_SORT_FIELD,
  BASE_STATUS,
  BASE_TAG,
  PREVIEW_ROUTE_LABEL,
  ROWS_PER_PAGE,
  STORY_SCENES,
  STORY_TRACK_HEIGHT_CLASS,
  clamp,
  getRevealFactors,
  getExportScenePhase,
  getExportToastProgress,
  getSceneState,
  getStoryShellState,
  getTypedSearchValue,
} from "./story-state";
import { useStoryPreviewScale } from "./use-story-preview-scale";

const BASE_PREVIEW_CANVAS_WIDTH = 1008;
const MIN_PREVIEW_SCALE = 0.56;

const STORY_ITEMS = getSampleDashboardItems();

const STORY_ACTIVITIES: ActivityEntry[] = [
  {
    id: "a-1",
    message: 'Updated "Dashboard Analytics" (progress: 43% -> 57%)',
    timestamp: "2026-02-10T09:20:00Z",
  },
  {
    id: "a-2",
    message: 'Created "Email Notifications"',
    timestamp: "2026-02-10T09:10:00Z",
  },
  {
    id: "a-3",
    message: 'Completed "Accessibility Audit"',
    timestamp: "2026-02-10T08:54:00Z",
  },
];

export function StickyDashboardStory() {
  const sectionRef = useRef<HTMLElement | null>(null);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const trackHeight = Math.max(1, rect.height - viewportHeight);
      const rawProgress = -rect.top / trackHeight;

      setProgress(clamp(rawProgress, 0, 1));
    };

    const onScrollOrResize = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateProgress();
      });
    };

    updateProgress();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  const { scene, sceneIndex, sceneProgress } = useMemo(() => getSceneState(progress), [progress]);
  const shellState = useMemo(() => getStoryShellState(scene.focusArea), [scene.focusArea]);
  const exportScenePhase = useMemo(
    () => getExportScenePhase(scene.focusArea, sceneProgress),
    [scene.focusArea, sceneProgress]
  );
  const exportToastProgress = useMemo(
    () => getExportToastProgress(scene.focusArea, sceneProgress),
    [scene.focusArea, sceneProgress]
  );
  const exportToastRemainingScale = 1 - exportToastProgress;
  const isSearchScene = scene.focusArea === "search";
  const isExportScene = scene.focusArea === "export";

  const displaySearch = useMemo(() => {
    if (scene.focusArea !== "search") return scene.search;
    return getTypedSearchValue(scene.search, sceneProgress);
  }, [scene.focusArea, scene.search, sceneProgress]);

  const {
    filteredItems: filteredAndSortedItems,
    paginatedItems: tableItems,
    kpis: rawKpis,
    statusDistribution,
    completionTrend,
  } = useMemo(
    () =>
      buildInMemoryDashboardViewModel({
        items: STORY_ITEMS,
        query: {
          filters: {
            search: displaySearch,
            status: BASE_STATUS,
            tag: BASE_TAG,
            showArchived: BASE_SHOW_ARCHIVED,
          },
          sort: {
            field: BASE_SORT_FIELD,
            direction: BASE_SORT_DIRECTION,
          },
          page: 1,
          pageSize: ROWS_PER_PAGE,
        },
      }),
    [displaySearch]
  );

  const { kpiReveal, analyticsReveal } = useMemo(
    () => getRevealFactors(scene.focusArea, sceneProgress),
    [scene.focusArea, sceneProgress]
  );

  const kpis = useMemo(
    () => ({
      total: Math.round(rawKpis.total * kpiReveal),
      active: Math.round(rawKpis.active * kpiReveal),
      completed: Math.round(rawKpis.completed * kpiReveal),
      avgProgress: Math.round(rawKpis.avgProgress * kpiReveal),
      archived: Math.round(rawKpis.archived * kpiReveal),
    }),
    [kpiReveal, rawKpis]
  );

  const animatedStatusDistribution = useMemo(
    () =>
      statusDistribution.map((item) => ({
        ...item,
        count: Math.round(item.count * analyticsReveal),
        percentage: Math.round(item.percentage * analyticsReveal),
      })),
    [analyticsReveal, statusDistribution]
  );

  const animatedCompletionTrend = useMemo(
    () =>
      completionTrend.map((point) => ({
        ...point,
        value: Math.round(point.value * analyticsReveal),
      })),
    [analyticsReveal, completionTrend]
  );
  const {
    previewViewportRef,
    scaledPreviewRef,
    previewScale,
    previewFrameClassName,
    previewFrameStyle,
  } = useStoryPreviewScale({
    baseCanvasWidth: BASE_PREVIEW_CANVAS_WIDTH,
    minScale: MIN_PREVIEW_SCALE,
    fallbackHeightClass: shellState.fallbackPreviewFrameHeightClass,
  });

  const filterControls = (
    <TableFilters
      search={displaySearch}
      onSearchChange={() => {}}
      status={BASE_STATUS}
      onStatusChange={() => {}}
      tag={BASE_TAG}
      onTagChange={() => {}}
      sortField={BASE_SORT_FIELD}
      sortDirection={BASE_SORT_DIRECTION}
      onSortChange={() => {}}
      showArchived={BASE_SHOW_ARCHIVED}
      hasArchivedItems={rawKpis.archived > 0}
      onShowArchivedChange={() => {}}
      highlightSearch={isSearchScene}
      searchWrapperClassName={
        isSearchScene ? "z-20 origin-left scale-[1.1] story-focus-glow" : undefined
      }
      compact
      alignArchivedRight={false}
    />
  );

  const tableActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`btn-secondary btn-sm transition-all duration-300 ${
          isExportScene ? "relative z-20 story-focus-glow" : ""
        } ${isExportScene && exportScenePhase !== "press" ? "scale-[1.08]" : ""} ${
          exportScenePhase === "press" ? "translate-y-px scale-[1.03]" : ""
        }`}
      >
        {exportScenePhase === "press" ? "Exporting..." : "Export CSV"}
      </button>
      <button type="button" className="btn-primary btn-sm">
        + Create Project
      </button>
    </div>
  );

  const paginationControls = (
    <TablePagination
      currentPage={1}
      totalItems={filteredAndSortedItems.length}
      pageSize={ROWS_PER_PAGE}
      onPageChange={() => {}}
    />
  );

  const quickActionsContent = (
    <>
      <button type="button" className="btn-panel btn-panel-active">
        View Dashboard
      </button>
      <button type="button" className="btn-panel">
        Account Settings
      </button>
    </>
  );

  const analyticsContent = (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-sm font-medium text-foreground">Status Distribution</h3>
        <p className="mb-4 text-xs text-muted-foreground">Excludes archived projects</p>
        <StatusDistributionChart data={animatedStatusDistribution} isEmpty={rawKpis.total === 0} />
      </div>
      <div>
        <TrendChart
          data={animatedCompletionTrend}
          title="Completion Trend (incl. archived)"
          isEmpty={completionTrend.length === 0}
        />
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} className={`relative ${STORY_TRACK_HEIGHT_CLASS}`}>
      <PageContainer
        className="sticky grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
        style={{
          top: "var(--site-header-h)",
          height: "calc(100dvh - var(--site-header-h))",
        }}
      >
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Scroll Story
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">{scene.title}</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {scene.description}
          </p>

          <div className="mt-7 space-y-3">
            {STORY_SCENES.map((step, index) => {
              const active = index === sceneIndex;

              return (
                <div key={step.id} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1 h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                      active ? "bg-primary" : "bg-muted-foreground/35"
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${active ? "" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative flex min-h-0 items-center justify-stretch">
          <div
            aria-hidden="true"
            inert={true}
            data-testid="story-preview-decorative"
            className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface-elevated/95 backdrop-blur"
          >
            <div className="relative flex items-center border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
              </div>
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                {PREVIEW_ROUTE_LABEL}
              </span>
            </div>

            <div
              ref={previewViewportRef}
              className={`${previewFrameClassName} relative overflow-hidden transition-[height] duration-500 ease-out`}
              style={previewFrameStyle}
            >
              <div style={{ width: `${BASE_PREVIEW_CANVAS_WIDTH * previewScale}px` }}>
                <div
                  ref={scaledPreviewRef}
                  className="origin-top-left transition-transform duration-700"
                  style={{
                    width: `${BASE_PREVIEW_CANVAS_WIDTH}px`,
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <div className="w-252">
                    <DashboardStoryShell
                      title="Dashboard"
                      subtitle="Welcome back! Here's an overview of your projects."
                      kpis={kpis}
                      filterControls={filterControls}
                      tableActions={tableActions}
                      tableContent={
                        <ItemsTable
                          items={tableItems}
                          emptyMessage="No projects match your filters."
                        />
                      }
                      paginationControls={paginationControls}
                      activities={STORY_ACTIVITIES}
                      quickActionsContent={quickActionsContent}
                      analyticsContent={
                        shellState.showAnalyticsPanel ? analyticsContent : undefined
                      }
                      showOperationalPanels={shellState.showOperationalPanels}
                      animateOperationalPanels
                      focusArea={shellState.focusArea}
                      containerClassName="p-4"
                    />
                  </div>
                </div>
              </div>

              <div
                aria-hidden
                className={`pointer-events-none absolute bottom-4 right-4 z-10 w-80 origin-bottom-right transition-all duration-300 ${
                  exportScenePhase === "toast"
                    ? "translate-y-0 scale-[1.04] opacity-100"
                    : "translate-y-2 scale-100 opacity-0"
                }`}
              >
                <div className="surface-card-elevated story-focus-glow-soft relative overflow-hidden border border-info-border/70 bg-surface-elevated/95 px-4 pb-4 pt-3 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">CSV downloaded</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        projects-export.csv ({filteredAndSortedItems.length} rows)
                      </p>
                    </div>
                    <span className="row-action text-sm leading-none text-muted-foreground">×</span>
                  </div>

                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg bg-muted">
                    <div
                      className="h-full bg-muted-foreground/50"
                      style={{
                        transform: `scaleX(${exportToastRemainingScale})`,
                        transformOrigin: "left",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
