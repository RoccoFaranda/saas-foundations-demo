import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";
import VerifyEmailChangeClient from "./verify-email-change-client";

type Props = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export const metadata = buildPrivatePageMetadata({
  title: "Verify Email Change",
  description: "Confirm the verification token to finalize your email address update.",
});

export default async function VerifyEmailChangePage({ searchParams }: Props) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const tokenParam = resolvedSearchParams?.token;
  const token = typeof tokenParam === "string" ? tokenParam : null;

  return <VerifyEmailChangeClient token={token} />;
}
