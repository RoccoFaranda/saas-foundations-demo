import { requireVerifiedUser } from "@/src/lib/auth/session";
import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";
import ChangePasswordClient from "./change-password-client";

export const metadata = buildPrivatePageMetadata({
  title: "Change Password",
  description: "Update your account password.",
});

export default async function ChangePasswordPage() {
  await requireVerifiedUser();

  return <ChangePasswordClient />;
}
