import type { NextConfig } from "next";
import { assertValidDeployEnvironment } from "./src/lib/config/deploy-env";

const supportEmail = process.env.SUPPORT_EMAIL?.trim();

const shouldValidateDeployEnvironment =
  process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV?.trim());

if (shouldValidateDeployEnvironment) {
  assertValidDeployEnvironment({ logWarnings: true });
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  env: {
    SUPPORT_EMAIL: supportEmail,
  },
};

export default nextConfig;
