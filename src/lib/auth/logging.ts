export type AuthLogEvent =
  | "signup_validation_failed"
  | "signup_duplicate"
  | "signup_created"
  | "signup_verification_email_sent"
  | "login_validation_failed"
  | "login_invalid_credentials"
  | "login_success";

type AuthLogDetails = Record<string, string | number | boolean | null | undefined>;

export function logAuthEvent(event: AuthLogEvent, details?: AuthLogDetails): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const payload = details ? { event, ...details } : { event };
  console.log("[AUTH EVENT]", payload);
}
