import "server-only";

export type HealthStatus = "ok" | "degraded";
export type HealthCheckStatus = "ok" | "error";

export interface HealthCheckResult {
  status: HealthCheckStatus;
  latencyMs?: number;
  message?: string;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: HealthCheckResult;
    appUrl: HealthCheckResult;
  };
}

interface HealthReportOptions {
  checkDatabase?: () => Promise<HealthCheckResult>;
  checkAppUrl?: () => HealthCheckResult;
  now?: () => Date;
}

async function runDatabaseProbe(): Promise<void> {
  const { default: prisma } = await import("./db");
  await prisma.$queryRaw`SELECT 1`;
}

export async function checkDatabaseHealth(
  runProbe: () => Promise<void> = runDatabaseProbe
): Promise<HealthCheckResult> {
  const startedAt = Date.now();

  try {
    await runProbe();
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      message: "Database check failed.",
    };
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function checkAppUrlHealth(): HealthCheckResult {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!rawUrl) {
    if (isProduction) {
      return {
        status: "error",
        message: "NEXT_PUBLIC_APP_URL is missing in production.",
      };
    }

    return { status: "ok" };
  }

  if (!isAbsoluteHttpUrl(rawUrl)) {
    return {
      status: "error",
      message: "NEXT_PUBLIC_APP_URL must be an absolute http(s) URL.",
    };
  }

  return { status: "ok" };
}

function isHealthyReport(checks: HealthReport["checks"]): boolean {
  return checks.database.status === "ok" && checks.appUrl.status === "ok";
}

export async function getHealthReport(options: HealthReportOptions = {}): Promise<HealthReport> {
  const checkDatabase = options.checkDatabase ?? (() => checkDatabaseHealth());
  const checkAppUrl = options.checkAppUrl ?? checkAppUrlHealth;
  const now = options.now ?? (() => new Date());

  const [database, appUrl] = await Promise.all([checkDatabase(), Promise.resolve(checkAppUrl())]);

  const checks = { database, appUrl };

  return {
    status: isHealthyReport(checks) ? "ok" : "degraded",
    timestamp: now().toISOString(),
    checks,
  };
}
