interface CookieMarkProps {
  className?: string;
}

export function CookieMark({ className }: CookieMarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M12 3a9 9 0 1 0 9 9c-2.2 0-4-1.8-4-4 0-.8.2-1.5.6-2.1A9 9 0 0 0 12 3Z" />
      <circle cx="9.25" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.75" cy="12.25" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9.75" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
