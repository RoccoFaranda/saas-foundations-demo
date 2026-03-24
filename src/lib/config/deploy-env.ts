import {
  getDeploymentTarget,
  isDeployedEnvironment,
  parseBooleanEnv,
  resolveAppUrl,
  type DeploymentTarget,
} from "./deployment";
import { resolveUpstashRedisConfig } from "./upstash";

type EnvironmentMap = Record<string, string | undefined>;
type SupportedEmailProvider = "resend" | "dev-mailbox" | "resend+dev-mailbox";

export interface DeployEnvironmentValidation {
  target: DeploymentTarget;
  errors: string[];
  warnings: string[];
}

export interface DeployEnvironmentValidationOptions {
  env?: EnvironmentMap;
  target?: DeploymentTarget;
}

export interface AssertDeployEnvironmentOptions extends DeployEnvironmentValidationOptions {
  logWarnings?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);

const TEST_SECRET_KEYS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function applyTargetOverride(
  env: EnvironmentMap,
  target: DeploymentTarget | undefined
): EnvironmentMap {
  if (!target) {
    return { ...env };
  }

  const scopedEnv = { ...env };
  if (target === "test") {
    scopedEnv.NODE_ENV = "test";
    delete scopedEnv.VERCEL_ENV;
    return scopedEnv;
  }

  if (target === "development") {
    scopedEnv.NODE_ENV = "development";
    delete scopedEnv.VERCEL_ENV;
    return scopedEnv;
  }

  scopedEnv.NODE_ENV = "production";
  scopedEnv.VERCEL_ENV = target;
  return scopedEnv;
}

function requireTextEnv(
  result: DeployEnvironmentValidation,
  env: EnvironmentMap,
  key: string
): void {
  if (!normalizeEnvValue(env[key])) {
    result.errors.push(`${key} is required for ${result.target} deployments.`);
  }
}

function requireEmailEnv(
  result: DeployEnvironmentValidation,
  env: EnvironmentMap,
  key: string
): void {
  const value = normalizeEnvValue(env[key]);
  if (!value) {
    result.errors.push(`${key} is required for ${result.target} deployments.`);
    return;
  }

  if (!EMAIL_PATTERN.test(value)) {
    result.errors.push(`${key} must be a valid email address.`);
  }
}

function resolveConfiguredEmailProvider(
  result: DeployEnvironmentValidation,
  env: EnvironmentMap
): SupportedEmailProvider {
  const configuredProvider = normalizeEnvValue(env.EMAIL_PROVIDER)?.toLowerCase();
  if (configuredProvider) {
    if (
      configuredProvider === "resend" ||
      configuredProvider === "dev-mailbox" ||
      configuredProvider === "resend+dev-mailbox"
    ) {
      return configuredProvider;
    }

    result.errors.push(`EMAIL_PROVIDER has an unsupported value: ${configuredProvider}.`);
  }

  return "resend";
}

function isLikelyTurnstileKey(
  value: string,
  minLength: number,
  knownTestKeys: Set<string>,
  allowTestKeys: boolean
): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (knownTestKeys.has(trimmed)) {
    return allowTestKeys;
  }

  if (trimmed.length < minLength) {
    return false;
  }

  if (/\s/.test(trimmed)) {
    return false;
  }

  return true;
}

