import { requireVerifiedUser } from "@/src/lib/auth/session";
import { getAccountDeletionGraceDays } from "@/src/lib/auth/account-deletion";
import DeleteAccountClient from "./delete-account-client";

export default async function DeleteAccountPage() {
  await requireVerifiedUser();
  const graceDays = getAccountDeletionGraceDays();

  return <DeleteAccountClient graceDays={graceDays} />;
}
