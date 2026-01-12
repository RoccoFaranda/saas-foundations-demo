import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-foreground/10 bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          SaaS Foundations
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/demo"
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            Demo
          </Link>
          <Link
            href="/login"
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}


