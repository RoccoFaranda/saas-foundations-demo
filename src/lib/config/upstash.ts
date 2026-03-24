type EnvironmentMap = Record<string, string | undefined>;

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface UpstashRedisConfig {
  url: string | null;
  token: string | null;
}

export function resolveUpstashRedisConfig(env: EnvironmentMap = process.env): UpstashRedisConfig {
  const url =
    normalizeEnvValue(env.UPSTASH_REDIS_REST_URL) ?? normalizeEnvValue(env.KV_REST_API_URL);
  const token =
    normalizeEnvValue(env.UPSTASH_REDIS_REST_TOKEN) ?? normalizeEnvValue(env.KV_REST_API_TOKEN);

  return { url, token };
}
