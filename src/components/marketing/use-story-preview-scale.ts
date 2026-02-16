import { useCallback, useEffect, useRef, useState } from "react";

interface UseStoryPreviewScaleOptions {
  baseCanvasWidth: number;
  minScale: number;
  fallbackHeightClass: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useStoryPreviewScale({
  baseCanvasWidth,
  minScale,
  fallbackHeightClass,
}: UseStoryPreviewScaleOptions) {
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const scaledPreviewRef = useRef<HTMLDivElement | null>(null);

  const [previewScale, setPreviewScale] = useState(0.8);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);

  const updatePreviewScale = useCallback(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return;

    const availableWidth = viewport.getBoundingClientRect().width;
    const nextScale = clamp(availableWidth / baseCanvasWidth, minScale, 1);

    setPreviewScale((current) => (Math.abs(current - nextScale) < 0.001 ? current : nextScale));
  }, [baseCanvasWidth, minScale]);

  const updatePreviewHeight = useCallback(() => {
    const preview = scaledPreviewRef.current;
    if (!preview) return;

    const nextHeight = Math.ceil(preview.getBoundingClientRect().height);
    setPreviewHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return;

    let frame = 0;

    const queueScaleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updatePreviewScale();
      });
    };

    queueScaleUpdate();

    const observer = new ResizeObserver(queueScaleUpdate);
    observer.observe(viewport);
    window.addEventListener("resize", queueScaleUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer.disconnect();
      window.removeEventListener("resize", queueScaleUpdate);
    };
  }, [updatePreviewScale]);

  useEffect(() => {
    const preview = scaledPreviewRef.current;
    if (!preview) return;

    let frame = 0;

    const queueHeightUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updatePreviewHeight();
      });
    };

    queueHeightUpdate();

    const observer = new ResizeObserver(queueHeightUpdate);
    observer.observe(preview);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, [updatePreviewHeight]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updatePreviewHeight);
    return () => window.cancelAnimationFrame(frame);
  }, [previewScale, updatePreviewHeight]);

  return {
    previewViewportRef,
    scaledPreviewRef,
    previewScale,
    previewHeight,
    previewFrameClassName: previewHeight === null ? fallbackHeightClass : "",
    previewFrameStyle: previewHeight === null ? undefined : { height: `${previewHeight}px` },
  };
}
