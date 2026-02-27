import { buildPrivatePageMetadata } from "@/src/lib/seo/metadata";
import ForgotClient from "./forgot-client";

export const metadata = buildPrivatePageMetadata({
  title: "Forgot Password",
  description: "Request a password reset link.",
});

export default function Page() {
  return <ForgotClient />;
}
