export type AuthLogEvent =
  | "signup_validation_failed"
  | "signup_duplicate"
  | "signup_created"
  | "signup_verification_email_sent"
  | "signup_auto_login_failed"
  | "login_validation_failed"
  | "login_invalid_credentials"
  | "login_success"
  | "verify_email_invalid_token"
  | "verify_email_token_invalid"
  | "verify_email_success"
  | "resend_verification_validation_failed"
  | "resend_verification_sent"
  | "resend_verification_noop";

type AuthLogDetails = Record<string, string | number | boolean | null | undefined>;

export function logAuthEvent(event: AuthLogEvent, details?: AuthLogDetails): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const payload = details ? { event, ...details } : { event };
  console.log("[AUTH EVENT]", payload);
}
