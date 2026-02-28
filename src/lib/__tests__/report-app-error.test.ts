// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportAppError, setAppErrorTransportForTests } from "../observability/report-app-error";

describe("reportAppError", () => {
  const restoreEnv = () => {
    vi.unstubAllEnvs();
  };

  afterEach(() => {
    setAppErrorTransportForTests(null);
    restoreEnv();
  });

  it("reports boundary details with digest to the active transport", () => {
    const transport = vi.fn();
    setAppErrorTransportForTests(transport);
    vi.stubEnv("NODE_ENV", "development");

    const error = Object.assign(new Error("forced runtime failure"), {
      digest: "abc123",
    });

    reportAppError({
      boundary: "segment",
      error,
      metadata: { route: "/dev/force-error", mode: "runtime" },
    });

    expect(transport).toHaveBeenCalledTimes(1);
    const report = transport.mock.calls[0][0];
    expect(report.event).toBe("app_error_boundary_triggered");
    expect(report.boundary).toBe("segment");
    expect(report.digest).toBe("abc123");
    expect(report.errorName).toBe("Error");
    expect(report.errorMessage).toBe("forced runtime failure");
    expect(report.metadata).toMatchObject({ route: "/dev/force-error", mode: "runtime" });
    expect(report.stack).toContain("Error: forced runtime failure");
  });

  it("redacts error message and stack in production", () => {
    const transport = vi.fn();
    setAppErrorTransportForTests(transport);
    vi.stubEnv("NODE_ENV", "production");

    const error = new Error("contains internal details");
    reportAppError({
      boundary: "global",
      error,
    });

    expect(transport).toHaveBeenCalledTimes(1);
    const report = transport.mock.calls[0][0];
    expect(report.errorMessage).toBe("redacted");
    expect(report.stack).toBeNull();
  });
});