function validateRateLimitConfig(result: DeployEnvironmentValidation, env: EnvironmentMap): void {
  const explicitUrlValue = normalizeEnvValue(env.UPSTASH_REDIS_REST_URL);
  const explicitTokenValue = normalizeEnvValue(env.UPSTASH_REDIS_REST_TOKEN);
  const kvUrlValue = normalizeEnvValue(env.KV_REST_API_URL);
  const kvTokenValue = normalizeEnvValue(env.KV_REST_API_TOKEN);
  const explicitUrl = Boolean(explicitUrlValue);
  const explicitToken = Boolean(explicitTokenValue);
  const kvUrl = Boolean(kvUrlValue);
  const kvToken = Boolean(kvTokenValue);
  const { url, token } = resolveUpstashRedisConfig(env);
  const hasUrl = Boolean(url);
  const hasToken = Boolean(token);
  const allowFallback = parseBooleanEnv(env.ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK);

  if (explicitUrl !== explicitToken) {
    result.errors.push(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must either both be set or both be unset."
    );
    return;
  }

  if (kvUrl !== kvToken) {
    result.errors.push(
      "KV_REST_API_URL and KV_REST_API_TOKEN must either both be set or both be unset."
    );
    return;
  }

  if (
    explicitUrl &&
    explicitToken &&
    kvUrl &&
    kvToken &&
    (explicitUrlValue !== kvUrlValue || explicitTokenValue !== kvTokenValue)
  ) {
    result.warnings.push(
      "Both UPSTASH_REDIS_REST_* and KV_REST_API_* are set with different values. The app will use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN and ignore the conflicting KV values."
    );
  }

  if (hasUrl && hasToken) {
    if (result.target === "production" && allowFallback) {
      result.warnings.push(
        "ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK=true is enabled in production; shared cross-instance rate limiting is weakened if Upstash is unavailable."
      );
    }
    return;
  }

  if (result.target === "production") {
    if (allowFallback) {
      result.warnings.push(
        "Upstash Redis env is missing in production; the app will fall back to in-memory rate limiting because ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK=true."
      );
      return;
    }

    result.errors.push(
      "Upstash Redis env is missing for production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or Vercel's KV_REST_API_URL and KV_REST_API_TOKEN, or explicitly allow the in-memory fallback."
    );
    return;
  }

  result.warnings.push(
    "Upstash Redis env is missing in preview; preview deployments will use the in-memory rate limiter and may not match production rate-limit behavior."
  );
}

