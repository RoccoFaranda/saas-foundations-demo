import { describe, expect, it } from "vitest";
import {
  EXPORT_PRESS_START,
  EXPORT_TOAST_START,
  STORY_SCENES,
  getExportScenePhase,
  getExportToastProgress,
  getRevealFactors,
  getSceneState,
  getStoryShellState,
  getTypedSearchValue,
} from "./story-state";

describe("story-state", () => {
  describe("getSceneState", () => {
    it("returns first scene at start", () => {
      const state = getSceneState(0);
      expect(state.scene.id).toBe(STORY_SCENES[0].id);
      expect(state.sceneIndex).toBe(0);
      expect(state.sceneProgress).toBe(0);
    });

    it("returns middle scene in middle third", () => {
      const state = getSceneState(0.5);
      expect(state.scene.id).toBe("focus");
      expect(state.sceneIndex).toBe(1);
      expect(state.sceneProgress).toBeGreaterThan(0);
      expect(state.sceneProgress).toBeLessThan(1);
    });

    it("clamps to last scene at end", () => {
      const state = getSceneState(1);
      expect(state.scene.id).toBe(STORY_SCENES[2].id);
      expect(state.sceneIndex).toBe(2);
      expect(state.sceneProgress).toBe(1);
    });
  });

  describe("getTypedSearchValue", () => {
    it("reveals at least one character for non-empty target", () => {
      expect(getTypedSearchValue("das", 0)).toBe("d");
    });

    it("reveals full target at complete progress", () => {
      expect(getTypedSearchValue("das", 1)).toBe("das");
    });

    it("returns empty for empty target", () => {
      expect(getTypedSearchValue("", 0.5)).toBe("");
    });
  });

  describe("getStoryShellState", () => {
    it("maps kpis scene to insights shell mode", () => {
      const shellState = getStoryShellState("kpis");
      expect(shellState.focusArea).toBe("insights");
      expect(shellState.showOperationalPanels).toBe(false);
      expect(shellState.showAnalyticsPanel).toBe(true);
    });

    it("keeps operational panels for search scene", () => {
      const shellState = getStoryShellState("search");
      expect(shellState.focusArea).toBe("search");
      expect(shellState.showOperationalPanels).toBe(true);
      expect(shellState.showAnalyticsPanel).toBe(false);
    });
  });

  describe("getRevealFactors", () => {
    it("returns full reveal outside kpis scene", () => {
      expect(getRevealFactors("search", 0.4)).toEqual({
        kpiReveal: 1,
        analyticsReveal: 1,
      });
    });

    it("clamps reveal values in kpis scene", () => {
      const factors = getRevealFactors("kpis", 0);
      expect(factors.kpiReveal).toBe(0);
      expect(factors.analyticsReveal).toBe(0);
    });
  });

  describe("getExportScenePhase", () => {
    it("returns idle outside export scene", () => {
      expect(getExportScenePhase("search", 0.7)).toBe("idle");
    });

    it("returns idle before press threshold", () => {
      expect(getExportScenePhase("export", EXPORT_PRESS_START - 0.01)).toBe("idle");
    });

    it("returns press in middle range", () => {
      expect(getExportScenePhase("export", (EXPORT_PRESS_START + EXPORT_TOAST_START) / 2)).toBe(
        "press"
      );
    });

    it("returns toast after toast threshold", () => {
      expect(getExportScenePhase("export", EXPORT_TOAST_START)).toBe("toast");
    });
  });

  describe("getExportToastProgress", () => {
    it("returns 0 before toast phase", () => {
      expect(getExportToastProgress("export", EXPORT_TOAST_START - 0.01)).toBe(0);
    });

    it("returns 0 outside export scene", () => {
      expect(getExportToastProgress("search", 0.9)).toBe(0);
    });

    it("returns 1 at the end of export scene", () => {
      expect(getExportToastProgress("export", 1)).toBe(1);
    });
  });
});
