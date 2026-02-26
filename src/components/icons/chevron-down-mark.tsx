interface ChevronDownMarkProps {
  className?: string;
}

export function ChevronDownMark({ className }: ChevronDownMarkProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
