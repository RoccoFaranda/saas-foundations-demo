import Link from "next/link";
import { GitHubMark } from "@/src/components/icons/github-mark";

const REPO_HREF = "https://github.com/RoccoFaranda/saas-foundations-demo";

type UtilityLinkVariant = "inline" | "panel";

interface UtilityLinkProps {
  variant?: UtilityLinkVariant;
}

export function HeaderContactLink({ variant = "inline" }: UtilityLinkProps) {
  const className = variant === "panel" ? "btn-panel" : "link-subtle focus-ring";

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
      : "link-subtle focus-ring inline-flex items-center gap-1";
  const iconClass = variant === "panel" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <a href={REPO_HREF} target="_blank" rel="noreferrer noopener" className={className}>
      <GitHubMark className={iconClass} />
      GitHub
    </a>
  );
}
