import { requireVerifiedUser } from "@/src/lib/auth/session";
import { getAccountDeletionGraceDays } from "@/src/lib/auth/account-deletion";
import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";
import DeleteAccountClient from "./delete-account-client";

export const metadata = buildPrivatePageMetadata({
  title: "Delete Account",
  description: "Schedule account deletion and review restore-window details.",
});

export default async function DeleteAccountPage() {
  await requireVerifiedUser();
  const graceDays = getAccountDeletionGraceDays();

  return <DeleteAccountClient graceDays={graceDays} />;
}
