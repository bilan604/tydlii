import { access } from "node:fs/promises";
import { LEGAL_EMAIL } from "../legal";
import { waitlistStorePath } from "../waitlist-store";
import { bridgeStatus, webhookSecretConfigured, type BridgeStatus } from "./bridge";
import { authStatus } from "./auth";
import { controlRoomStorePath } from "./store";

export type ReadinessState = "ready" | "scaffold" | "missing" | "gated";
export type ReadinessTrack = "dashboard" | "app-launch";

export type ReadinessItem = {
  id: string;
  area: string;
  track: ReadinessTrack;
  state: ReadinessState;
  finding: string;
  next: string;
};

export type ConnectionRow = {
  id: string;
  label: string;
  state: "connected" | "optional" | "disconnected" | "gated";
  detail: string;
};

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readinessProbe(env: NodeJS.ProcessEnv = process.env): Promise<{
  ownerConfigured: boolean;
  webhookConfigured: boolean;
  resend: boolean;
  emailFrom: boolean;
  web3forms: boolean;
  waitlistFile: boolean;
  controlFile: boolean;
}> {
  const [waitlistFile, controlFile] = await Promise.all([
    exists(waitlistStorePath(env)),
    exists(controlRoomStorePath(env)),
  ]);
  return {
    ownerConfigured: authStatus(env).configured,
    webhookConfigured: webhookSecretConfigured(env),
    resend: Boolean(env.RESEND_API_KEY?.trim()),
    emailFrom: Boolean(env.EMAIL_FROM?.trim()),
    web3forms: Boolean(env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY?.trim() || env.WAITLIST_WEB3FORMS_ACCESS_KEY?.trim()),
    waitlistFile,
    controlFile,
  };
}

