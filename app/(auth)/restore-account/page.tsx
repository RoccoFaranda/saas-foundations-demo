import Link from "next/link";
import { redirect } from "next/navigation";
import { restoreAccount } from "@/src/lib/auth/actions";

type RestoreAccountPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function RestoreAccountPage({ searchParams }: RestoreAccountPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Restore link invalid</h1>
            <p className="mt-2 text-sm text-muted-foreground">Invalid or missing restore token.</p>
          </div>
          <Link href="/login" className="btn-primary btn-md inline-flex">
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  const result = await restoreAccount(token);
  if (result.success) {
    redirect(result.redirectUrl ?? "/login?restored=success");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Restore failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        </div>
        <Link href="/login" className="btn-primary btn-md inline-flex">
          Back to login
        </Link>
      </div>
    </main>
  );
}
