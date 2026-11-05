# Tydlii mobile

Two Expo apps for a later App Store and Play Store release. They share the Tydlii colours, the smile wordmark, and `@tydlii/live` for the live visit, Canada coverage, and Stripe test-mode checkout. The live visit map is MapLibre drawing free OpenStreetMap tiles. Addresses and offers are still sample data. Checkout is a test-mode PaymentSheet stand-in. It does not call Stripe, and a live publishable key is refused.

| App | Path | Bundle id (placeholder) |
| --- | --- | --- |
| Customer | `apps/mobile/customer` | `com.tydlii.customer` |
| Cleaner | `apps/mobile/cleaner` | `com.tydlii.cleaner` |

The marketing site stays at the repo root. Do not add these apps to the root npm workspaces. `npm ci` and `npm run build` there are still the Next.js site only. Root `npm test` also runs the shared live-visit, map-policy, coverage, payment, account, and store-sketch tests.

## Same person, two installs, one account

Keep both listings. Sign-in is in `@tydlii/auth` (`apps/mobile/auth`). Email and password, or an email code shown on the device, or Google and Apple. Nothing is emailed. The session is still stored only on this device. Google and Apple are contacted to confirm the sign-in. Tydlii is not.

After sign-in, **Customer** and **Cleaner** sit on the home screen. Switching changes that install's mode and adds the role to the same email. The customer install's cleaner mode opens the sample live visit. The cleaner install's customer mode switches the home and does not ask for location. Each install has its own SecureStore (localStorage in the web preview), so the account is not shared across the two apps until a server exists.

Session keys: `tydlii.auth.vault.v1` and `tydlii.auth.session.v1.customer` or `.cleaner`. Phone builds use SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. The web preview uses localStorage. Passwords are salted SHA-256 on the device. That is not a production password store.

**Continue with Google** and **Continue with Apple** are on Sign in and Create account for both apps. They are not placeholders. A press either opens the provider or explains the missing value.

| Platform | What the button does | What you paste |
| --- | --- | --- |
| iOS Google | AuthSession, code + PKCE, then Google's token info endpoint. Redirect is `com.googleusercontent.apps.<prefix>:/oauth2redirect`. | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Android Google | Same, with the Android client id's reversed scheme. | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |
| Web Google | AuthSession id token, then token info. | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| iOS Apple | System Sign in with Apple sheet. Audience is the bundle id (`com.tydlii.customer` or `com.tydlii.cleaner`). Expo Go's audience `host.exp.exponent` is accepted too. | Nothing. The bundle id is already in `app.json`. |
| Android and web Apple | AuthSession to `https://appleid.apple.com/auth/authorize`. | `EXPO_PUBLIC_APPLE_SERVICE_ID` and `EXPO_PUBLIC_APPLE_REDIRECT_URI` (https, or `http://localhost` for the web preview) |

Client ids must look like `123456789012-abc.apps.googleusercontent.com`. A placeholder does not start the flow. No client secret, `.p8`, or private key belongs in the app or in git. Copy the names from `apps/mobile/auth/.env.example` into `apps/mobile/customer/.env` and `apps/mobile/cleaner/.env`. Leave the values empty until the consoles exist.

Google on a phone cannot return to Expo Go, because Expo Go cannot register the reversed client-id scheme. Set the client id, then use a development or preview build. `app.config.ts` adds that scheme when the env var is present at prebuild. The web preview can use the web client id. Add the web redirect (often `http://localhost:8081/auth/callback`) on the Web OAuth client. iOS and Android clients use the reversed scheme above. The Android client also needs the package name and, later, the SHA-1 from EAS credentials. That SHA-1 is not required to merge this code.

Apple on iOS works in Expo Go. A later standalone build needs the Sign in with Apple capability on the bundle id. This repo already sets `ios.usesAppleSignIn` and the `expo-apple-authentication` plugin. Android and web need a Services ID and an https return URL. A custom scheme is not a valid Apple return URL.

The id token and access token are checked and then dropped. The device stores the same local session as email sign-in, including the Customer | Cleaner switch. A future account API should verify Apple's signature with `https://appleid.apple.com/auth/keys` before it trusts the token. This build does not send the token to Tydlii.

A generic hosted provider still stays off unless both `EXPO_PUBLIC_AUTH_ISSUER` and `EXPO_PUBLIC_AUTH_CLIENT_ID` are set. That path does not exchange a code and does not create a session. Google and Apple do not use those two variables.

