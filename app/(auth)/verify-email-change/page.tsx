import VerifyEmailChangeClient from "./verify-email-change-client";

type Props = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function VerifyEmailChangePage({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;

  return <VerifyEmailChangeClient token={token} />;
}
