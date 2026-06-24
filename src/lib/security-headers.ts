export const SECURITY_RESPONSE_HEADERS: Array<{ key: string; value: string }> = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

export function applySecurityResponseHeaders(headers: Headers): void {
  for (const { key, value } of SECURITY_RESPONSE_HEADERS) {
    headers.set(key, value);
  }
}
