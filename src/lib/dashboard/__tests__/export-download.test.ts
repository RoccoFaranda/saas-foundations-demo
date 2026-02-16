import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { downloadBlobFile, resolveFilenameFromContentDisposition } from "../export-download";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("export-download", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mock-download"),
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
  });

  it("parses quoted filename from content disposition", () => {
    const filename = resolveFilenameFromContentDisposition(
      'attachment; filename="projects-2026.csv"',
      "fallback.csv"
    );

    expect(filename).toBe("projects-2026.csv");
  });

  it("parses utf-8 encoded filename from content disposition", () => {
    const filename = resolveFilenameFromContentDisposition(
      "attachment; filename*=UTF-8''projects%20export.csv",
      "fallback.csv"
    );

    expect(filename).toBe("projects export.csv");
  });

  it("falls back when content disposition does not include filename", () => {
    const filename = resolveFilenameFromContentDisposition("attachment", "fallback.csv");
    expect(filename).toBe("fallback.csv");
  });

  it("creates, clicks, and revokes object url for downloads", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const blob = new Blob(["demo"], { type: "text/csv;charset=utf-8" });

    downloadBlobFile(blob, "demo-export.csv");

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-download");
  });
});
