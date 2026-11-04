# Tydlii mobile

Two Expo apps for a later App Store and Play Store release. They share the Tydlii colours, the smile wordmark, and `@tydlii/live` for the live visit, Canada coverage, and Stripe test-mode checkout. The live visit map is MapLibre drawing free OpenStreetMap tiles. Addresses and offers are still sample data. Checkout is a test-mode PaymentSheet stand-in. It does not call Stripe, and a live publishable key is refused.

| App | Path | Bundle id (placeholder) |
| --- | --- | --- |
| Customer | `apps/mobile/customer` | `com.tydlii.customer` |
| Cleaner | `apps/mobile/cleaner` | `com.tydlii.cleaner` |

The marketing site stays at the repo root. Do not add these apps to the root npm workspaces. `npm ci` and `npm run build` there are still the Next.js site only. Root `npm test` also runs the shared live-visit, map-policy, coverage, payment, account, and store-sketch tests.

## Same person, two apps

Keep both apps. A customer and a cleaner stay separate listings. The same person can install both later. A later single binary could import `@tydlii/live` and choose a role after an account exists. That switch is not in this version.

## Brand

| Token | Hex |
| --- | --- |
| Ink | `#070707` |
| Teal | `#04a3ac` |
| Sage | `#5c9396` |
| Mist | `#e5f3f4` |

The smile wordmark is copied from `public/brand/wordmark.png` (ink) and `public/brand/wordmark-light.png` (on ink). The app icon is `public/brand/app-icon.png`. Replace those files in each app's `assets/` if the master artwork changes.

Quote options and prices come from `packages/quote` (`@tydlii/quote`), the same package the website uses. A Liberty Village 2-bedroom, 800–999 sq ft, bi-weekly, maintained, is **$229 + HST** per plan visit ($258.77 with HST). The first visit is **$279 + HST**. The cleaner sample offer pays **67%** of the $229 plan price, **$153.43**.

## Customer

Entry screen, then:

1. **Book** — street address, launch neighbourhood (CityPlace, King West, Liberty Village), sq ft band, beds and baths, frequency, condition, and the flat price.
2. **Schedule** — a day and an arrival window.
3. **Pay** — Stripe PaymentSheet stand-in in test mode. The button opens a sheet, confirms a placeholder card, and does not call Stripe. `pk_live_` keys are refused, including odd casing and a value that also contains `pk_test_`. Nothing is charged.
4. **Live visit** — a MapLibre map of the real streets and buildings. Teal cleaner pin, ink home pin, teal route. The cleaner pin moves on a simulated GPS trace. Status chips: En route, Arrived, Cleaning, Done. ETA counts down, then the trace stops at Done.

**Settings** opens privacy, terms, delete account, and Canada coverage. Delete account returns "Not sent" until an account API exists. Coverage lists every province and territory and keeps Toronto as the only soft-launch city. Booking still uses CityPlace, King West, and Liberty Village.

"Preview a sample visit" opens the map without a booking. The sample uses the $229 site preview, not a dispatched cleaner. The customer's phone is not tracked.

## Cleaner

Entry screen with **Go online**. While online, one sample offer shows the area, home, time, and dollar share before accept or decline.

1. **Navigate** — the same live visit map. The pin moves toward the home. Chips follow En route → Arrived → Cleaning → Done. "I've arrived" still works if you mark it early.
2. **On the visit** — the map stays up. Start and Done still work by hand.
3. **Earnings** — a ledger that updates when the sample visit is marked done. Nothing is paid out.

Replay of the sample offer does not add a second payout. Settings matches the customer app. This app does not take a card.

## Live visit package

`apps/mobile/shared` (`@tydlii/live`) is the status machine, simulated GPS stream, device-GPS interface, map layout, Canada coverage model, Stripe test-mode sheet, and account-deletion stub used by both apps. The apps are still two Expo projects. This folder is not an npm workspace and is not part of the website install.

The preview plays a simulated GPS trace so the pin moves without a device fix. `DeviceGpsStream` is the plug for `expo-location` later: request when-in-use, watch only while the job is active, `stop()` on Done. If permission is denied, the status chips still advance and the customer still sees them.

