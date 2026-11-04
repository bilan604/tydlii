# Tydlii mobile

Two Expo apps for a later App Store and Play Store release. They share the Tydlii colours and the smile wordmark. The live visit map is MapLibre drawing free OpenStreetMap tiles. Addresses and offers are still sample data. Checkout is a test-mode PaymentSheet stand-in. It does not call Stripe, and a live publishable key is refused.

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
3. **Pay** — a test-mode PaymentSheet. The placeholder key is `pk_test_tydlii_placeholder`. No card number is stored, nothing is charged, and a live key is refused.
4. **Live visit** — a MapLibre map of the real streets and buildings. Teal cleaner pin, ink home pin, teal route. The cleaner pin moves on a simulated GPS trace. Status chips: En route, Arrived, Cleaning, Done. ETA counts down, then the trace stops at Done.

**Settings** opens privacy, terms, delete account, and Canada coverage. Delete account returns "Not sent" until an account API exists. Coverage lists every province and territory and keeps Toronto as the only soft-launch city. Booking still uses CityPlace, King West, and Liberty Village.

"Preview a sample visit" opens the map without a booking. The sample uses the $229 site preview, not a dispatched cleaner. The customer's phone is not tracked.

## Cleaner

Entry screen with **Go online**. While online, one sample offer shows the area, home, time, and dollar share before accept or decline.

1. **Navigate** — the same live visit map. The pin moves toward the home. Chips follow En route → Arrived → Cleaning → Done. "I've arrived" still works if you mark it early.
2. **On the visit** — the map stays up. Start and Done still work by hand.
3. **Earnings** — a ledger that updates when the sample visit is marked done. Nothing is paid out.

Replay of the sample offer does not add a second payout.

## Live visit package

`apps/mobile/shared` (`@tydlii/live`) is the status machine, simulated GPS stream, device-GPS interface, and map layout used by both apps. The apps are still two Expo projects. This folder is not an npm workspace and is not part of the website install.

The preview plays a simulated GPS trace so the pin moves without a device fix. `DeviceGpsStream` is the plug for `expo-location` later: request when-in-use, watch only while the job is active, `stop()` on Done. If permission is denied, the status chips still advance and the customer still sees them.

The map is [MapLibre GL](https://maplibre.org/) drawing free [OpenStreetMap](https://tile.openstreetmap.org) raster tiles (`tile.openstreetmap.org`). Streets and building footprints come from those tiles. No API key and no Google tiles. Expo web mounts MapLibre in the page. iOS and Android, including Expo Go, mount the same MapLibre document in a WebView. Pins and the route stay `#04a3ac` and `#070707`.

`EXPO_PUBLIC_MAPS_API_KEY` is unused.

The cleaner app's `app.json` sets the iOS when-in-use purpose string and the Android fine/coarse permissions. Background location is blocked. The customer app does not ask for location.

## Store scaffolding

`eas.json` in each app has `preview` (internal APK) and `production` (store app bundle) build profiles. There is no `submit` profile. Do not run `eas submit`.

Copy `apps/mobile/.env.example` to `apps/mobile/customer/.env` only if you want to replace the placeholder `pk_test_` key. The map does not read it.

## Not in this version

- Chat
- Background location, or GPS while a job is Done
- A live Stripe key, a real PaymentIntent, or a card vault
- A drawn map, or a native maps SDK, in place of MapLibre
- A paid maps key
- A real account API, push, or a shared backend
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

TestFlight and Play Console need a founder's OK first: legal name, bundle ids, icons, privacy labels, and any real payments or maps. These projects include EAS preview and production build sketches and do not include a submit profile. Uploading a binary is out of scope until that approval is explicit. Do not run `eas submit`.

Store builds, when they are approved, are two apps (`com.tydlii.customer` and `com.tydlii.cleaner`), not one listing with a hidden switch.
