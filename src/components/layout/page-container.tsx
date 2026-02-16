import type { ComponentPropsWithoutRef, ReactNode } from "react";

type PageContainerSize = "default" | "narrow";

interface PageContainerProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  size?: PageContainerSize;
}

const SIZE_CLASS: Record<PageContainerSize, string> = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
};

export function PageContainer({
  children,
  className = "",
  size = "default",
  ...rest
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full px-4 ${SIZE_CLASS[size]} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
