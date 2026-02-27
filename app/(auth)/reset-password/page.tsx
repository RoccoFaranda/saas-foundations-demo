import ResetClient from "./reset-client";
import { getPasswordResetToken } from "@/src/lib/auth/tokens";
import { enforceRateLimit, getRequestIp, toHashedTokenIdentifier } from "@/src/lib/auth/rate-limit";
import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";

type Props = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export const metadata = buildPrivatePageMetadata({
  title: "Reset Password",
  description: "Set a new password for your account.",
});

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;
  let tokenValid: boolean | null = null;
  let precheckError: string | null = null;

  if (token) {
    const requestIp = await getRequestIp();
    const rateLimit = await enforceRateLimit("resetPasswordPrecheck", [
      requestIp ? `ip:${requestIp}` : "",
      toHashedTokenIdentifier(token),
    ]);

    if (rateLimit) {
      tokenValid = false;
      precheckError = rateLimit.error;
    } else {
      try {
        const record = await getPasswordResetToken(token);
        tokenValid = !!record;
      } catch {
        tokenValid = false;
      }
    }
  }

  return <ResetClient token={token} tokenValid={tokenValid} precheckError={precheckError} />;
}
