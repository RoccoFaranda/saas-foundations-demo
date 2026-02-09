export interface ProjectCsvRow {
  id: string;
  name: string;
  status: string;
  tag?: string | null;
  summary?: string | null;
  checklistDone: number;
  checklistTotal: number;
  progress: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  completedAt?: string | Date | null;
  archivedAt?: string | Date | null;
}

const csvHeaders = [
  "Project ID",
  "Name",
  "Status",
  "Tag",
  "Summary",
  "Checklist Done",
  "Checklist Total",
  "Progress %",
  "Created At",
  "Updated At",
  "Completed At",
  "Archived At",
];

export function computeChecklistProgress(checklist: Array<{ done: boolean }>): number {
  if (checklist.length === 0) return 0;
  const doneCount = checklist.filter((item) => item.done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

export function buildProjectsCsv(rows: ProjectCsvRow[]): string {
  const headerRow = csvHeaders.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    [
      row.id,
      row.name,
      row.status,
      row.tag ?? "",
      row.summary ?? "",
      row.checklistDone,
      row.checklistTotal,
      row.progress,
      formatCsvDate(row.createdAt),
      formatCsvDate(row.updatedAt),
      formatCsvDate(row.completedAt),
      formatCsvDate(row.archivedAt),
    ]
      .map(escapeCsvValue)
      .join(",")
  );

  return `\uFEFF${[headerRow, ...dataRows].join("\n")}`;
}

function formatCsvDate(value?: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toISOString();
}

function escapeCsvValue(value: string | number | null | undefined): string {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}
