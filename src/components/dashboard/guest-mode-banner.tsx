export function GuestModeBanner() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Guest mode: changes reset on refresh</span>
    </div>
  );
}
