import { requireVerifiedUser } from "@/src/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireVerifiedUser();
  return <>{children}</>;
}
