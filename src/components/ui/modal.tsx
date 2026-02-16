"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabelledBy: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  isDismissible?: boolean;
  backdropTestId?: string;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function Modal({
  isOpen,
  onClose,
  children,
  ariaLabelledBy,
  initialFocusRef,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  isDismissible = true,
  backdropTestId,
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const mouseDownOnBackdrop = useRef(false);

  // Focus management + scroll lock + inert background
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const bodyChildren = Array.from(document.body.children) as HTMLElement[];
    const siblings = bodyChildren.filter((child) => child !== backdropRef.current);
    const previousAriaHidden = new Map<HTMLElement, string | null>();
    const previousInert = new Map<HTMLElement, string | null>();

    for (const sibling of siblings) {
      previousAriaHidden.set(sibling, sibling.getAttribute("aria-hidden"));
      previousInert.set(sibling, sibling.getAttribute("inert"));
      sibling.setAttribute("aria-hidden", "true");
      sibling.setAttribute("inert", "");
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget = initialFocusRef?.current;
    const dialogElement = dialogRef.current;
    const focusable = dialogElement ? getFocusableElements(dialogElement) : [];

    if (focusTarget) {
      focusTarget.focus();
    } else if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialogElement?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;

      for (const sibling of siblings) {
        const oldAriaHidden = previousAriaHidden.get(sibling) ?? null;
        const oldInert = previousInert.get(sibling) ?? null;

        if (oldAriaHidden === null) {
          sibling.removeAttribute("aria-hidden");
        } else {
          sibling.setAttribute("aria-hidden", oldAriaHidden);
        }

        if (oldInert === null) {
          sibling.removeAttribute("inert");
        } else {
          sibling.setAttribute("inert", oldInert);
        }
      }

      if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      data-testid={backdropTestId}
      onMouseDown={(event) => {
        mouseDownOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const shouldClose =
          closeOnBackdropClick &&
          isDismissible &&
          event.target === event.currentTarget &&
          mouseDownOnBackdrop.current;

        if (shouldClose) {
          onClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className="outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape" && closeOnEscape && isDismissible) {
            event.preventDefault();
            onClose();
            return;
          }

          if (event.key !== "Tab") return;

          const dialogElement = dialogRef.current;
          if (!dialogElement) return;

          const focusable = getFocusableElements(dialogElement);
          if (focusable.length === 0) {
            event.preventDefault();
            dialogElement.focus();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const activeElement = document.activeElement as HTMLElement | null;

          if (event.shiftKey && activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
          }

          if (!event.shiftKey && activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
