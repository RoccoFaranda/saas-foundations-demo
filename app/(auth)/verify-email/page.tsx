import { auth } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import VerifyEmailClient from "./verify-email-client";

type VerifyEmailPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const isVerified = Boolean(session?.user?.emailVerified);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;

  if (!session && !token) {
    redirect("/login?callbackUrl=/verify-email");
  }

  if (isVerified) {
    redirect("/app/dashboard");
  }

  return <VerifyEmailClient token={token} email={email} />;
}
