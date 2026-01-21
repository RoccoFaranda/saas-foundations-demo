import { auth } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./login-client";

type LoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user?.emailVerified) {
    redirect("/app/dashboard");
  }

  if (session) {
    redirect("/verify-email");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const callbackParam = resolvedSearchParams?.callbackUrl;
  const callbackUrl = typeof callbackParam === "string" ? callbackParam : "";

  return <LoginClient callbackUrl={callbackUrl} />;
}
