import { requireVerifiedUser } from "@/src/lib/auth/session";
import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";
import ChangeEmailClient from "./change-email-client";

export const metadata = buildPrivatePageMetadata({
  title: "Change Email",
  description: "Update your account email address and confirm the new address via verification.",
});

export default async function ChangeEmailPage() {
  const user = await requireVerifiedUser();

  return <ChangeEmailClient currentEmail={user.email} />;
}
