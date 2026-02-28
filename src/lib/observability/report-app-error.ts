type ErrorBoundaryKind = "segment" | "global";

type AppErrorMetadata = Record<string, string | number | boolean | null | undefined>;

export interface AppErrorReport {
  event: "app_error_boundary_triggered";
  boundary: ErrorBoundaryKind;
  digest: string | null;
  errorName: string;
  errorMessage: string;
  stack: string | null;
  occurredAt: string;
  metadata?: AppErrorMetadata;
}

type AppErrorTransport = (report: AppErrorReport) => void | Promise<void>;

const DEFAULT_TRANSPORT: AppErrorTransport = (report) => {
  console.error("[APP ERROR]", report);
};

let activeTransport: AppErrorTransport = DEFAULT_TRANSPORT;

function getSafeErrorMessage(error: Error): string {
  if (process.env.NODE_ENV === "production") {
    return "redacted";
  }

  return error.message || "Unknown error";
}

function getSafeStack(error: Error): string | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return error.stack ?? null;
}

function getDigest(error: Error & { digest?: string }): string | null {
  if (typeof error.digest !== "string") {
    return null;
  }

  const digest = error.digest.trim();
  return digest.length > 0 ? digest : null;
}

export function reportAppError({
  boundary,
  error,
  metadata,
}: {
  boundary: ErrorBoundaryKind;
  error: Error & { digest?: string };
  metadata?: AppErrorMetadata;
}): void {
  const report: AppErrorReport = {
    event: "app_error_boundary_triggered",
    boundary,
    digest: getDigest(error),
    errorName: error.name || "Error",
    errorMessage: getSafeErrorMessage(error),
    stack: getSafeStack(error),
    occurredAt: new Date().toISOString(),
    metadata,
  };

  try {
    const sendResult = activeTransport(report);
    void Promise.resolve(sendResult).catch((transportError: unknown) => {
      console.error("[APP ERROR] Failed to send error report", transportError);
    });
  } catch (transportError) {
    console.error("[APP ERROR] Failed to send error report", transportError);
  }
}

export function setAppErrorTransportForTests(transport: AppErrorTransport | null): void {
  activeTransport = transport ?? DEFAULT_TRANSPORT;
}
