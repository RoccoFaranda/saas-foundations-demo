import { getCurrentUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./login-client";

type LoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user?.emailVerified) {
    redirect("/app/dashboard");
  }

  if (user) {
    redirect("/verify-email");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const callbackParam = resolvedSearchParams?.callbackUrl;
  const callbackUrl = typeof callbackParam === "string" ? callbackParam : "";
  const resetParam = resolvedSearchParams?.reset;
  const resetSuccess = resetParam === "success";

  return <LoginClient callbackUrl={callbackUrl} resetSuccess={resetSuccess} />;
}
