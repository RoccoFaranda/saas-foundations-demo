export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/10 bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-center px-4 text-sm text-foreground/60">
        <p>&copy; {new Date().getFullYear()} SaaS Foundations Demo</p>
      </div>
    </footer>
  );
}


