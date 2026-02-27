import Link from "next/link";
import { GitHubMark } from "@/src/components/icons/github-mark";
import { GITHUB_REPO_URL } from "@/src/content/profile/public-metadata";

type UtilityLinkVariant = "inline" | "panel" | "menu";

interface UtilityLinkProps {
  variant?: UtilityLinkVariant;
}

export function HeaderContactLink({ variant = "inline" }: UtilityLinkProps) {
  const className =
    variant === "panel"
      ? "btn-panel"
      : variant === "menu"
        ? "focus-ring block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        : "link-subtle focus-ring";

  return (
    <Link href="/contact" className={className}>
      Contact
    </Link>
  );
}

export function HeaderGitHubLink({ variant = "inline" }: UtilityLinkProps) {
  const className =
    variant === "panel"
      ? "btn-panel inline-flex items-center gap-2"
      : variant === "menu"
        ? "focus-ring inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        : "link-subtle focus-ring inline-flex items-center gap-1";
  const iconClass = variant === "panel" || variant === "menu" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer noopener" className={className}>
      <GitHubMark className={iconClass} />
      GitHub
    </a>
  );
}
