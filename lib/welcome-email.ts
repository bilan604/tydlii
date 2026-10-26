import { readFile } from "node:fs/promises";
import path from "node:path";
import { REFERRAL_CREDIT_PROMISE } from "./referral";
import { SITE } from "./site";

/**
 * Customer welcome mail, sent from the server after a customer signup is kept.
 *
 * Web3Forms cannot address the customer (it only delivers to the inbox on the
 * access key), and Render's outbound IP is blocked for server-side Web3Forms.
 * Resend is the transactional path. Both env vars are optional:
 *
 * - RESEND_API_KEY
 * - EMAIL_FROM — a sender on a domain verified in Resend, e.g. `Tydlii <hello@tydlii.com>`
 *
 * When either is missing or Resend errors, this logs and returns `{ sent: false }`.
 * The waitlist signup still succeeds.
 */

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const WELCOME_SUBJECT = "You're on the Tydlii list";

const TIMEOUT_MS = 8_000;

export type CustomerWelcomeInput = {
  to: string;
  name: string;
  code: string;
  shareUrl: string;
  manageUrl: string;
};

export type WelcomeSender = (input: CustomerWelcomeInput) => Promise<{ sent: boolean }>;

export type WelcomeAttachment = {
  filename: string;
  content: string;
  content_type: string;
  content_id: string;
};

export type WelcomeMessage = {
  subject: string;
  html: string;
  text: string;
  attachments: WelcomeAttachment[];
};

const HERO_FILE = "customer-welcome-hero.jpg";
const WORDMARK_FILE = "wordmark-light.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assetPath(filename: string): string {
  return path.join(process.cwd(), "public", "email", filename);
}

async function cidImage(
  filename: string,
  contentId: string,
  contentType: string,
  fallbackSrc: string,
): Promise<{ src: string; attachment?: WelcomeAttachment }> {
  try {
    const bytes = await readFile(assetPath(filename));
    return {
      src: `cid:${contentId}`,
      attachment: {
        filename,
        content: bytes.toString("base64"),
        content_type: contentType,
        content_id: contentId,
      },
    };
  } catch {
    console.error("[tydlii welcome] image missing", filename);
    return { src: fallbackSrc };
  }
}

