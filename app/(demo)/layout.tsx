import { SiteHeader } from "@/src/components/site-header";
import { SiteFooter } from "@/src/components/site-footer";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
