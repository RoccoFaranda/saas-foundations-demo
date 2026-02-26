"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DETAILS_CLASS = "group relative";
const DEFAULT_SUMMARY_CLASS = "btn-secondary btn-sm list-none [&::-webkit-details-marker]:hidden";
const DEFAULT_PANEL_CLASS =
  "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-elevated p-3 shadow-lg";

interface HeaderMenuProps {
  label: ReactNode;
  children: ReactNode;
  detailsClassName?: string;
  summaryClassName?: string;
  panelClassName?: string;
}

interface HeaderMenuSectionProps {
  children: ReactNode;
  className?: string;
}

interface HeaderMenuDividerProps {
  className?: string;
}

export function HeaderMenu({
  label,
  children,
  detailsClassName = DEFAULT_DETAILS_CLASS,
  summaryClassName = DEFAULT_SUMMARY_CLASS,
  panelClassName = DEFAULT_PANEL_CLASS,
}: HeaderMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => {
    if (!detailsRef.current) return;
    detailsRef.current.open = false;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!detailsRef.current) return;
      if (!detailsRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  const handleToggle = () => {
    setIsOpen(Boolean(detailsRef.current?.open));
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const interactive = target.closest("a,button,[data-menu-close]");
    if (!interactive) return;
    if (interactive.hasAttribute("data-menu-keep-open")) return;

    closeMenu();
  };

  const handleChangeCapture = (event: React.FormEvent<HTMLElement>) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    if (target.hasAttribute("data-menu-keep-open")) return;

    closeMenu();
  };

  return (
    <details ref={detailsRef} className={detailsClassName} onToggle={handleToggle}>
      <summary className={summaryClassName}>{label}</summary>
      <div
        className={panelClassName}
        onClickCapture={handleClickCapture}
        onChangeCapture={handleChangeCapture}
      >
        {children}
      </div>
    </details>
  );
}

export function HeaderMenuSection({ children, className = "" }: HeaderMenuSectionProps) {
  return <div className={`grid gap-1 ${className}`.trim()}>{children}</div>;
}

export function HeaderMenuDivider({ className = "" }: HeaderMenuDividerProps) {
  return <div className={`my-2 border-t border-border ${className}`.trim()} />;
}