export function renderWelcomeEmail(input: {
  shareUrl: string;
  manageUrl: string;
  heroSrc: string;
  wordmarkSrc: string;
}): { subject: string; html: string; text: string } {
  const shareUrl = escapeHtml(input.shareUrl);
  const manageUrl = escapeHtml(input.manageUrl);
  const heroSrc = escapeHtml(input.heroSrc);
  const wordmarkSrc = escapeHtml(input.wordmarkSrc);
  const promise = escapeHtml(REFERRAL_CREDIT_PROMISE);

  const text = [
    "You're on the Tydlii list.",
    "",
    "More living. Less cleaning.",
    "Experience the ultimate clean with our trusted pros.",
    "",
    "Sparkling Results, Eco-Friendly, On-Demand Booking.",
    "",
    "You get $25. Your friend gets $25.",
    REFERRAL_CREDIT_PROMISE,
    "Refer a friend or family. When they finish their first paid clean, you each get $25 in account credit. It is not cash, and it cannot be used before that clean.",
    "",
    `Get your referral link: ${input.shareUrl}`,
    `Copy your link: ${input.manageUrl}`,
  ].join("\n");

  const pill = (label: string) => `
                <td width="33.33%" valign="top" style="padding:0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
                    <tr>
                      <td align="center" style="padding:16px 8px;font-family:Avenir Next,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.25;font-weight:700;color:#141414;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#04a3ac;margin:0 6px 0 0;vertical-align:middle;"></span>${label}
                      </td>
                    </tr>
                  </table>
                </td>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(WELCOME_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#5c9396;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">More living. Less cleaning. ${promise}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#5c9396;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#5c9396;">
          <tr>
            <td align="center" style="background:#070707;padding:28px 24px 22px;">
              <img src="${wordmarkSrc}" width="168" alt="Tydlii" style="display:block;width:168px;max-width:168px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="background:#04a3ac;height:8px;line-height:8px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background:#5c9396;padding:0;line-height:0;font-size:0;">
              <img src="${heroSrc}" width="600" alt="A customer with her dog on the couch after a Tydlii clean" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="background:#5c9396;padding:36px 28px 12px;font-family:Avenir Next,Segoe UI,Helvetica,Arial,sans-serif;text-align:center;">
              <h1 style="margin:0;font-size:40px;line-height:1.05;font-weight:700;letter-spacing:-0.03em;color:#ffffff;">More living. Less cleaning.</h1>
              <p style="margin:18px 0 0;font-size:20px;line-height:1.35;color:#ffffff;">Experience the ultimate clean<br>with our trusted pros.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#5c9396;padding:22px 18px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${pill("Sparkling<br>Results")}
                  ${pill("Eco-Friendly")}
                  ${pill("On-Demand<br>Booking")}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#5c9396;padding:22px 28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5f3f4;border-radius:28px;">
                <tr>
                  <td align="center" style="padding:32px 28px 28px;font-family:Avenir Next,Segoe UI,Helvetica,Arial,sans-serif;color:#141414;">
                    <p style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">You get $25.<br>Your friend gets $25.</p>
                    <p style="margin:16px 0 0;font-size:18px;line-height:1.4;font-weight:700;">${promise}</p>
                    <p style="margin:12px 0 0;font-size:16px;line-height:1.45;">Refer a friend or family. When they finish their first paid clean, you each get $25 in account credit. It is not cash, and it cannot be used before that clean.</p>
                    <p style="margin:22px 0 0;">
                      <a href="${shareUrl}" style="display:inline-block;background:#070707;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:1;padding:16px 28px;border-radius:999px;">Get your referral link</a>
                    </p>
                    <p style="margin:16px 0 0;font-size:14px;line-height:1.4;"><a href="${manageUrl}" style="color:#067a86;font-weight:700;">Copy your link</a><br><a href="${shareUrl}" style="color:#067a86;word-break:break-all;">${shareUrl}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: WELCOME_SUBJECT, html, text };
}

export async function buildCustomerWelcome(input: CustomerWelcomeInput): Promise<WelcomeMessage> {
  const [wordmark, hero] = await Promise.all([
    cidImage(WORDMARK_FILE, "tydlii-wordmark", "image/png", `${SITE.url}/brand/wordmark-light.png`),
    cidImage(HERO_FILE, "tydlii-welcome-hero", "image/jpeg", `${SITE.url}/email/${HERO_FILE}`),
  ]);
  const rendered = renderWelcomeEmail({
    shareUrl: input.shareUrl,
    manageUrl: input.manageUrl,
    heroSrc: hero.src,
    wordmarkSrc: wordmark.src,
  });
  const attachments = [wordmark.attachment, hero.attachment].filter((item): item is WelcomeAttachment =>
    Boolean(item),
  );
  return { ...rendered, attachments };
}

/**
 * Send the branded welcome. Never throws. Missing Resend config is a skip, not a failed signup.
 */
export async function sendCustomerWelcome(
  input: CustomerWelcomeInput,
  env?: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ sent: boolean }> {
  const apiKey = (env ? env.RESEND_API_KEY : process.env.RESEND_API_KEY)?.trim() ?? "";
  const from = (env ? env.EMAIL_FROM : process.env.EMAIL_FROM)?.trim() ?? "";
  if (!apiKey || !from) {
    const missing = !apiKey ? "RESEND_API_KEY" : "EMAIL_FROM";
    console.error(
      `[tydlii welcome] ${missing} is not set; customer welcome email skipped for ${input.to}. Referral link: ${input.shareUrl}`,
    );
    return { sent: false };
  }

  let message: WelcomeMessage;
  try {
    message = await buildCustomerWelcome(input);
  } catch (error) {
    console.error("[tydlii welcome] could not build email", input.to, error instanceof Error ? error.message : "");
    return { sent: false };
  }

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
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("[tydlii welcome] resend responded", response.status, detail);
      return { sent: false };
    }
    console.log("[tydlii welcome] sent", input.to);
    return { sent: true };
  } catch {
    console.error("[tydlii welcome] resend request failed", input.to);
    return { sent: false };
  }
}
