import { getCurrentUser } from "@/src/lib/auth";
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

  return <SignupClient />;
}
