# Tydlii

Marketing and waitlist site for [tydlii.com](https://tydlii.com). The homepage is the Option A landing: a navy hero with teal and blue polygons on the right, the smile wordmark, five guarantees, and an audience toggle (`I need cleaning` / `I want to clean`). Customers get the instant quote, Tap. Book. Relax., and a single-neighbourhood waitlist. Cleaners get the earnings band and a multi-select neighbourhood waitlist.

The promise on the site is a **Tydlii-certified cleaner in the booked window**, and a **re-clean if a Standard clean is missed**. It is not a same-cleaner or preferred-cleaner promise.

## Local

Requires Node.js 22+.

```bash
npm ci
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
npm start
```

`npm start` listens on `0.0.0.0` and `$PORT` (default 3000), which is what Render expects.

## Waitlist endpoint

`POST /api/waitlist` accepts JSON.

```json
{
  "type": "cleaner",
  "name": "Jordan Hale",
  "email": "jordan@example.com",
  "phone": "",
  "neighbourhoods": ["CityPlace", "King West", "Liberty Village"],
  "notes": "",
  "consent": true
}
```

- `type` is `customer` or `cleaner`.
- **Cleaners send `neighbourhoods` as an array.** One area is allowed. Several are the normal case. The form is a pill multi-select — CityPlace, King West, Liberty Village, Yonge–Eglinton, North York Centre, and Other — not a single dropdown.
- Customers send one neighbourhood in that same array. A postal code with no neighbourhood is stored as `Other`, and the postal code is written into `notes`.
- Customer payloads include `quote`, the instant-quote object from the calculator.
- A non-empty `website` field is a honeypot. The route returns 200 and does not store it.

A non-spam signup is emailed from the **browser** to [Web3Forms](https://web3forms.com), which delivers it to the inbox tied to the access key (`teamtydlii@gmail.com`). The form shows success only after Web3Forms accepts that request. The message lists type, name, email, phone, neighbourhoods, notes, quote summary, `createdAt`, and `source: "tydlii.com"`. Reply-to is the signup email. Subject is `[Tydlii waitlist] {type} — {email}`.

The browser posts straight to `https://api.web3forms.com/submit`. Render's outbound IP is blocked for server-side Web3Forms on the free plan, so `/api/waitlist` does not send the email and a Web3Forms failure there cannot return 502. After the browser send succeeds, the form also notifies `/api/waitlist` in the background. That call only validates, logs, and optionally forwards `WAITLIST_WEBHOOK_URL`. If it fails, the signup still counts.

### `NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY`

The Web3Forms access key. It is **public** and Next.js copies it into the client bundle at **build** time. Set it in Render, then redeploy so `npm run build` runs again. A restart without a rebuild keeps the old bundle.

If this is unset, the homepage falls back to `WAITLIST_WEB3FORMS_ACCESS_KEY` and passes that value into the form. That fallback is also visible to the browser. The server still does not call Web3Forms.

### `WAITLIST_WEBHOOK_URL`

Optional. `POST /api/waitlist` forwards the JSON to this `http` or `https` URL. A bad URL, a redirect, or a non-2xx response is logged and does **not** fail the signup. Leave it empty. Do not point it at a Google Apps Script web app: `/exec` returns 302 and the follow-up request fails.

Example:

```bash
curl -s -X POST http://localhost:3000/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"type":"cleaner","name":"Ada Lovelace","email":"ada@example.com","neighbourhoods":["CityPlace","King West"],"consent":true}'
```

## Quote math

Implemented in `lib/pricing.ts` and covered by `lib/pricing.test.ts`.

| Band | Home size | Base |
| --- | --- | --- |
| A | Under 600 sq ft | $165 |
| B | 600–799 sq ft | $189 |
| C | 800–999 sq ft | $209 |
| D | 1,000–1,299 sq ft | $239 |
| E | 1,300–1,599 sq ft | $269 |
| F | 1,600–1,999 sq ft | $299 |
| G | 2,000–2,499 sq ft | $339 |
| H | 2,500+ sq ft | Custom, no guessed price |

The dollar bases, add-ons, and multipliers are the brief. The square-foot labels are the public names for bands A–H. Edit `SQFT_BANDS` if the cut points change.

- +$20 per bedroom after the first (a studio adds nothing and does not subtract)
- +$30 per full bath after the first
- +$15 per half bath
- Weekly ×0.91, every 2 weeks ×1, every 4 weeks ×1.1, one-time ×1.22
- Lived-in ×1.1
- Overdue first visit = one-time × 1.4 (a reset). Any other first visit is the one-time rate.
- `to9` rounds the pre-tax charge to the nearest amount ending in 9
- The page shows that amount before HST and with 13% HST

## Deploy on Render

This is a Node web service. The waitlist email is sent by the browser; `/api/waitlist` only logs a copy.

[`render.yaml`](render.yaml) is a Render Blueprint:

- Runtime: Node 22
- Build: `npm ci && npm run build`
- Start: `npm start`
- Health check: `/`
- Region: Ohio (change it if you prefer)
- Plan: `starter` (change the plan to match the account)

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint** and select the repo. Render reads `render.yaml`.
   Or create a **Web Service** manually with the build and start commands above, and the root directory as the repo root.
3. Set `NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY` to the Web3Forms access key for `teamtydlii@gmail.com`. This value is public and is compiled into the client bundle. Leave `WAITLIST_WEBHOOK_URL` empty.
4. Redeploy so the build picks up the public key. A restart that skips the build does not update it.

The key already stored as `WAITLIST_WEB3FORMS_ACCESS_KEY` is still read by the homepage if the public variable is empty, so the current Render env is enough for the next build. Prefer the `NEXT_PUBLIC_` name going forward. After deploy, a signup should arrive at `teamtydlii@gmail.com` without a server-side Web3Forms call.

## Cloudflare DNS for tydlii.com

Use Cloudflare for DNS. Render issues the certificate. Follow [Render’s Cloudflare guide](https://render.com/docs/configure-cloudflare-dns).

1. Add the domain `tydlii.com` to Cloudflare if it is not there already.
2. In Render, open the service → **Settings → Custom Domains**. Add `tydlii.com` and `www.tydlii.com`. Render shows the `onrender.com` hostname to use as the CNAME target. Copy that exact hostname.
3. In Cloudflare, open **SSL/TLS → Overview** and set encryption to **Full**.
4. Open **DNS → Records**. Remove any `AAAA` records for these names. Render does not serve IPv6, and leftover `AAAA` records misroute the domain.
5. Add two CNAME records. Cloudflare flattens a CNAME at the zone apex, so the root does not need an A record.

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `@` | `your-service.onrender.com` | DNS only (grey cloud) |
| CNAME | `www` | `your-service.onrender.com` | DNS only (grey cloud) |

6. Wait for DNS, then in Render choose **Verify** on each custom domain. Leave the records on **DNS only** until Render shows the certificate as issued.
7. After the certificates are valid, you can switch both records to **Proxied** (orange cloud). Keep SSL/TLS on **Full**. If verification fails while proxied, switch back to DNS only, verify, then proxy again.

`https://tydlii.com` and `https://www.tydlii.com` should both open the site. Redirect one host to the other in Render (custom domain settings) or with a Cloudflare redirect rule so there is a single canonical host. The site’s canonical URL is `https://tydlii.com`.

## What’s in the repo

- `app/` — Next.js App Router pages, favicon, and `POST /api/waitlist`
- `components/` — Option A landing: hero, five pillars, quote, how it works, and the two waitlists
- `lib/pricing.ts` — quote math
- `public/brand/` — smile wordmark (navy and white) and the house icon
- `public/og-option-a.png` — share image (ink, teal, blue). `og:image` / `twitter:image` use `https://tydlii.com/og-option-a.png?v=option-a-20261025` so link previews do not reuse the old navy file. `public/og.png` is the same art.
- `public/favicon.ico` and `app/icon.png` — from the white-house icon
