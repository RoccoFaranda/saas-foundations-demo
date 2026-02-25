import Link from "next/link";
import { CookiePreferencesTrigger } from "@/src/components/consent/cookie-preferences-trigger";

type LegalInlineLinksVariant = "compact" | "footer";

interface LegalInlineLinksProps {
  variant?: LegalInlineLinksVariant;
}

export function LegalInlineLinks({ variant = "compact" }: LegalInlineLinksProps) {
  const textClass =
    variant === "footer"
      ? "text-sm text-muted-foreground"
      : "text-xs leading-5 text-muted-foreground";
  const linkClass = variant === "footer" ? "link-subtle focus-ring" : "btn-link focus-ring text-xs";
  const buttonClass =
    variant === "footer"
      ? "link-subtle cursor-pointer focus-ring"
      : "btn-link focus-ring text-xs cursor-pointer";
  const wrapperClass =
    variant === "footer"
      ? "inline-flex items-center gap-2"
      : "flex items-center justify-center gap-2 text-center";

  return (
    <div className={`${wrapperClass} ${textClass}`}>
      <Link href="/privacy" className={linkClass}>
        Privacy
      </Link>
      <span aria-hidden="true">&bull;</span>
      <Link href="/terms" className={linkClass}>
        Terms
      </Link>
      <span aria-hidden="true">&bull;</span>
      <CookiePreferencesTrigger className={buttonClass} />
    </div>
  );
}
