import { CLEANER_ONBOARDING_FORM_URL } from "./cleaner-onboarding";
import { LEGAL_EMAIL } from "./legal";
import { RESEND_ENDPOINT } from "./welcome-email";

/**
 * Cleaner welcome mail, sent from the server after a cleaner signup is kept.
 * The only link is Start onboarding, which opens CLEANER_ONBOARDING_FORM_URL.
 *
 * Uses the same optional Resend config as the customer welcome
 * (`RESEND_API_KEY`, `EMAIL_FROM`). EMAIL_FROM is the outbound From identity
 * only. Replies go to LEGAL_EMAIL. When either env var is missing or Resend
 * errors, this logs and returns `{ sent: false }`. The waitlist signup still succeeds.
 */

export const CLEANER_WELCOME_SUBJECT = "You're on the Tydlii cleaner list";

const TIMEOUT_MS = 8_000;

export type CleanerWelcomeInput = {
  to: string;
  name: string;
};

export type CleanerWelcomeSender = (input: CleanerWelcomeInput) => Promise<{ sent: boolean }>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCleanerWelcomeEmail(): { subject: string; html: string; text: string } {
  const href = escapeHtml(CLEANER_ONBOARDING_FORM_URL);
  const text = [
    "You're on the Tydlii cleaner list.",
    "",
    "Start onboarding when you're ready. The form is the next step.",
    "",
    `Start onboarding: ${CLEANER_ONBOARDING_FORM_URL}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(CLEANER_WELCOME_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background-color:#5c9396;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Start onboarding.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#5c9396" style="background-color:#5c9396;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:28px;">
          <tr>
            <td style="padding:36px 32px 32px;font-family:Avenir Next,Segoe UI,Helvetica,Arial,sans-serif;color:#141414;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.3;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#04a3ac;">Cleaner list</p>
              <h1 style="margin:12px 0 0;font-size:32px;line-height:1.1;font-weight:700;letter-spacing:-0.03em;color:#070707;">You're on the Tydlii cleaner list.</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.45;color:#141414;">Start onboarding when you're ready. The form is the next step.</p>
              <p style="margin:28px 0 0;">
                <a href="${href}" style="display:inline-block;background:#070707;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:1;padding:16px 28px;border-radius:999px;">Start onboarding</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: CLEANER_WELCOME_SUBJECT, html, text };
}

/**
 * Send the cleaner welcome. Never throws. Missing Resend config is a skip, not a failed signup.
 */
export async function sendCleanerWelcome(
  input: CleanerWelcomeInput,
  env?: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ sent: boolean }> {
  const apiKey = (env ? env.RESEND_API_KEY : process.env.RESEND_API_KEY)?.trim() ?? "";
  const from = (env ? env.EMAIL_FROM : process.env.EMAIL_FROM)?.trim() ?? "";
  if (!apiKey || !from) {
    const missing = !apiKey ? "RESEND_API_KEY" : "EMAIL_FROM";
    console.error(
      `[tydlii cleaner welcome] ${missing} is not set; cleaner welcome email skipped for ${input.to}. Start onboarding: ${CLEANER_ONBOARDING_FORM_URL}`,
    );
    return { sent: false };
  }

  const message = renderCleanerWelcomeEmail();
  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: LEGAL_EMAIL,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("[tydlii cleaner welcome] resend responded", response.status, detail);
      return { sent: false };
    }
    console.log("[tydlii cleaner welcome] sent", input.to);
    return { sent: true };
  } catch {
    console.error("[tydlii cleaner welcome] resend request failed", input.to);
    return { sent: false };
  }
}
