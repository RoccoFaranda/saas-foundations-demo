import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Extract verification token from email HTML
 */
function extractTokenFromEmail(html: string): string | null {
  const match = html.match(/verify-email\?token=([^"&]+)/);
  return match ? match[1] : null;
}

/**
 * Read the latest verification email from dev mailbox
 */
async function getLatestVerificationEmail(email: string): Promise<{
  token: string;
  subject: string;
} | null> {
  const mailboxPath = path.join(process.cwd(), ".dev-mailbox.json");
  try {
    const raw = await readFile(mailboxPath, "utf8");
    const messages = JSON.parse(raw);
    if (!Array.isArray(messages) || messages.length === 0) {
      return null;
    }

    // Find the latest verification email for this address
    type MailboxMessage = {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      createdAt?: string;
    };

    const verificationEmails = (messages as MailboxMessage[])
      .filter((msg) => msg.to === email && msg.subject?.includes("Verify your email"))
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

    if (verificationEmails.length === 0) {
      return null;
    }

    const latest = verificationEmails[0];
    const token = extractTokenFromEmail(latest.html || latest.text || "");
    if (!token) {
      return null;
    }

    return { token, subject: latest.subject };
  } catch {
    return null;
  }
}

async function waitForVerificationEmail(
  email: string,
  timeoutMs = 10000,
  intervalMs = 250
): Promise<{ token: string; subject: string }> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const emailData = await getLatestVerificationEmail(email);
    if (emailData) {
      return emailData;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for verification email for ${email}`);
}

test.describe("Auth core flow", () => {
  test("signup -> verify email -> login -> dashboard", async ({ page }) => {
    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `e2e-test-${timestamp}@example.com`;
    const testPassword = "testpassword123";

    // Step 1: Navigate to signup page
    await page.goto("/signup");

    // Verify signup page is loaded
    await expect(page.getByRole("heading", { name: /Create an account/i })).toBeVisible();

    // Step 2: Fill and submit signup form
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: /Create account/i }).click();

    // Step 3: Wait for redirect to verify-email page
    await expect(page).toHaveURL(/\/verify-email/, { timeout: 5000 });
    await expect(page.getByRole("heading", { name: /Verify your email/i })).toBeVisible();

    // Step 4: Verify unverified users are blocked from app routes
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/verify-email/, { timeout: 5000 });

    // Step 5: Extract verification token from dev mailbox (polling)
    const emailData = await waitForVerificationEmail(testEmail);
    expect(emailData.subject).toContain("Verify your email");
    const verificationToken = emailData.token;

    // Step 6: Navigate to verification URL
    await page.goto(`/verify-email?token=${verificationToken}`);

    // Step 7: Wait for verification success or auto-redirect to dashboard
    await page.waitForURL(/\/verify-email|\/app\/dashboard/, { timeout: 5000 });
    if (page.url().includes("/verify-email")) {
      await expect(page.getByRole("heading", { name: /Email verified!/i })).toBeVisible({
        timeout: 5000,
      });
    }

    // Step 8: Ensure logged out before testing login
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    // Step 9: Fill and submit login form
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: /Sign in/i }).click();

    // Step 10: Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5000 });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });
});
