import type { ItemStatus, ItemTag, SortDirection, SortField } from "@/src/components/dashboard";

export type StoryFocusArea = "kpis" | "analytics" | "search" | "export" | "insights";
export type StorySceneFocus = "kpis" | "search" | "export";
export type ExportScenePhase = "idle" | "press" | "toast";

export interface StoryScene {
  id: "clarity" | "focus" | "export-ready";
  title: string;
  description: string;
  focusArea: StorySceneFocus;
  search: string;
}

export interface StorySceneState {
  scene: StoryScene;
  sceneIndex: number;
  sceneProgress: number;
}

export interface StoryShellState {
  focusArea: StoryFocusArea;
  showOperationalPanels: boolean;
  showAnalyticsPanel: boolean;
  fallbackPreviewFrameHeightClass: string;
}

export const STORY_TRACK_HEIGHT_CLASS = "h-[520dvh]";
export const PREVIEW_ROUTE_LABEL = "/demo · /app/dashboard";
export const SEARCH_REVEAL_PORTION = 0.8;
export const EXPORT_PRESS_START = 0.18;
export const EXPORT_TOAST_START = 0.5;

export const BASE_STATUS: ItemStatus | "all" = "all";
export const BASE_TAG: ItemTag | "all" = "all";
export const BASE_SORT_FIELD: SortField = "updatedAt";
export const BASE_SORT_DIRECTION: SortDirection = "desc";
export const BASE_SHOW_ARCHIVED = false;
export const ROWS_PER_PAGE = 5;

export const STORY_SCENES: StoryScene[] = [
  {
    id: "clarity",
    title: "Instant clarity",
    description: "KPIs and analytics surface workload and trend context immediately.",
    focusArea: "kpis",
    search: "",
  },
  {
    id: "focus",
    title: "Find work quickly",
    description: "Search and filters narrow the table to exactly what matters.",
    focusArea: "search",
    search: "das",
  },
  {
    id: "export-ready",
    title: "Export ready",
    description: "Download current table state directly from dashboard controls.",
    focusArea: "export",
    search: "",
  },
];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value: number): number {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function getSceneState(
  progress: number,
  scenes: StoryScene[] = STORY_SCENES
): StorySceneState {
  const segmentSize = 1 / scenes.length;
  const rawIndex = Math.floor(progress / segmentSize);
  const sceneIndex = clamp(rawIndex, 0, scenes.length - 1);
  const sceneStart = sceneIndex * segmentSize;
  const sceneProgress = easeInOutCubic(clamp((progress - sceneStart) / segmentSize, 0, 1));

  return {
    scene: scenes[sceneIndex],
    sceneIndex,
    sceneProgress,
  };
}

export function getTypedSearchValue(
  target: string,
  sceneProgress: number,
  revealPortion = SEARCH_REVEAL_PORTION
): string {
  if (!target) return "";

  const revealProgress = clamp(sceneProgress / revealPortion, 0, 1);
  const revealCount = Math.max(1, Math.ceil(revealProgress * target.length));
  return target.slice(0, revealCount);
}

export function getStoryShellState(sceneFocusArea: StorySceneFocus): StoryShellState {
  const isInsightsScene = sceneFocusArea === "kpis";

  return {
    focusArea: isInsightsScene ? "insights" : sceneFocusArea,
    showOperationalPanels: !isInsightsScene,
    showAnalyticsPanel: isInsightsScene,
    fallbackPreviewFrameHeightClass: isInsightsScene
      ? "h-[clamp(30rem,58dvh,40rem)]"
      : "h-[clamp(34rem,74dvh,48rem)]",
  };
}

export function getRevealFactors(sceneFocusArea: StorySceneFocus, sceneProgress: number) {
  const isInsightsScene = sceneFocusArea === "kpis";

  return {
    kpiReveal: isInsightsScene ? clamp(sceneProgress / 0.55, 0, 1) : 1,
    analyticsReveal: isInsightsScene ? clamp((sceneProgress - 0.2) / 0.7, 0, 1) : 1,
  };
}

export function getExportScenePhase(
  sceneFocusArea: StorySceneFocus,
  sceneProgress: number
): ExportScenePhase {
  if (sceneFocusArea !== "export") {
    return "idle";
  }

  if (sceneProgress < EXPORT_PRESS_START) {
    return "idle";
  }

  if (sceneProgress < EXPORT_TOAST_START) {
    return "press";
  }

  return "toast";
}

export function getExportToastProgress(
  sceneFocusArea: StorySceneFocus,
  sceneProgress: number,
  toastStart = EXPORT_TOAST_START
): number {
  if (sceneFocusArea !== "export" || sceneProgress < toastStart) {
    return 0;
  }

  const duration = Math.max(0.001, 1 - toastStart);
  return clamp((sceneProgress - toastStart) / duration, 0, 1);
}
