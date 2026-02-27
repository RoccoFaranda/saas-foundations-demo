import type { Metadata } from "next";
import { NO_INDEX_ROBOTS } from "@/src/lib/seo/metadata";

export const metadata: Metadata = {
  robots: NO_INDEX_ROBOTS,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
