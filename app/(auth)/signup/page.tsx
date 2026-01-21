import { auth } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import SignupClient from "./signup-client";

export default async function SignupPage() {
  const session = await auth();

  if (session?.user?.emailVerified) {
    redirect("/app/dashboard");
  }

  if (session) {
    redirect("/verify-email");
  }

  return <SignupClient />;
}
