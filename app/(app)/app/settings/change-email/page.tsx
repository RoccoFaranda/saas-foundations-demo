import { requireVerifiedUser } from "@/src/lib/auth/session";
import ChangeEmailClient from "./change-email-client";

export default async function ChangeEmailPage() {
  const user = await requireVerifiedUser();

  return <ChangeEmailClient currentEmail={user.email} />;
}
