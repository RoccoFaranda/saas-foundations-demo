import { getCurrentUser } from "@/src/lib/auth";
import { getTurnstilePolicy } from "@/src/lib/auth/turnstile";
import { redirect } from "next/navigation";
import SignupClient from "./signup-client";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user?.emailVerified) {
    redirect("/app/dashboard");
  }

  if (user) {
    redirect("/verify-email");
  }

  const turnstilePolicy = getTurnstilePolicy();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const turnstileSiteKey = turnstilePolicy.widgetEnabled && siteKey ? siteKey : null;
  const turnstileMisconfiguredMessage =
    turnstilePolicy.required && !turnstilePolicy.configured
      ? "Sign up is temporarily unavailable. Please contact support."
      : null;

  return (
    <SignupClient
      turnstileSiteKey={turnstileSiteKey}
      turnstileMisconfiguredMessage={turnstileMisconfiguredMessage}
    />
  );
}
