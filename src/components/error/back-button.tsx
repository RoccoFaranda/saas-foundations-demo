"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
  fallbackHref?: string;
  label?: string;
}

export function BackButton({
  className = "btn-outline btn-md",
  fallbackHref = "/",
  label = "Go Back",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      className={className}
    >
      {label}
    </button>
  );
}
