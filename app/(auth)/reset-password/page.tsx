import ResetClient from "./reset-client";
import { getPasswordResetToken } from "@/src/lib/auth/tokens";

type Props = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function Page({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;
  let tokenValid: boolean | null = null;

  if (token) {
    try {
      const record = await getPasswordResetToken(token);
      tokenValid = !!record;
    } catch {
      tokenValid = false;
    }
  }

  return <ResetClient token={token} tokenValid={tokenValid} />;
}
