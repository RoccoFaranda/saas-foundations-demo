interface GitHubMarkProps {
  className?: string;
}

export function GitHubMark({ className }: GitHubMarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={className}
      style={{ fill: "currentColor" }}
      focusable="false"
    >
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.39l-.01-1.39c-2.24.48-2.71-.95-2.71-.95a2.13 2.13 0 0 0-.89-1.18c-.72-.49.06-.48.06-.48a1.69 1.69 0 0 1 1.23.83 1.72 1.72 0 0 0 2.35.67 1.73 1.73 0 0 1 .52-1.08c-1.79-.2-3.67-.9-3.67-3.98A3.11 3.11 0 0 1 3.74 5a2.9 2.9 0 0 1 .08-2.06s.67-.21 2.2.82a7.58 7.58 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82a2.9 2.9 0 0 1 .08 2.06 3.1 3.1 0 0 1 .83 2.15c0 3.09-1.89 3.78-3.69 3.98a1.94 1.94 0 0 1 .55 1.5l-.01 2.22c0 .22.14.47.55.39A8 8 0 0 0 8 0Z" />
    </svg>
  );
}