The map is [MapLibre GL](https://maplibre.org/) drawing free [OpenStreetMap](https://tile.openstreetmap.org) raster tiles (`tile.openstreetmap.org`). Streets and building footprints come from those tiles. No API key and no Google tiles. Expo web mounts MapLibre in the page. iOS and Android, including Expo Go, mount the same MapLibre document in a WebView. Pins and the route stay `#04a3ac` and `#070707`.

`EXPO_PUBLIC_MAPS_API_KEY` is unused. Do not add a paid maps SDK.

The cleaner app's `app.json` sets the iOS when-in-use purpose string and the Android fine/coarse permissions. Background location is blocked. The customer app does not ask for location.

## Payments

Customer checkout only. Copy `apps/mobile/.env.example` to `apps/mobile/customer/.env` if you want a local override. An empty value uses `pk_test_tydlii_placeholder`.

| Rule | What happens |
| --- | --- |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` unset or empty | Placeholder `pk_test_` key. The sheet opens. |
| `pk_test_…` from the Stripe dashboard, test mode | The sheet opens. Still no PaymentIntent and no charge. |
| `pk_live_…`, any casing, including a value that also contains `pk_test_` | Refused. The pay button stays disabled and the reason is shown. |
| `sk_` or any other key | Refused. Secret keys do not belong in the app. |

`resolveStripeTestConfig` and `createTestPaymentSheet` are the path. `init` / `present` / `cancel` match the shape of `@stripe/stripe-react-native` PaymentSheet enough to swap later. This build does not import that SDK, does not create a PaymentIntent, and does not talk to Stripe.

Both EAS profiles on the customer app set the placeholder. Leave them on `pk_test_` until a test account exists. Do not replace them with `pk_live_`. The cleaner profiles do not set a Stripe key.

## Canada coverage

`PROVINCES` lists all 13 provinces and territories. Toronto, Ontario is the only soft-launch city and the default. Launch neighbourhoods match the website: CityPlace, King West, Liberty Village. Yonge–Eglinton and North York Centre are later in Toronto. Other cities are planned.

## Not in this version

- Chat
- Background location, or GPS while a job is Done
- A live Stripe charge, a PaymentIntent, or a secret key in the app
- A drawn map, or a native maps SDK, in place of MapLibre
- A paid maps key
- A real account API, push, or a shared backend
- One binary with a customer/cleaner switch
- Store submit (`eas submit` is not configured, and `eas.json` has no submit profile)

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

## EAS builds

`eas.json` in each app sketches two build profiles and nothing else:

| Profile | Distribution | Android artifact | Stripe |
| --- | --- | --- | --- |
| `preview` | internal (ad hoc on iOS, sideload APK on Android) | APK | Customer app only, `pk_test_tydlii_placeholder` |
| `production` | store (the binary that can later go to TestFlight or Play) | app bundle | Customer app only, same placeholder |

There is no `submit` key. Do not run `eas submit`. Do not upload a binary until the founder says so. Neither profile needs a maps key.

### TestFlight, after an Apple Developer account

1. Enroll in the Apple Developer Program and accept the current agreements in App Store Connect.
2. Create two apps, Tydlii (`com.tydlii.customer`) and Tydlii Cleaner (`com.tydlii.cleaner`), or change the bundle ids in `app.json` first if those placeholders are not the ones you want. They are not registered yet.
3. `npm i -g eas-cli`, then `eas login` with the Expo account that should own the projects. In each app directory, `eas init` attaches a project and writes `extra.eas.projectId`. Do not invent that id.
4. `eas build -p ios --profile production` makes a store-signed binary. It does not upload. `preview` is an internal install for registered devices, not TestFlight.
5. After you have looked at the binary, add a submit profile and only then run `eas submit`. That profile is intentionally absent from this repo.
6. In App Store Connect, put the uploaded build on an internal TestFlight group. External TestFlight needs Beta App Review, a privacy policy URL, and export compliance. The apps already link to `https://tydlii.com/privacy` and `https://tydlii.com/terms`.
7. Android waits on a Play Console account. `eas build -p android --profile production` makes an AAB. Uploading it is the same missing submit step.
8. Keep `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` on a `pk_test_` value. Swap the placeholder for a real test publishable key only after the Stripe account exists. A `pk_live_` value will not open the sheet.
