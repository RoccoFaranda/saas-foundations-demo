"use client";

import { useEffect, useRef } from "react";

interface ConsentBannerProps {
  isSaving: boolean;
  errorMessage?: string | null;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
}

export function ConsentBanner({
  isSaving,
  errorMessage,
  onAcceptAll,
  onRejectAll,
  onCustomize,
}: ConsentBannerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const rootDocumentElement = document.documentElement;
    const bodyElement = document.body;
    const previousBodyPaddingBottom = bodyElement.style.paddingBottom;
    const previousRootScrollPaddingBottom = rootDocumentElement.style.scrollPaddingBottom;

    const rootElement = rootRef.current;
    if (!rootElement) {
      return;
    }

    const updateOffset = () => {
      const bannerHeight = Math.ceil(rootElement.getBoundingClientRect().height);
      const offset = `${bannerHeight}px`;
      rootDocumentElement.style.setProperty("--consent-banner-offset", offset);
      bodyElement.style.paddingBottom = offset;
      rootDocumentElement.style.scrollPaddingBottom = offset;
    };

    updateOffset();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updateOffset()) : null;
    observer?.observe(rootElement);
    window.addEventListener("resize", updateOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateOffset);
      rootDocumentElement.style.removeProperty("--consent-banner-offset");
      if (previousBodyPaddingBottom) {
        bodyElement.style.paddingBottom = previousBodyPaddingBottom;
      } else {
        bodyElement.style.removeProperty("padding-bottom");
      }
      if (previousRootScrollPaddingBottom) {
        rootDocumentElement.style.scrollPaddingBottom = previousRootScrollPaddingBottom;
      } else {
        rootDocumentElement.style.removeProperty("scroll-padding-bottom");
      }
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 bottom-0 z-70 border-t border-border bg-surface/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-foreground">Cookie choices</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We use necessary cookies for core functionality. Optional cookies are off by default and
            only enabled if you choose.
          </p>
          {errorMessage ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isSaving}
            onClick={onRejectAll}
          >
            Reject all
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={isSaving}
            onClick={onAcceptAll}
          >
            Accept all
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={isSaving}
            onClick={onCustomize}
          >
            Customize
          </button>
        </div>
      </div>
    </div>
  );
}
