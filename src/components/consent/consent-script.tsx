"use client";

import type { ReactNode } from "react";
import { getConsentServiceById } from "@/src/lib/consent/services";
import { useConsent } from "./consent-provider";

interface ConsentScriptProps {
  serviceId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConsentScript({ serviceId, children, fallback = null }: ConsentScriptProps) {
  const { hasConsentForCategory } = useConsent();
  const service = getConsentServiceById(serviceId);

  if (!service) {
    return <>{fallback}</>;
  }

  if (service.essential || hasConsentForCategory(service.category)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
