import "server-only";

const DEFAULT_ACCOUNT_DELETION_GRACE_DAYS = 14;
const DEFAULT_ACCOUNT_DELETION_PURGE_BATCH_SIZE = 100;

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getAccountDeletionGraceDays(): number {
  const parsed = parsePositiveInteger(process.env.ACCOUNT_DELETION_GRACE_DAYS);
  return parsed ?? DEFAULT_ACCOUNT_DELETION_GRACE_DAYS;
}

export function getAccountDeletionScheduledFor(now: Date = new Date()): Date {
  const graceDays = getAccountDeletionGraceDays();
  return new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

export function getAccountDeletionPurgeBatchSize(): number {
  const parsed = parsePositiveInteger(process.env.ACCOUNT_DELETION_PURGE_BATCH_SIZE);
  return parsed ?? DEFAULT_ACCOUNT_DELETION_PURGE_BATCH_SIZE;
}

export function getAccountDeletionCronSecret(): string | null {
  const secret = process.env.ACCOUNT_DELETION_CRON_SECRET?.trim();
  return secret ? secret : null;
}
