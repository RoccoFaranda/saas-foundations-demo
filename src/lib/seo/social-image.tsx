import { ImageResponse } from "next/og";
import { PUBLIC_PERSON_NAME } from "@/src/content/profile/public-metadata";
import { SITE_NAME, SOCIAL_IMAGE_ALT, SOCIAL_IMAGE_SIZE } from "./metadata";

export { SOCIAL_IMAGE_ALT, SOCIAL_IMAGE_SIZE };

function SocialImageMarkup() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 68px",
        background:
          "linear-gradient(138deg, rgba(236,247,255,1) 0%, rgba(242,246,255,1) 46%, rgba(227,240,255,1) 100%)",
        color: "#0f172a",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          alignItems: "center",
          borderRadius: "9999px",
          border: "1px solid rgba(15,23,42,0.18)",
          padding: "10px 18px",
          fontSize: 24,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        SaaS Foundations
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 68,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            fontWeight: 750,
            maxWidth: 1020,
          }}
        >
          Production-Style SaaS Demo
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 33,
            lineHeight: 1.28,
            color: "rgba(15,23,42,0.78)",
            maxWidth: 1020,
          }}
        >
          Guest mode, real auth lifecycle, dashboard patterns, and tested architecture.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(15,23,42,0.14)",
          paddingTop: 18,
          fontSize: 27,
          color: "rgba(15,23,42,0.76)",
        }}
      >
        <span>{SITE_NAME}</span>
        <span>{`Built by ${PUBLIC_PERSON_NAME}`}</span>
      </div>
    </div>
  );
}

export function createSocialImageResponse() {
  return new ImageResponse(<SocialImageMarkup />, SOCIAL_IMAGE_SIZE);
}
