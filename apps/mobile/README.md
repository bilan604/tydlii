# Tydlii mobile

Two Expo apps for a later App Store and Play Store release. They share the Tydlii colours and the smile wordmark. They do not talk to the website, Stripe, or a maps provider. Every address, offer, payment, and map in these apps is sample data.

| App | Path | Bundle id (placeholder) |
| --- | --- | --- |
| Customer | `apps/mobile/customer` | `com.tydlii.customer` |
| Cleaner | `apps/mobile/cleaner` | `com.tydlii.cleaner` |

The marketing site stays at the repo root. Do not add these apps to the root npm workspaces. `npm ci` and `npm run build` there are still the Next.js site only.

## Brand

| Token | Hex |
| --- | --- |
| Ink | `#070707` |
| Teal | `#04a3ac` |
| Sage | `#5c9396` |
| Mist | `#e5f3f4` |

The smile wordmark is copied from `public/brand/wordmark.png` (ink) and `public/brand/wordmark-light.png` (on ink). The app icon is `public/brand/app-icon.png`. Replace those files in each app's `assets/` if the master artwork changes.

Quote math in each app's `lib/pricing.ts` is a copy of the website `lib/pricing.ts`. A Liberty Village 2-bedroom, 800–999 sq ft, every 2 weeks, maintained, is **$229 + HST** per plan visit. The cleaner sample offer pays **67%** of that, **$153.43**.

## Customer

Entry screen, then:

1. **Book** — street address, launch neighbourhood (CityPlace, King West, Liberty Village), sq ft band, beds and baths, frequency, condition, and the flat price.
2. **Schedule** — a day and an arrival window.
3. **Pay** — a checkout stub. No card number. Nothing is charged.
4. **Live visit** — home pin, cleaner pin, and route. The cleaner pin moves on a simulated GPS trace. Status chips: En route, Arrived, Cleaning, Done. ETA counts down, then the trace stops at Done.

"Preview a sample visit" opens the map without a booking. The sample uses the $229 site preview, not a dispatched cleaner. The customer's phone is not tracked.

## Cleaner

Entry screen with **Go online**. While online, one sample offer shows the area, home, time, and dollar share before accept or decline.

1. **Navigate** — the same live visit map. The pin moves toward the home. Chips follow En route → Arrived → Cleaning → Done. "I've arrived" still works if you mark it early.
2. **On the visit** — the map stays up. Start and Done still work by hand.
3. **Earnings** — a ledger that updates when the sample visit is marked done. Nothing is paid out.

Replay of the sample offer does not add a second payout.

## Live visit package

`apps/mobile/shared` (`@tydlii/live`) is the status machine, simulated GPS stream, device-GPS interface, and map layout used by both apps. The apps are still two Expo projects. This folder is not an npm workspace and is not part of the website install.

The preview plays a simulated trace so Expo web and CI need no paid key. `DeviceGpsStream` is the plug for `expo-location` later: request when-in-use, watch only while the job is active, `stop()` on Done. If permission is denied, the status chips still advance and the customer still sees them.

`EXPO_PUBLIC_MAPS_API_KEY` is reserved for a native map later. Leave it empty. This preview draws the route from coordinates and does not call Google, MapKit, or another tile host.

The cleaner app's `app.json` sets the iOS when-in-use purpose string and the Android fine/coarse permissions. Background location is blocked. The customer app does not ask for location.

## Not in this version

- Chat
- Background location, or GPS while a job is Done
- Stripe, card entry, or another payment provider
- A maps SDK or a live maps key
- Accounts, push, or a shared backend
- Store submit (`eas submit` is not configured)

## Run on Expo Go or a simulator

Requires Node.js 22+. Use Expo Go that supports **SDK 57** (the SDK these projects pin). One Metro server at a time, or start the second with `--port 8082`.

Customer:

```bash
cd apps/mobile/customer
npm ci
npx expo start
```

Cleaner:

```bash
cd apps/mobile/cleaner
npm ci
npx expo start
```

Then:

- **Phone:** install Expo Go, join the same network as the computer, and scan the QR code. If the phone cannot see the computer, `npx expo start --tunnel` can prompt to install `@expo/ngrok`.
- **iOS simulator:** macOS with Xcode. In the Expo terminal, press `i`.
- **Android emulator:** Android Studio, with an emulator already running. Press `a`.
- **Web preview:** press `w`. This is a convenience view of the same screens, not the store build.

`npm run typecheck` in each app runs `tsc --noEmit`.

## TestFlight and Play Store

Do not submit a build from this scaffold.

TestFlight and Play Console need a founder's OK first: legal name, bundle ids, icons, privacy labels, and any real payments or maps. These projects do not include an EAS submit profile. Uploading a binary is out of scope until that approval is explicit.

Store builds, when they are approved, are two apps (`com.tydlii.customer` and `com.tydlii.cleaner`), not one listing with a hidden switch.
