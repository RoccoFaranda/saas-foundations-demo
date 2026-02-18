import { describe, expect, it } from "vitest";
import { buildProjectsCsv, type ProjectCsvRow } from "../csv";

function createRow(overrides: Partial<ProjectCsvRow> = {}): ProjectCsvRow {
  return {
    id: "project-1",
    name: "Roadmap",
    status: "active",
    tag: "feature",
    summary: "Initial scope",
    checklistDone: 1,
    checklistTotal: 2,
    progress: 50,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe("csv export", () => {
  it("neutralizes spreadsheet-formula prefixes in string cells", () => {
    const csv = buildProjectsCsv([
      createRow({
        id: " =2+2",
        name: "=2+2",
        status: "+SUM(A1:A2)",
        tag: "-danger",
        summary: "@malicious",
      }),
    ]);

    const dataRow = csv.split("\n")[1] ?? "";
    const cells = dataRow.split(",");

    expect(cells[0]).toBe("' =2+2");
    expect(cells[1]).toBe("'=2+2");
    expect(cells[2]).toBe("'+SUM(A1:A2)");
    expect(cells[3]).toBe("'-danger");
    expect(cells[4]).toBe("'@malicious");
  });

  it("neutralizes leading control characters in string cells", () => {
    const csv = buildProjectsCsv([
      createRow({
        summary: "\tstarts-with-tab",
      }),
    ]);

    const dataRow = csv.split("\n")[1] ?? "";
    const cells = dataRow.split(",");

    expect(cells[4]).toBe("'\tstarts-with-tab");
  });

  it("keeps numeric fields as numeric text", () => {
    const csv = buildProjectsCsv([
      createRow({
        checklistDone: -1,
        checklistTotal: -2,
        progress: -50,
      }),
    ]);

    const dataRow = csv.split("\n")[1] ?? "";
    const cells = dataRow.split(",");

    expect(cells[5]).toBe("-1");
    expect(cells[6]).toBe("-2");
    expect(cells[7]).toBe("-50");
  });

  it("quotes and neutralizes formula strings containing commas", () => {
    const csv = buildProjectsCsv([
      createRow({
        name: "=SUM(1,1)",
      }),
    ]);

    expect(csv).toContain('"\'=SUM(1,1)"');
  });
});
