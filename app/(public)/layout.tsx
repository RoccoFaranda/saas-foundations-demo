import { SiteHeader } from "@/src/components/site-header";
import { SiteFooter } from "@/src/components/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col [--site-header-h:3.5rem]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
