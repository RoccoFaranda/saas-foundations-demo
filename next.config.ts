import type { NextConfig } from "next";

const supportEmail = process.env.SUPPORT_EMAIL?.trim();
const publicContactEmail = process.env.PUBLIC_CONTACT_EMAIL?.trim();
const legalContactEmail = process.env.LEGAL_CONTACT_EMAIL?.trim();
const legalControllerName = process.env.LEGAL_CONTROLLER_NAME?.trim();
const supportEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (process.env.NODE_ENV === "production") {
  if (!supportEmail) {
    throw new Error("[config] SUPPORT_EMAIL is required in production.");
  }

  if (!supportEmailPattern.test(supportEmail)) {
    throw new Error("[config] SUPPORT_EMAIL must be a valid email address.");
  }

  if (!publicContactEmail) {
    throw new Error("[config] PUBLIC_CONTACT_EMAIL is required in production.");
  }

  if (!supportEmailPattern.test(publicContactEmail)) {
    throw new Error("[config] PUBLIC_CONTACT_EMAIL must be a valid email address.");
  }

  if (!legalContactEmail) {
    throw new Error("[config] LEGAL_CONTACT_EMAIL is required in production.");
  }

  if (!supportEmailPattern.test(legalContactEmail)) {
    throw new Error("[config] LEGAL_CONTACT_EMAIL must be a valid email address.");
  }

  if (!legalControllerName) {
    throw new Error("[config] LEGAL_CONTROLLER_NAME is required in production.");
  }
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  env: {
    SUPPORT_EMAIL: supportEmail,
  },
};

export default nextConfig;
