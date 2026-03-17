import { getSupportEmail } from "../config/support-email";

const PRODUCT_NAME = "SaaS Foundations Demo";
const ONE_HOUR_EXPIRY_NOTICE = "This link expires in 1 hour.";

export type AuthEmailTemplate = {
  subject: string;
  html: string;
  text: string;
  preheader: string;
};

type AuthEmailLayoutInput = {
  preheader: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  details: string[];
  securityNote: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveSupportEmail(): string | null {
  try {
    return getSupportEmail();
  } catch {
    return null;
  }
}

function renderEmailLayout({
  preheader,
  heading,
  intro,
  ctaLabel,
  ctaUrl,
  details,
  securityNote,
}: AuthEmailLayoutInput): { html: string; text: string } {
  const safePreheader = escapeHtml(preheader);
  const safeHeading = escapeHtml(heading);
  const safeIntro = escapeHtml(intro);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);
  const safeDetails = details.map((detail) => escapeHtml(detail));
  const safeSecurityNote = escapeHtml(securityNote);
  const supportEmail = resolveSupportEmail();
  const safeSupportEmail = supportEmail ? escapeHtml(supportEmail) : null;

  const detailsHtml = safeDetails
    .map(
      (detail) =>
        `<p class="email-detail" style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#0f172a;">${detail}</p>`
    )
    .join("");

  const supportHtml = safeSupportEmail
    ? `<p class="email-support" style="margin:0;font-size:14px;line-height:1.55;color:#475569;">Need help? Contact <a href="mailto:${safeSupportEmail}" class="email-link" style="color:#1f4db8;text-decoration:underline;">${safeSupportEmail}</a>.</p>`
    : "";

  const textParts = [
    heading,
    intro,
    `${ctaLabel}: ${ctaUrl}`,
    ...details,
    securityNote,
    supportEmail ? `Need help? Contact ${supportEmail}.` : "",
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>
      @media (prefers-color-scheme: dark) {
        .email-bg {
          background-color: #0b1220 !important;
        }
        .email-card {
          background-color: #111827 !important;
          border-color: #334155 !important;
        }
        .email-brand,
        .email-link {
          color: #bfdbfe !important;
        }
        .email-heading {
          color: #f8fafc !important;
        }
        .email-copy,
        .email-detail {
          color: #e2e8f0 !important;
        }
        .email-security,
        .email-support,
        .email-fallback-copy {
          color: #cbd5e1 !important;
        }
        .email-fallback {
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }
        .email-button-cell {
          background-color: #7fb3e8 !important;
        }
        .email-button {
          color: #0a1324 !important;
        }
      }

      [data-ogsc] .email-bg {
        background-color: #0b1220 !important;
      }
      [data-ogsc] .email-card {
        background-color: #111827 !important;
        border-color: #334155 !important;
      }
      [data-ogsc] .email-brand,
      [data-ogsc] .email-link {
        color: #bfdbfe !important;
      }
      [data-ogsc] .email-heading {
        color: #f8fafc !important;
      }
      [data-ogsc] .email-copy,
      [data-ogsc] .email-detail {
        color: #e2e8f0 !important;
      }
      [data-ogsc] .email-security,
      [data-ogsc] .email-support,
      [data-ogsc] .email-fallback-copy {
        color: #cbd5e1 !important;
      }
      [data-ogsc] .email-fallback {
        background-color: #1e293b !important;
        border-color: #334155 !important;
      }
      [data-ogsc] .email-button-cell {
        background-color: #7fb3e8 !important;
      }
      [data-ogsc] .email-button {
        color: #0a1324 !important;
      }
    </style>
  </head>
  <body class="email-bg" style="margin:0;padding:0;background-color:#f1f5f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${safePreheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#f1f5f9;padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;">
            <tr>
              <td style="padding:28px 24px 18px;font-family:Arial,'Segoe UI',sans-serif;">
                <p class="email-brand" style="margin:0 0 8px;font-size:12px;line-height:1.5;font-weight:700;letter-spacing:.08em;color:#1f4db8;text-transform:uppercase;">${PRODUCT_NAME}</p>
                <h1 class="email-heading" style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#020617;">${safeHeading}</h1>
                <p class="email-copy" style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#0f172a;">${safeIntro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                  <tr>
                    <td class="email-button-cell" style="border-radius:10px;background-color:#1f4db8;">
                      <a href="${safeCtaUrl}" class="email-button" style="display:inline-block;padding:12px 20px;font-size:16px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;">${safeCtaLabel}</a>
                    </td>
                  </tr>
                </table>
                ${detailsHtml}
                <div class="email-fallback" style="margin:4px 0 18px;padding:12px;border-radius:8px;border:1px solid #e2e8f0;background-color:#f8fafc;">
                  <p class="email-fallback-copy" style="margin:0 0 8px;font-size:13px;line-height:1.45;color:#334155;">If the button does not work, copy and paste this link into your browser:</p>
                  <p style="margin:0;font-size:13px;line-height:1.45;word-break:break-all;">
                    <a href="${safeCtaUrl}" class="email-link" style="color:#1f4db8;text-decoration:underline;">${safeCtaUrl}</a>
                  </p>
                </div>
                <p class="email-security" style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#334155;">${safeSecurityNote}</p>
                ${supportHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    text: textParts.join("\n\n"),
  };
}

export function buildVerifyEmailTemplate(verifyUrl: string): AuthEmailTemplate {
  const subject = "Verify your email - SaaS Foundations Demo";
  const preheader = "Confirm your email to finish setting up your account.";
  const { html, text } = renderEmailLayout({
    preheader,
    heading: "Verify your email",
    intro:
      "You're receiving this because an account signup was started with this email address. Use the button below to verify this email address and finish creating the account.",
    ctaLabel: "Verify email",
    ctaUrl: verifyUrl,
    details: [ONE_HOUR_EXPIRY_NOTICE],
    securityNote: "If you didn't create this account, you can safely ignore this email.",
  });

  return { subject, html, text, preheader };
}

export function buildResetPasswordTemplate(resetUrl: string): AuthEmailTemplate {
  const subject = "Reset your password - SaaS Foundations Demo";
  const preheader = "Use this secure link to reset your password.";
  const { html, text } = renderEmailLayout({
    preheader,
    heading: "Reset your password",
    intro:
      "You're receiving this because a password reset was requested for your account. Use the button below to choose a new password.",
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    details: [ONE_HOUR_EXPIRY_NOTICE],
    securityNote:
      "If you didn't request a password reset, you can ignore this email and your password will remain unchanged.",
  });

  return { subject, html, text, preheader };
}

export function buildVerifyNewEmailTemplate(
  verifyUrl: string,
  newEmail: string
): AuthEmailTemplate {
  const subject = "Verify your new email - SaaS Foundations Demo";
  const preheader = "Confirm your new email address to complete the change.";
  const { html, text } = renderEmailLayout({
    preheader,
    heading: "Verify your new email address",
    intro:
      "You're receiving this because a request was made to use this email address for an existing account. Use the button below to verify this email address and complete the change.",
    ctaLabel: "Verify new email",
    ctaUrl: verifyUrl,
    details: [ONE_HOUR_EXPIRY_NOTICE, `Requested new email: ${newEmail}`],
    securityNote:
      "If you didn't request this change, you can safely ignore this email. Your email will only be updated if this link is used.",
  });

  return { subject, html, text, preheader };
}

function formatDeletionSchedule(scheduledFor: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(scheduledFor);
}

export function buildAccountDeletionScheduledTemplate(
  restoreUrl: string,
  scheduledFor: Date
): AuthEmailTemplate {
  const formattedSchedule = formatDeletionSchedule(scheduledFor);
  const subject = "Account deletion scheduled - SaaS Foundations Demo";
  const preheader = "Your account has been scheduled for permanent deletion.";
  const { html, text } = renderEmailLayout({
    preheader,
    heading: "Account deletion scheduled",
    intro:
      "You're receiving this because a request was made to delete your account. Use the button below before the deadline to restore your account and cancel deletion.",
    ctaLabel: "Restore account",
    ctaUrl: restoreUrl,
    details: [
      `Permanent deletion date: ${formattedSchedule} UTC.`,
      "After the deadline passes, your account and associated data are permanently removed.",
    ],
    securityNote:
      "If you didn't request this deletion, restore your account immediately and contact support.",
  });

  return { subject, html, text, preheader };
}