export function readinessItems(probe: Awaited<ReturnType<typeof readinessProbe>>): ReadinessItem[] {
  return [
    {
      id: "owner-auth",
      area: "Owner authentication",
      track: "dashboard",
      state: probe.ownerConfigured ? "ready" : "missing",
      finding: probe.ownerConfigured
        ? "Owner password and session secret are set. Sessions are httpOnly cookies checked on the server."
        : "Owner sign-in is implemented and disconnected until both secrets are set. The page does not trust a client-side flag.",
      next: "Set CONTROL_ROOM_OWNER_PASSWORD (12+ characters) and CONTROL_ROOM_SESSION_SECRET (32+ characters) on the server only.",
    },
    {
      id: "audit-log",
      area: "Task, handoff, and approval log",
      track: "dashboard",
      state: "scaffold",
      finding: probe.controlFile
        ? "A control-room JSON file is present. It is a single-file log, same durability rule as the waitlist, with no realtime feed."
        : "The audit log is implemented. No file exists yet, so the owner room starts empty. Empty means no persisted work, not a hidden live desk.",
      next: "On Render, keep CONTROL_ROOM_STORE_PATH on the /var/data disk. A database and a realtime subscription are still future work.",
    },
    {
      id: "specialists",
      area: "Intake, Pipeline, Desk",
      track: "dashboard",
      state: "missing",
      finding:
        "Tydlii coordinates. Tydlii Intake is waitlist triage, Tydlii Pipeline is cleaner onboarding, and Tydlii Desk is the decision desk. Those names are roles in this room. They are not running Cursor automations connected to the site.",
      next: "Create the specialists as real automations or bots, then give them a signed way to append lifecycle events. Do not treat coding-agent chats as those desks.",
    },
    {
      id: "event-bridge",
      area: "Agent event bridge",
      track: "dashboard",
      state: probe.webhookConfigured ? "scaffold" : "missing",
      finding: probe.webhookConfigured
        ? "A legacy status webhook secret is set. Verified ERROR or FINISHED events can be logged. That still does not move a specialist."
        : "No event bridge. Cursor chat is not readable here. Cloud Agents API v1 webhooks are documented as coming soon. Legacy v0 can POST statusChange only. Automations accept inbound triggers and do not emit this room's handoffs.",
      next: "Set CONTROL_ROOM_CURSOR_WEBHOOK_SECRET and register POST /api/control/bridge/cursor-status only if a legacy webhook is wanted. Specialist handoffs still need their own signed events.",
    },
    {
      id: "command-worker",
      area: "Command bridge",
      track: "dashboard",
      state: "missing",
      finding:
        "The browser cannot send a prompt as the founder. This server does not store a Cursor API key and does not call the Cloud Agents API. Approved rows fail closed.",
      next: "A separate worker the founder runs can later pull approved rows and call one sanctioned integration. Until that worker exists, execution stays off.",
    },
    {
      id: "accounts",
      area: "Customer and cleaner accounts",
      track: "dashboard",
      state: "missing",
      finding:
        "Mobile sign-in stores a session on the device. Google and Apple tokens are checked and dropped. There is no Tydlii account API, so a task cannot be tied to a real person.",
      next: "Add a server account before Intake triages real waitlist rows or Pipeline reviews a real cleaner.",
    },
    {
      id: "bookings",
      area: "Bookings",
      track: "dashboard",
      state: "missing",
      finding: "Quotes and add-ons exist. A quote is not a booking. There is no booking store, dispatch, or job id.",
      next: "Persist bookings on the server before any desk can claim a visit is scheduled.",
    },
    {
      id: "payments",
      area: "Payments",
      track: "dashboard",
      state: "gated",
      finding:
        "The customer app has a test-mode sheet that refuses a live publishable key and does not call Stripe. Referral credits wait for a future paid-clean path. This room has no ledger.",
      next: "Add server-side test payments before any live key. Keep live Stripe founder-gated and out of this room.",
    },
    {
      id: "gps",
      area: "Live map feed",
      track: "dashboard",
      state: "missing",
      finding:
        "The control-room map is MapLibre with OpenStreetMap tiles and public Canada coverage centres. No cleaner GPS is ingested. Background location is blocked.",
      next: "Ingest job-only when-in-use points after accounts and bookings exist. Do not put customer tracking on this map.",
    },
    {
      id: "hosting",
      area: "Private hosting",
      track: "dashboard",
      state: "scaffold",
      finding:
        "The room is a path on the existing Next server. It is noindex and owner-gated when secrets exist. No separate hostname and no DNS change is included.",
      next: "Later, a control.tydlii.com CNAME can point at Render through Cloudflare DNS. Do that in the dashboards, not from here.",
    },
    {
      id: "eas-ids",
      area: "Expo project ids",
      track: "app-launch",
      state: "ready",
      finding:
        "Customer and cleaner EAS project UUIDs are committed. Push registration can see them. This is not store submission.",
      next: "Do not run eas init again. Paste the same UUID into a gitignored .env for a local phone build.",
    },
    {
      id: "oauth-consoles",
      area: "Google and Apple sign-in",
      track: "app-launch",
      state: "scaffold",
      finding:
        "The buttons start the provider when client ids exist and explain the gap when they do not. Console setup is incomplete. No client secret is in the repo.",
      next: "Create the Google and Apple clients, then set the public client ids at prebuild. Verify Apple's keys on a future server.",
    },
    {
      id: "store-accounts",
      area: "App Store and Play",
      track: "app-launch",
      state: "gated",
      finding:
        "eas.json has development, preview, and production profiles and no submit profile. Bundle ids are not registered. Play Console is not required to build an AAB and is required to upload.",
      next: "Enroll Apple Developer, create the two app records, and add a submit profile only when the founder asks. Do not run eas submit.",
    },
    {
      id: "push",
      area: "Job alerts",
      track: "app-launch",
      state: "scaffold",
      finding:
        "Settings can ask for notification permission. The register URL is unset, so tokens are not sent. No APNs key or FCM service account is in the repo.",
      next: "After accounts exist, store tokens on the server and send through Expo. Keep credentials in EAS, not git.",
    },
    {
      id: "stripe-app",
      area: "In-app checkout",
      track: "app-launch",
      state: "scaffold",
      finding: "Checkout shows a placeholder test sheet. A pk_live_ key disables the button. Nothing is charged.",
      next: "Swap the placeholder for a real pk_test_ key only after a Stripe test account exists. Leave pk_live_ refused.",
    },
    {
      id: "onboarding",
      area: "Cleaner onboarding",
      track: "app-launch",
      state: "scaffold",
      finding:
        "Start onboarding opens the public Google Form. The cleaner welcome uses that same link. There is no in-app review queue.",
      next: "Pipeline can triage that form only after responses land in a server the founder controls. This room cannot approve a cleaner.",
    },
    {
      id: "mail",
      area: "Mail",
      track: "app-launch",
      state: probe.resend && probe.emailFrom ? "scaffold" : "scaffold",
      finding: `The business inbox is ${LEGAL_EMAIL}. Waitlist alerts go there from the browser via Web3Forms${probe.web3forms ? " (access key is set)" : " (access key is not visible in this environment)"}. Welcome mail is optional Resend${probe.resend && probe.emailFrom ? " and both variables are set" : " and is skipped until RESEND_API_KEY and EMAIL_FROM are set"}. EMAIL_FROM is the From identity only.`,
      next: "Keep replies on the Gmail inbox. Do not add a send button to the control room.",
    },
    {
      id: "legal",
      area: "Privacy and terms",
      track: "app-launch",
      state: "scaffold",
      finding:
        "tydlii.com/privacy and /terms are the pages the apps open. They are an MVP for store review, not a lawyer's sign-off. Delete account clears the device and does not call an API.",
      next: "Have the copy reviewed before relying on it. A server deletion path waits on accounts.",
    },
    {
      id: "quote",
      area: "Quote and add-ons",
      track: "app-launch",
      state: "ready",
      finding: "The site and both apps share packages/quote. This control room does not change prices, add-ons, or the landing page.",
      next: "Leave the quote table as the only price source.",
    },
    {
      id: "gps-privacy",
      area: "Visit GPS privacy",
      track: "app-launch",
      state: "scaffold",
      finding:
        "The sample pin moves on a simulated trace. Device GPS is a plug for an active job. Background location stays off. The customer phone is not tracked.",
      next: "Wire when-in-use location only while a real job is active, and stop it at Done.",
    },
  ];
}

