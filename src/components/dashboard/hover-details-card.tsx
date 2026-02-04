"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface HoverDetailsCardProps {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  widthClassName?: string;
}

export function HoverDetailsCard({
  label,
  trigger,
  children,
  align = "left",
  widthClassName = "w-72",
}: HoverDetailsCardProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();
    const margin = 8;
    const preferTop = window.innerHeight - rect.bottom < 260;

    setPosition({
      top: preferTop ? rect.top - margin : rect.bottom + margin,
      left: align === "right" ? rect.right : rect.left,
      placement: preferTop ? "top" : "bottom",
    });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  const card =
    isOpen && position && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className={`${widthClassName} pointer-events-none fixed z-[60] rounded-md border border-foreground/15 bg-background p-3 shadow-lg`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: `translate(${align === "right" ? "-100%" : "0"}, ${position.placement === "top" ? "-100%" : "0"})`,
            }}
          >
            {children}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="inline-flex">
      <button
        type="button"
        ref={triggerRef}
        aria-label={label}
        className="rounded px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        onMouseEnter={() => {
          updatePosition();
          setIsOpen(true);
        }}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => {
          updatePosition();
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onClick={() => {
          updatePosition();
          setIsOpen((prev) => !prev);
        }}
      >
        {trigger}
      </button>
      {card}
    </div>
  );
}
