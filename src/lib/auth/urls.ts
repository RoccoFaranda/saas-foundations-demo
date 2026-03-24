import { logAuthEvent } from "./logging";
import { resolveAppUrl } from "../config/deployment";

export function getAppUrl(): string {
  const appUrl = resolveAppUrl();
  if (appUrl.ok) {
    return appUrl.value.origin;
  }

  logAuthEvent("app_url_missing");
  throw new Error(`[config] ${appUrl.message}`);
}