export function connectionRows(
  probe: Awaited<ReturnType<typeof readinessProbe>>,
  bridge: BridgeStatus,
): ConnectionRow[] {
  return [
    {
      id: "owner",
      label: "Owner session",
      state: probe.ownerConfigured ? "connected" : "disconnected",
      detail: probe.ownerConfigured ? "Server session cookie is configured." : "Sign-in is disabled until the owner secrets are set.",
    },
    {
      id: "bridge",
      label: "Agent event bridge",
      state: bridge.state === "listening" ? "optional" : "disconnected",
      detail: bridge.summary,
    },
    {
      id: "commands",
      label: "Agent commands",
      state: "disconnected",
      detail: "No browser control can prompt Cursor or the specialists.",
    },
    {
      id: "waitlist",
      label: "Waitlist file",
      state: probe.waitlistFile ? "connected" : "disconnected",
      detail: probe.waitlistFile
        ? "Counts only. Names, emails, phones, and notes are not shown."
        : "No waitlist file in this environment. Counts stay unavailable.",
    },
    {
      id: "bookings",
      label: "Bookings",
      state: "disconnected",
      detail: "No booking source.",
    },
    {
      id: "payments",
      label: "Payments",
      state: "gated",
      detail: "No ledger. Live Stripe stays gated.",
    },
    {
      id: "gps",
      label: "Live cleaner GPS",
      state: "disconnected",
      detail: "Coverage map only.",
    },
    {
      id: "mail",
      label: "Outbound mail from this room",
      state: "disconnected",
      detail: `Not connected. Inbox remains ${LEGAL_EMAIL}.`,
    },
  ];
}

export const HOSTING_OPTIONS = [
  {
    id: "same-service",
    title: "Same Render service, path /control",
    body: "Works with the current Node 22 Next server. Owner secrets and the JSON file must sit on the host. The marketing origin would also serve the room, so keep it noindex and authenticated.",
  },
  {
    id: "subdomain",
    title: "control.tydlii.com later",
    body: "Add the hostname on the Render service, then a Cloudflare CNAME to the onrender.com target. Use DNS only until the certificate is issued, SSL/TLS Full, and no AAAA record. This change does not create that record.",
  },
  {
    id: "access",
    title: "Cloudflare Access in front",
    body: "An extra identity check at the edge can sit in front of the subdomain. It does not replace the app's owner session, and it is not turned on here.",
  },
  {
    id: "preview",
    title: "DEMO preview",
    body: "/control/preview is fictional, read-only, and noindex. It is safe to open without the owner password. It is not a public launch of the business.",
  },
] as const;
