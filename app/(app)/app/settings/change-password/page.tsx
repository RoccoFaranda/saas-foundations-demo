import { requireVerifiedUser } from "@/src/lib/auth/session";
import ChangePasswordClient from "./change-password-client";

export default async function ChangePasswordPage() {
  await requireVerifiedUser();

  return <ChangePasswordClient />;
}