Privacy Policy and Terms of Service open [https://tydlii.com/privacy](https://tydlii.com/privacy) and [https://tydlii.com/terms](https://tydlii.com/terms) in the in-app browser. Those links are on Sign in, Create account, Account, Settings, and both home modes. Signed-out people can also open the in-app privacy and terms screens. Delete account, from Account or Settings, explains that the on-device copy is removed for both roles, opens [https://tydlii.com/privacy#delete-account](https://tydlii.com/privacy#delete-account), and emails `teamtydlii@gmail.com`. The result says **Not sent**. Auth does not ask for location or Face ID. The cleaner app's when-in-use location strings are only for an active job, unchanged by sign-in.

## Brand

| Token | Hex |
| --- | --- |
| Ink | `#070707` |
| Teal | `#04a3ac` |
| Sage | `#5c9396` |
| Mist | `#e5f3f4` |

The smile wordmark is copied from `public/brand/wordmark.png` (ink) and `public/brand/wordmark-light.png` (on ink). The app icon is `public/brand/app-icon.png`. Replace those files in each app's `assets/` if the master artwork changes.

Quote options and prices come from `packages/quote` (`@tydlii/quote`), the same package the website uses. A Liberty Village 2-bedroom, 800–999 sq ft, bi-weekly, maintained, is **$229 + HST** per plan visit ($258.77 with HST). The first visit is **$279 + HST**. That remains the customer preview and the quote-calculator default.

The cleaner sample is a different home, labeled **example larger clean**. It is band F from the quote table: **1,600–1,999 sq ft** (base 299), **2 bedrooms** (+20), **2 full baths** (+30), bi-weekly, maintained. The plan price is **$349 before HST**. The offer pays **67%**, **$233.83**, and also shows the **72%** path, **$251.28**. The map pin is still 88 Niagara Street so the sample route is unchanged. It is not the $229 condo.

## Customer

Entry screen, then:

1. **Book** — street address, launch neighbourhood (CityPlace, King West, Liberty Village), sq ft band, beds and baths, frequency, condition, and the flat price.
2. **Schedule** — a day and an arrival window.
3. **Pay** — Stripe PaymentSheet stand-in in test mode. The button opens a sheet, confirms a placeholder card, and does not call Stripe. `pk_live_` keys are refused, including odd casing and a value that also contains `pk_test_`. Nothing is charged.
4. **Live visit** — a MapLibre map of the real streets and buildings. Teal cleaner pin, ink home pin, teal route. The cleaner pin moves on a simulated GPS trace. Status chips: En route, Arrived, Cleaning, Done. ETA counts down, then the trace stops at Done.

**Settings** opens job alerts, the live privacy policy and terms in the in-app browser, delete account, and Canada coverage. Job alerts are the push scaffold: the switch asks for notification permission, and token registration stays off until the env vars below are set. Delete account clears the local copy for both roles, says "Not sent", and emails `teamtydlii@gmail.com`. The same links are on Account and on Sign in, before an account exists. Coverage lists every province and territory and keeps Toronto as the only soft-launch city. Booking still uses CityPlace, King West, and Liberty Village.

"Preview a sample visit" opens the map without a booking. The sample uses the $229 site preview, not a dispatched cleaner. The customer's phone is not tracked.

## Cleaner

Entry screen with **Go online**. While online, one sample offer shows the example larger clean: area, home, time, and the 67% dollar share (with the 72% path) before accept or decline.

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

The customer `development`, `preview`, and `production` profiles set the placeholder. Leave them on `pk_test_` until a test account exists. Do not replace them with `pk_live_`. The cleaner profiles do not set a Stripe key.

## Push

Job status and arrival alerts are a scaffold on both apps. Settings → **Job alerts** asks for notification permission, then tries to read an Expo push token and hand it to a register URL. Each app's Expo project UUID is committed, so a phone can request a token. The register URL stays unset in git, so that token is not sent to a server. The web preview explains that registration is for the iOS and Android apps, and the switch stays off.

| Rule | What happens |
| --- | --- |
| `EXPO_PUBLIC_EAS_PROJECT_ID` unset and `extra.eas.projectId` missing or not a UUID | The app does not call `getExpoPushTokenAsync`. Each app's UUID is committed at `extra.eas.projectId`. Either the env var or that field is enough. |
| `EXPO_PUBLIC_PUSH_REGISTER_URL` unset or empty | The token, when one exists, is not sent. The screen says **Not sent**. |
| Both set, and the URL is `https` | The app POSTs `{ role, token, platform, alerts }`. `alerts` is `job_status` and `arrival`. There is no auth header. |
| Any other URL | Rejected. The app does not send. |

`registerPushToken` in `@tydlii/live` is the stub. It calls a transport only when the caller passes one, and the apps pass `fetch` only when the register URL is set. Copy the names from `apps/mobile/.env.example`. Leave the values empty. `eas.json` does not set them.

Expo Go on Android, from SDK 53 on, cannot register a remote push token. iOS Expo Go can. A development build is the Android path once credentials exist. This scaffold still loads in Expo Go: the permission switch works, and a missing project id skips the token call.

A future sender puts `{ kind, jobId, status }` on the Expo push `data`. `kind` is `job_status` or `arrival`. `status`, when present, is `enroute`, `arrived`, `cleaning`, or `done`. The apps keep the last payload of that shape. Opening the visit from it is still a TODO.

The Expo project UUIDs are already committed. Customer (`@tydlii/tydlii-customer`) is `ed30d1f1-b1a8-479f-8309-a8ebd04a4cbe`. Cleaner (`@tydlii/tydlii-cleaner`) is `26014761-9e69-40e9-bc62-f71e1aa8e5fe`. `app.config.ts` copies `EXPO_PUBLIC_EAS_PROJECT_ID` into `extra.eas.projectId` when that value is a UUID, and otherwise keeps the id in `app.json`. Push registration reads either place. Paste the same UUID into the gitignored `.env` for a local run. Do not run `eas init`.

Still needed before a phone can receive a job alert:

- An APNs key for iOS and an FCM v1 service account for Android, stored in EAS credentials. Not in this repo. The config plugin sets the Android color to `#04a3ac`, the default channel to `job-status`, and iOS `aps-environment` to `development`. Background remote notifications stay off. Switch `mode` to `production` only after the production APNs key exists. An EAS iOS build may ask for that key because the entitlement is present. The key is not required to merge this scaffold.
- A server that stores the token for the signed-in account and sends through the Expo push API. The Expo access token stays on that server.
- The account API, so the token can be tied to a person. Sign-in is still local.

No `google-services.json`, `GoogleService-Info.plist`, or `.p8` belongs in git.

## Canada coverage

`PROVINCES` lists all 13 provinces and territories. Toronto, Ontario is the only soft-launch city and the default. Launch neighbourhoods match the website: CityPlace, King West, Liberty Village. Yonge–Eglinton and North York Centre are later in Toronto. Other cities are planned.

## Not in this version

- Chat
- Background location, or GPS while a job is Done
- A live Stripe charge, a PaymentIntent, or a secret key in the app
- A drawn map, or a native maps SDK, in place of MapLibre
- A paid maps key
- A real account API or a shared backend. Email, Google, and Apple sign-in all store the session on the device. Push is a local scaffold and does not register a token until a project UUID is set.
- One store listing. The two bundle ids stay. The role switch is inside each install.
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

Each app has its own `eas.json`. There is no `submit` key. Do not run `eas submit`, and do not commit Apple or Google passwords, an API key, a client secret, `EXPO_TOKEN`, or a keystore. `expo.owner` in both `app.json` files is the Expo account slug `tydlii`. `extra.eas.projectId` is the existing project UUID for that app. Do not run `eas init` again.

`app.config.ts` in each app keeps the `eas.json` profiles as they are. When `EXPO_PUBLIC_EAS_PROJECT_ID` is a UUID, the resolved config sets `extra.eas.projectId` and that value wins. A UUID already written under `expo.extra.eas.projectId` in `app.json` is the fallback. Any other string is ignored. The same file turns on Sign in with Apple and, when a real Google client id is in the environment at prebuild, adds the reversed client-id URL scheme. It does not add a submit profile.

Run every `eas` command from the app directory (`apps/mobile/customer` or `apps/mobile/cleaner`), not the website root. These apps are not npm workspaces of the Next.js site. EAS uploads the git repo, so `packages/quote`, `apps/mobile/auth`, and `apps/mobile/shared` are on the builder. The builder uses Node `22.23.4`.

`cli.appVersionSource` is `remote`. The `production` profile sets `autoIncrement`, so iOS build numbers and Android version codes live on EAS after the project exists. `expo.version` stays `0.1.0`. `ios.buildNumber` `"1"` and `android.versionCode` `1` only seed that counter. `promptToConfigurePushNotifications` is false. `ios.config.usesNonExemptEncryption` is false because the apps use HTTPS and on-device SHA-256. Change it if that stops being true.

`development` does not set `developmentClient`. `expo-dev-client` is not a dependency. Day-to-day development stays on Expo Go.

| Profile | Artifact | Apple Developer | Play Console |
| --- | --- | --- | --- |
| `development` | iOS Simulator build, Android APK | Not required | Not required |
| `preview` | Internal install: Android APK, iOS ad hoc IPA for registered devices | Required, plus device UDIDs | Not required |
| `production` | Store binary: Android App Bundle and an iOS IPA. Nothing is uploaded. | Required | Not required to build. Required only for a later upload. |

Customer profiles set `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `pk_test_tydlii_placeholder`. Leave that until a Stripe test key exists. Do not put a `pk_live_` key in `eas.json`. The cleaner profiles do not set a Stripe key. No profile sets a maps key or a push project id. Do not upload a binary until the founder says so.

### Expo project ids

Both Expo projects already exist on the account `tydlii`. Do not run `eas init`.

| App | Expo project | UUID |
| --- | --- | --- |
| Customer (`apps/mobile/customer`) | `@tydlii/tydlii-customer` | `ed30d1f1-b1a8-479f-8309-a8ebd04a4cbe` |
| Cleaner (`apps/mobile/cleaner`) | `@tydlii/tydlii-cleaner` | `26014761-9e69-40e9-bc62-f71e1aa8e5fe` |

Each UUID is committed at `expo.extra.eas.projectId` in that app's `app.json`. For a local run, paste the same UUID into that app's gitignored `.env` as `EXPO_PUBLIC_EAS_PROJECT_ID`. Do not commit `EXPO_TOKEN`, a client secret, or the filled-in `.env`.

`app.config.ts` copies a valid `EXPO_PUBLIC_EAS_PROJECT_ID` into the resolved `extra.eas.projectId`. When that env var is unset or not a UUID, the committed id stays. Push registration uses whichever one is a UUID.

Do not run `eas submit`. Do not add a submit profile.

### Once the store accounts exist

1. The Expo account `tydlii` already owns both projects. If that slug ever changes, change `expo.owner` in both `app.json` files.
2. `npm i -g eas-cli`, then `eas login`. Keep any access token in the shell only. Do not commit it.
3. In each app directory, `npm ci`. The project id is already in `app.json`. Do not run `eas init`.
4. For iOS `preview` and `production`, enroll in the Apple Developer Program and accept the current agreements. Create two App Store Connect records, Tydlii (`com.tydlii.customer`) and Tydlii Cleaner (`com.tydlii.cleaner`), or change the bundle ids first. They are not registered yet. Register phones with `eas device:create` before an iOS `preview` build.
5. The first Android `preview` or `production` build can generate a release keystore and keep it on EAS. Let it. Do not copy the keystore or `credentials.json` into the repo.
6. A Google Play Console account is not required to produce the AAB. It is required when someone uploads that file. Play Console needs `https://tydlii.com/privacy` and `https://tydlii.com/privacy#delete-account` as the account-deletion link. Add a submit profile in a later change, and only then run `eas submit`. That profile is intentionally absent from this repo.
7. Keep `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` on a `pk_test_` value. Swap the placeholder for a real test publishable key only after the Stripe account exists. A `pk_live_` value will not open the sheet.

```bash
cd apps/mobile/customer
eas build -p ios --profile development
eas build -p android --profile development
eas build -p all --profile preview
eas build -p all --profile production
```

Repeat from `apps/mobile/cleaner` for the other install. `production` does not upload.

Still needed from the founder before a cloud build: an Expo login, with `EXPO_TOKEN` only in the shell and never in git. The project UUIDs are already in each `app.json`; paste the same value into that app's gitignored `.env` as `EXPO_PUBLIC_EAS_PROJECT_ID`. Google sign-in on a phone also needs `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` present when the native project is generated (local `.env`, or the same keys on the EAS project after it exists). Apple on iOS needs no client id. Android and web Apple need `EXPO_PUBLIC_APPLE_SERVICE_ID` and `EXPO_PUBLIC_APPLE_REDIRECT_URI`. An Apple team is still needed for any iOS device or store build, and device UDIDs for iOS preview. Play Console is still needed before upload, not before `eas build`. A Stripe test publishable key is optional. After a binary exists, TestFlight still needs the build uploaded, an internal group, and for external testers Beta App Review, a privacy policy URL (`https://tydlii.com/privacy`), and export compliance. Filling the console forms, age rating, and data-safety answers is still a manual step. The apps open privacy and terms in the in-app browser from Sign in, Account, and Settings. Delete account links to `https://tydlii.com/privacy#delete-account` and emails `teamtydlii@gmail.com`. Do not run `eas submit` from this setup.
