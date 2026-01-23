import { getCurrentUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import VerifyEmailClient from "./verify-email-client";

type VerifyEmailPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const user = await getCurrentUser();
  const email = user?.email ?? null;
  const isVerified = Boolean(user?.emailVerified);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;

  if (!user && !token) {
    redirect("/login?callbackUrl=/verify-email");
  }

  if (isVerified && !token) {
    redirect("/app/dashboard");
  }

  return <VerifyEmailClient token={token} email={email} />;
}
