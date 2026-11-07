# Tydlii control room

Private founder room for the Tydlii agent ecosystem. It is a path on the existing Next site, `/control`, plus a read-only fictional preview at `/control/preview`. This document is the readiness audit. It does not deploy the room or change DNS.

## What is real in this slice

- Owner sign-in with a server-checked httpOnly session. The password and session secret come from the environment. They are not in the repo. If either is missing or too short, sign-in is disconnected.
- An audit log of tasks, handoffs, approvals, and events. On Render the file is `/var/data/control-room.json` on the disk the waitlist already uses. Locally it is `data/control-room.json`, which is gitignored.
- Founder-recorded tasks, status changes, handoffs, and approval decisions. A handoff updates the log and nothing else. `notified` is always false.
- Approval kinds that would message someone, approve a cleaner, merge, deploy, purchase, charge with live Stripe, submit a store binary, change DNS, or change a routine are stored as `fails_closed`. Approving them records the decision and does not run it.
- Waitlist counts for a signed-in owner, with names, emails, phones, notes, and quotes left out.
- A MapLibre map of public Canada and Toronto coverage centres, using OpenStreetMap tiles. No live cleaner GPS.
- `/control/preview`, labeled DEMO, compiled into the app, read-only, and isolated from the owner log and the waitlist file.

## What is not real

Tydlii, Tydlii Intake, Tydlii Pipeline, and Tydlii Desk are roles:

| Role | Intended work |
| --- | --- |
| Tydlii | Coordinates the desks |
| Tydlii Intake | Waitlist triage |
| Tydlii Pipeline | Cleaner onboarding |
| Tydlii Desk | Decision desk |

They are not Cursor automations wired to this website. Cloud agent runs on this repository are one-off coding tasks. A chat in Cursor is not readable by tydlii.com. The desks in the preview hold fictional DEMO tasks so the layout can be reviewed. Idle desks in the owner room mean there is no persisted assignment.

## The missing bridge

Documented Cursor surfaces, and what this app does with them:

1. Cloud Agents API v1 can launch and stream runs with an API key from the Cursor dashboard. Its webhooks are documented as coming soon. This server does not store that API key and does not call the API. The browser must not receive it, and no button here sends a prompt as the founder.
2. Legacy v0 webhooks POST `statusChange` when a run is `ERROR` or `FINISHED`, with `X-Webhook-Signature: sha256=<hmac-sha256 of the raw body>`. `POST /api/control/bridge/cursor-status` verifies that signature only when `CONTROL_ROOM_CURSOR_WEBHOOK_SECRET` is set. Otherwise it returns disconnected and writes nothing. A verified event is an audit row. It does not assign Intake, Pipeline, or Desk, and it ignores any command field in the body.
3. Cursor Automations can be started by an inbound webhook that Cursor issues. Automations do not emit this room's handoffs. This repo has no automation id. Listing automations through an API is not available.

What a real ecosystem still needs, in order:

1. Set the owner password and session secret on the host. Until then the room is a locked gate plus the DEMO preview.
2. Keep the audit file on the persistent disk. One instance only, same rule as the waitlist. A database can replace the file later. There is no realtime channel.
3. A Tydlii account API. Mobile sign-in is still on the device. Google and Apple tokens are checked and then dropped. Intake cannot triage a real person until an account exists on the server.
4. Booking records. Quotes and add-ons are not bookings.
5. A payment record on the server, test mode first. Live Stripe stays gated. The in-app sheet refuses a `pk_live_` key and does not create a PaymentIntent.
6. Create the four specialists as actual automations or bots. Give them a signed event format for assignments and handoffs, separate from coding-run status.
7. Register the legacy status webhook only if coding-run status is useful. Do not treat `FINISHED` as a desk handoff.
8. A worker outside the browser that the founder runs, which reads approved rows and calls one sanctioned integration. Until that worker exists, execution stays fails closed. Do not put a Cursor API key in this Next process for the page to trigger.
9. Job-only GPS ingest after accounts and bookings exist. Background location stays off. The customer app does not ask for location.

Dashboard blockers are steps 1–9. App launch tasks below are a different track. Shipping a store binary does not connect the desks.

## App launch, separate from the desks

Verified against this repo, not against the Apple, Google, Stripe, or Expo dashboards:

| Area | State | Notes |
| --- | --- | --- |
| Expo project ids | Ready as identifiers | Customer `ed30d1f1-b1a8-479f-8309-a8ebd04a4cbe`, cleaner `26014761-9e69-40e9-bc62-f71e1aa8e5fe`. Do not run `eas init` again. |
| Google and Apple buttons | Scaffold | They start the provider when client ids exist. Console setup is incomplete. No client secret in git. |
| Store accounts | Gated | `eas.json` has development, preview, and production, and no submit profile. Bundle ids are not registered. Do not run `eas submit`. |
| Push | Scaffold | Project ids are present. The register URL is unset, so tokens are not sent. No APNs or FCM key in git. |
| Checkout | Scaffold | Test sheet only. A live publishable key disables pay. Nothing is charged. |
| Onboarding | Scaffold | Start onboarding opens the public Google Form. There is no review queue. |
| Mail | Scaffold | Inbox is `teamtydlii@gmail.com`. Welcome mail is optional Resend. `EMAIL_FROM` such as `Tydlii <hello@tydlii.com>` is the From identity only. |
| Privacy and terms | Scaffold | Live pages exist. They are an MVP for store review, not a lawyer's sign-off. Delete account does not call an API. |
| Quote and add-ons | Ready | Shared `packages/quote`. This room does not change prices. |
| Visit GPS | Scaffold, privacy-limited | Sample trace only. Device GPS is a plug for an active job. Background location is blocked. |

## Hosting and a later hostname

Do not change DNS from the control room. Compatible options, none of them applied here:

- Serve `/control` from the current Render Node 22 service. The marketing origin also hosts it, so it stays noindex and authenticated. `render.yaml` names the optional env vars and the store path. Values are not committed.
- Later, add `control.tydlii.com` on the Render service and a Cloudflare CNAME to the `onrender.com` target. Use DNS only until the certificate is issued, SSL/TLS Full, and no `AAAA` record. The same pattern is already documented for `tydlii.com`.
- Cloudflare Access can sit in front of that subdomain as an extra check. It does not replace the owner session, and it is not enabled.
- Leave `/control/preview` unadvertised. It is fictional and safe to open without the password. It is not a launch of the business.

The room does not send mail, merge, deploy, buy, charge, submit a binary, or edit DNS.