function validateTurnstileConfig(result: DeployEnvironmentValidation, env: EnvironmentMap): void {
  const siteKey = normalizeEnvValue(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const secretKey = normalizeEnvValue(env.TURNSTILE_SECRET_KEY);
  const bypass = parseBooleanEnv(env.TURNSTILE_ALLOW_BYPASS);

  if (result.target === "production" && bypass) {
    result.warnings.push(
      "TURNSTILE_ALLOW_BYPASS=true is enabled in production; signup bot protection is disabled."
    );
    return;
  }

  if (result.target === "preview") {
    const hasSiteKey = Boolean(siteKey);
    const hasSecretKey = Boolean(secretKey);
    if (hasSiteKey !== hasSecretKey) {
      result.errors.push(
        "Preview Turnstile config is partial. Set both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or leave both unset."
      );
      return;
    }

    if (!hasSiteKey && !hasSecretKey) {
      result.warnings.push(
        "Preview Turnstile keys are unset; preview deployments will skip Turnstile verification and may not match production signup behavior."
      );
      return;
    }

    const previewSiteKey = siteKey ?? "";
    const previewSecretKey = secretKey ?? "";
    const validPreviewSiteKey = isLikelyTurnstileKey(previewSiteKey, 20, TEST_SITE_KEYS, true);
    const validPreviewSecretKey = isLikelyTurnstileKey(
      previewSecretKey,
      32,
      TEST_SECRET_KEYS,
      true
    );
    if (!validPreviewSiteKey || !validPreviewSecretKey) {
      result.errors.push(
        "Preview Turnstile keys are invalid. Use real keys or the official Cloudflare test keys."
      );
    }
    return;
  }

  const validSiteKey = siteKey ? isLikelyTurnstileKey(siteKey, 20, TEST_SITE_KEYS, false) : false;
  const validSecretKey = secretKey
    ? isLikelyTurnstileKey(secretKey, 32, TEST_SECRET_KEYS, false)
    : false;

  if (!validSiteKey || !validSecretKey) {
    result.errors.push(
      "Production Turnstile protection is required unless TURNSTILE_ALLOW_BYPASS=true. Configure valid non-test NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY values."
    );
  }
}

function validateEmailConfig(result: DeployEnvironmentValidation, env: EnvironmentMap): void {
  const provider = resolveConfiguredEmailProvider(result, env);
  const includesDevMailbox = provider === "dev-mailbox" || provider === "resend+dev-mailbox";
  const usesResend = provider === "resend" || provider === "resend+dev-mailbox";
  const allowDevMailboxInProduction = parseBooleanEnv(env.ALLOW_DEV_MAILBOX_IN_PROD);

  if (result.target === "production" && allowDevMailboxInProduction) {
    result.warnings.push(
      "ALLOW_DEV_MAILBOX_IN_PROD=true is enabled in production; dev mailbox access is allowed on the live deployment."
    );
  }

  if (result.target === "production" && includesDevMailbox && !allowDevMailboxInProduction) {
    result.errors.push(
      "EMAIL_PROVIDER includes dev-mailbox in production. Set ALLOW_DEV_MAILBOX_IN_PROD=true to make that override explicit."
    );
  }

  if (usesResend) {
    requireTextEnv(result, env, "RESEND_API_KEY");
    requireTextEnv(result, env, "EMAIL_FROM");
  }
}

export function validateDeployEnvironment(
  options: DeployEnvironmentValidationOptions = {}
): DeployEnvironmentValidation {
  const scopedEnv = applyTargetOverride(options.env ?? process.env, options.target);
  const target = getDeploymentTarget(scopedEnv);
  const result: DeployEnvironmentValidation = {
    target,
    errors: [],
    warnings: [],
  };

  if (!isDeployedEnvironment(scopedEnv)) {
    return result;
  }

  requireTextEnv(result, scopedEnv, "DATABASE_URL");
  requireTextEnv(result, scopedEnv, "AUTH_SECRET");
  requireTextEnv(result, scopedEnv, "TOKEN_HASH_SECRET");
  requireTextEnv(result, scopedEnv, "CONSENT_AUDIT_SIGNING_SECRET");
  requireTextEnv(result, scopedEnv, "READINESS_SECRET");
  requireEmailEnv(result, scopedEnv, "SUPPORT_EMAIL");
  requireEmailEnv(result, scopedEnv, "PUBLIC_CONTACT_EMAIL");
  requireEmailEnv(result, scopedEnv, "LEGAL_CONTACT_EMAIL");
  requireTextEnv(result, scopedEnv, "LEGAL_CONTROLLER_NAME");

  const appUrl = resolveAppUrl(scopedEnv);
  if (!appUrl.ok) {
    result.errors.push(appUrl.message);
  }

  validateEmailConfig(result, scopedEnv);
  validateRateLimitConfig(result, scopedEnv);
  validateTurnstileConfig(result, scopedEnv);

  if (target === "production") {
    requireTextEnv(result, scopedEnv, "CRON_SECRET");
  }

  return result;
}

export function formatDeployEnvironmentValidation(result: DeployEnvironmentValidation): string {
  const lines = [`[deploy-env] ${result.target} deployment validation`];

  if (result.errors.length > 0) {
    lines.push("Errors:");
    lines.push(...result.errors.map((message) => `- ${message}`));
  }

  if (result.warnings.length > 0) {
    lines.push("Warnings:");
    lines.push(...result.warnings.map((message) => `- ${message}`));
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push("No issues found.");
  }

  return lines.join("\n");
}

export function assertValidDeployEnvironment(
  options: AssertDeployEnvironmentOptions = {}
): DeployEnvironmentValidation {
  const result = validateDeployEnvironment(options);

  if (options.logWarnings && result.warnings.length > 0) {
    console.warn(formatDeployEnvironmentValidation({ ...result, errors: [] }));
  }

  if (result.errors.length > 0) {
    throw new Error(formatDeployEnvironmentValidation(result));
  }

  return result;
}
