# OneX Club™ — Mobile Native Embed Guide
> **For:** React Native / iOS / Android engineer wrapping the OneX Club PWA into App Store + Play Store binaries.
> **Reading time:** ~25 min · **Last updated:** Feb 2026 · **App version:** 1.0.0

---

## 0. TL;DR

OneX Club is a **production React + FastAPI + MongoDB PWA** already deployed at `https://club.onex.exchange`. **Do not rebuild it natively.** Wrap it in a thin native shell using one of two paths:

| Path | Stack | When to pick |
|---|---|---|
| **A. Capacitor** *(recommended — already configured)* | Web build → bundled inside iOS/Android | You want offline shell, instant launch, native plugins (push, share, camera) and a single submission per platform |
| **B. React Native WebView** | Native RN app loads `https://club.onex.exchange` in a `<WebView>` | You already have an RN app and want OneX as one tab/feature |

Both paths reuse the **same backend, same auth, same domain, same SSL cert**. No separate deployment. No backend changes.

```
┌─────────────────────────────┐    ┌────────────────────────┐    ┌──────────────┐
│  Native shell (iOS/Android) │ →  │  WebView / WKWebView   │ →  │ club.onex.   │
│  - Push notifications       │    │  loads OneX Club PWA   │    │ exchange     │
│  - Deep links               │    │  (React app + service  │    │ (backend +   │
│  - Native share / camera    │    │   worker)              │    │  frontend)   │
│  - JS↔Native bridge         │    └────────────────────────┘    └──────────────┘
└─────────────────────────────┘
```

---

## 1. Architecture: Capacitor (recommended path)

The repo is **already wired for Capacitor**. The web build (`yarn build`) lands in `./build/`, Capacitor bundles it into native Xcode + Android Studio projects, and the runtime loads the React app inside `WKWebView` (iOS) / `WebView` (Android). All `/api/*` calls hit `REACT_APP_BACKEND_URL` over HTTPS exactly as in the browser.

### Repo files already in place

| File | Purpose |
|---|---|
| `frontend/capacitor.config.ts` | App ID `club.onex.app`, name "OneX Club", dark theme `#0A0A0B`, status-bar config |
| `frontend/src/native.js` | Sets the iOS status-bar style on launch |
| `frontend/MOBILE_BUILD.md` | Step-by-step web→native build commands |

### One-time native project bootstrap (macOS for iOS)

```bash
cd /app/frontend
yarn build
npx cap add ios       # creates ./ios/App/   (requires Xcode + CocoaPods)
npx cap add android   # creates ./android/   (requires Android Studio)
npx cap sync          # copies the latest web build + plugins into both
npx cap open ios      # → Xcode
npx cap open android  # → Android Studio
```

### Subsequent rebuild (every time the web app changes)

```bash
yarn build && npx cap sync
# Then open the native IDE and hit Run / Archive.
```

---

## 2. Architecture: React Native WebView (alternative path)

If you'd rather embed OneX inside an existing React Native app:

```bash
yarn add react-native-webview
cd ios && pod install
```

```jsx
// OneXClubScreen.tsx
import { WebView } from "react-native-webview";

export default function OneXClubScreen() {
  return (
    <WebView
      source={{ uri: "https://club.onex.exchange" }}
      sharedCookiesEnabled            // CRITICAL — see §4 (auth)
      thirdPartyCookiesEnabled        // Android cookie persistence
      originWhitelist={["https://*"]}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      pullToRefreshEnabled
      onMessage={onWebMessage}        // see §5 (bridge)
      injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
      // Open external https links in Safari/Chrome instead of the WebView:
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith("https://club.onex.exchange")) return true;
        if (req.url.startsWith("https://accounts.google.com")) return true; // Google OAuth
        Linking.openURL(req.url);
        return false;
      }}
    />
  );
}
```

**Critical:** RN WebView **must** have `sharedCookiesEnabled` (iOS) and `thirdPartyCookiesEnabled` (Android) so the `session_token` cookie set by `/api/auth/google/callback` persists across launches.

---

## 3. Environments & URL configuration

| Env | Frontend URL | Backend (same host) |
|---|---|---|
| **Production** | `https://club.onex.exchange` | `https://club.onex.exchange/api/*` |
| **Preview / Staging** | `https://exclusive-members-1.preview.emergentagent.com` | `…preview.emergentagent.com/api/*` |
| **Local (web only)** | `http://localhost:3000` | `http://localhost:8001/api/*` |

The native app should hard-code production by default and expose a hidden long-press build-info gesture to switch to preview for QA. Never embed secrets in the native shell — all auth flows through the backend.

---

## 4. Authentication — full lifecycle

### 4.1 What the native shell needs to do = **almost nothing**

OneX Club authenticates entirely **inside the WebView** using:

1. **Self-hosted Google OAuth 2.0** — `auth.google.com` consent → `/api/auth/google/callback` sets `session_token` cookie
2. **Email magic-code** — `POST /api/auth/email/start` + `/verify` returns the same cookie
3. **30-day "Stay signed in"** toggle on `/login` extends `Max-Age=2592000`

All you need to do is **persist cookies across app restarts**. With Capacitor + WKWebView this is automatic. With RN WebView you must enable `sharedCookiesEnabled` + `thirdPartyCookiesEnabled`.

### 4.2 Cookie/session details

| Property | Value |
|---|---|
| Name | `session_token` |
| HttpOnly | `true` |
| Secure | `true` |
| SameSite | `None` |
| Max-Age | 7 days (default) or 30 days (remember-me) |
| Path | `/` |
| Also accepted via | `Authorization: Bearer <token>` header |

### 4.3 Google OAuth redirect URIs (already added in Google Cloud Console)

```
https://club.onex.exchange/auth/google/callback
https://exclusive-members-1.preview.emergentagent.com/auth/google/callback
http://localhost:3000/auth/google/callback
```

The flow is: `/api/auth/google/login` → Google consent ("to continue to club.onex.exchange") → `/auth/google/callback` (frontend bounce) → `/api/auth/google/callback` (backend exchange + cookie) → `/dashboard?auth=google`.

Inside a WebView this **just works** — the OAuth round-trip happens entirely in-WebView and the cookie sticks.

### 4.4 Native social login? **Not needed.** The in-WebView Google OAuth is fully self-branded (consent screen says "OneX Club" with your logo).

---

## 5. JS ↔ Native bridge

You'll only need the bridge for things the web cannot do natively:

| Need | Native API | Web side trigger |
|---|---|---|
| Native share sheet | `Capacitor Share` plugin / RN `Share.share()` | Click `data-testid="referral-share-btn"` |
| Push registration token | FCM / APNs | Send via `POST /api/settings` (`fcm_token` field) |
| Biometric quick re-auth | `react-native-keychain` | Optional — store `session_token` in Keychain |
| Camera (selfie KYC) | `Capacitor Camera` | Veriff already opens its own camera — usually unnecessary |
| Open external link in browser | Capacitor `Browser.open()` | Catch all non-`club.onex.exchange` links |

### 5.1 Pattern: web posts a message → native handles it

```js
// Inside the React app (already shippable — wire on demand):
window.postMessage(JSON.stringify({ type: "share", payload: {
  title: "Join me on OneX Club",
  text: "Co-own Dubai's most exclusive assets — get AED 100 just for joining.",
  url: "https://club.onex.exchange/?ref=surya-378738",
}}), "*");
```

```js
// Native (RN):
function onWebMessage(event) {
  const msg = JSON.parse(event.nativeEvent.data);
  if (msg.type === "share") Share.share(msg.payload);
  if (msg.type === "haptic") Haptics.impactAsync();
  if (msg.type === "fcm-register") sendFcmTokenToBackend();
}
```

```js
// Capacitor: same, but listen via a Plugin or use `cordova_iab` postMessage handler.
```

### 5.2 Pattern: native injects helpers into the web

```js
// Inject before the web bundle loads — exposes a global `window.OneXNative`:
const INJECTED_JS = `
window.OneXNative = {
  isNative: true,
  platform: ${JSON.stringify(Platform.OS)},     // "ios" | "android"
  version: "1.0.0",
  share: (payload) => window.ReactNativeWebView.postMessage(JSON.stringify({type:'share', payload})),
  haptic: () => window.ReactNativeWebView.postMessage(JSON.stringify({type:'haptic'})),
};
true; // required by injectedJavaScript
`;
```

The React app can feature-detect with `if (window.OneXNative) {...}` to call the native share sheet on referral pages instead of `navigator.share`.

---

## 6. API reference — all endpoints

**Base URL (production):** `https://club.onex.exchange/api`
**Auth:** Cookie `session_token` (preferred) **or** `Authorization: Bearer <token>`
**Content-Type:** `application/json` everywhere unless noted.
**CORS:** `*` allowed (see §11 for security notes).

### 6.1 Auth (`/auth/*`)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/auth/google/login?ref=&next=&remember=` | Redirects to Google consent | Public |
| GET | `/auth/google/callback?code=&state=` | OAuth exchange — sets cookie + 302 to `/dashboard?auth=google` | Public |
| POST | `/auth/email/start` `{email, ref?}` | Sends 6-digit code via Brevo | Public |
| POST | `/auth/email/verify` `{email, code, remember?}` | Returns `{user}` + session cookie | Public |
| GET | `/auth/me` | Returns `{user}` for current session | Cookie |
| POST | `/auth/logout` | Clears session_token | Cookie |

### 6.2 Dashboard & journey

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard` | Returns `{user, next_milestone, next_reward, recent_activity, percent}` |
| GET | `/progress` | 12-step journey state |
| POST | `/progress/complete` `{milestone_id}` | Manually completes a milestone (where allowed) |
| GET | `/activity?limit=100` | Paginated activity feed |
| GET | `/tier-progress` | Drives "Ways to get there" — `{balance, referrals, verified_referrals, kyc_referrals, coowner_referrals, webinars_attended, saved_properties, interests_reserved}` |
| GET | `/benefits-ladder` | Tier definitions + current tier + next-tier remaining AED |

### 6.3 Properties & allocation

| Method | Path | Notes |
|---|---|---|
| GET | `/properties?category=` | Lists Dubai properties; categories: `residential`, `airbnb`, `commercial`, `luxury`, `hospitality` |
| POST | `/properties/waitlist` `{property_id}` | Joins property waitlist |
| POST | `/properties/save` `{property_id}` | Toggles saved-favorites |
| POST | `/properties/view` `{property_id}` | Logs detail view (drives milestone) |
| POST | `/properties/remind` `{property_id}` | Triggers "Remind me via email" → Brevo |
| GET | `/allocation-interests` | User's reserved interests |
| POST | `/allocation-interests` `{property_id, amount_aed}` | Reserves interest |

### 6.4 Webinars

| Method | Path | Notes |
|---|---|---|
| GET | `/webinars` | Upcoming + past sessions |
| POST | `/webinars/register` `{webinar_id}` | Registers user (also marks attendance for past sessions) |
| POST | `/webinars/remind` `{webinar_id}` | Email reminder |

### 6.5 Referrals & community

| Method | Path | Notes |
|---|---|---|
| GET | `/referrals` | Returns `{referral_code, referral_link, summary, links[], milestones[]}` |
| POST | `/referrals/click` `{code, source?}` | Public — logs a referral click for attribution |
| POST | `/referrals/share` `{channel}` | Increments share counter (drives milestone) |
| GET | `/leaderboard?period=this_week\|this_month\|all_time` | Real-time real referral counts (since June 2026) |
| GET | `/community-updates` | News feed |
| POST | `/community-updates/like` `{update_id}` | Like an update |
| POST | `/community-updates/save` `{update_id}` | Save to bookmarks |

### 6.6 Settings, support, payments

| Method | Path | Notes |
|---|---|---|
| GET | `/settings` | Profile, KYC, notifications |
| PUT | `/settings` `{name?, mobile?, fcm_token?, email_notifications?, push_notifications?}` | Update profile / FCM token |
| GET | `/support` | FAQ list |
| POST | `/support/contact` `{subject, message}` | Sends to `surya@onex.exchange` |
| GET | `/payments/packages` | Top-up packages |
| GET | `/payments/history` | User's transaction list |
| POST | `/payments/checkout` `{package_id, origin}` | Returns Stripe Checkout URL ⚠️ **DUMMY mode — see §11** |
| GET | `/payments/status/{session_id}` | Polls payment status |
| POST | `/kyc/start` | Initiates Veriff session, returns `{verification_url}` |

### 6.7 Public / waitlist (no auth)

| Method | Path | Notes |
|---|---|---|
| POST | `/waitlist/join` `{email, name?, source?, ref?}` | Public Framer-page entry — pushes to Brevo CRM list #6 |
| GET | `/waitlist/info` | Public stats for landing page |
| GET | `/co-owner-benefits` | Public catalogue |

### 6.8 Webhooks (server→server only — do not call from app)

| Method | Path | Sender |
|---|---|---|
| POST | `/webhook/veriff` | Veriff KYC result |
| POST | `/webhook/stripe` | Stripe payment events |

---

## 7. Deep linking & universal links

You'll want users tapping `https://club.onex.exchange/properties/123` from anywhere (email, Twitter) to open inside the native app rather than Safari.

### 7.1 iOS — Universal Links

1. In Xcode → **Signing & Capabilities** → add **Associated Domains** → `applinks:club.onex.exchange`.
2. Ask backend team to host **Apple App Site Association** at `https://club.onex.exchange/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "details": [{
      "appIDs": ["TEAMID.club.onex.app"],
      "components": [{ "/": "/*", "comment": "open all paths in app" }]
    }]
  }
}
```

3. Handle in `AppDelegate`:

```swift
func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
  guard let url = userActivity.webpageURL else { return false }
  // Pass into Capacitor or RN — both have URL handlers.
  return true
}
```

### 7.2 Android — App Links

1. `AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity">
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="club.onex.exchange" />
  </intent-filter>
</activity>
```

2. Backend team hosts `assetlinks.json` at `https://club.onex.exchange/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "club.onex.app",
    "sha256_cert_fingerprints": ["YOUR_RELEASE_SHA256"]
  }
}]
```

> **Action item for you:** Send the iOS Team ID + Android release-key SHA-256 fingerprint to the backend team so they can publish the two `.well-known` files.

---

## 8. Push notifications

OneX Club doesn't push messages today, but the backend already has a `fcm_token` field on the user record (`PUT /api/settings`) — you just need to wire FCM/APNs registration:

```js
// 1. Native: register for push (FCM SDK / APNs)
const token = await messaging().getToken();

// 2. Native: pass token into web via inject or postMessage
window.OneXNative._fcmToken = token;

// 3. Web (when authenticated): send to backend
await api.put("/settings", { fcm_token: token });
```

Backend will gain a `POST /api/notifications/send` endpoint when the messaging feature is greenlit. For now, log them for product analytics.

---

## 9. PWA / Service-Worker concerns inside a WebView

The OneX web app does NOT register a service worker (intentional — avoids stale-cache bugs in WebViews where users can't easily clear caches). Don't add one for the native shell.

If you need offline shell behavior, use Capacitor's [Bundled Web Runtime](https://capacitorjs.com/docs/) which intercepts the page from disk first.

---

## 10. App Store / Play Store assets

We've already exported store-listing screenshots:

```
https://club.onex.exchange/store-mockups/onex-1.png … onex-6.png
```

Each at native **1290×2796** (Apple 6.7" required size; works for Play Store too). Visit `/store-mockups` to preview live.

| Asset | Size | Where |
|---|---|---|
| App icon (iOS) | 1024×1024 PNG, no transparency | Provide to design |
| App icon (Android) | 512×512 PNG + adaptive XML | Provide to design |
| Screenshots | 1290×2796 (×6) | `/store-mockups/` |
| Splash | `#0A0A0B` background + lime-green "1X" mark | Already in `capacitor.config.ts` |
| Privacy URL | `https://club.onex.exchange/privacy` | (Backend team will publish) |
| Support email | `surya@onex.exchange` | |
| Bundle ID | `club.onex.app` | iOS + Android both |

---

## 11. Security & compliance checklist

- [ ] **HTTPS only** — never load OneX over `http://`. The cookie is `Secure;SameSite=None`.
- [ ] **App Transport Security (iOS)** — keep ATS strict; we don't need NSAllowsArbitraryLoads.
- [ ] **Certificate pinning (optional)** — pin to Cloudflare's leaf cert if you need extra hardening.
- [ ] **Stripe is currently DUMMY mode** — payment endpoints return success without charging. Don't ship to live App Store until Stripe is flipped to LIVE.
- [ ] **CORS is `*`** — fine for cookie-based auth (browsers ignore credentials with `*`), but if you switch to Bearer tokens from a non-browser context, lock down `CORS_ORIGINS` to `https://club.onex.exchange`.
- [ ] **No secrets in the native binary** — all `GOOGLE_OAUTH_*`, `BREVO_*`, `STRIPE_*` keys live on the backend `.env`. The mobile shell never sees them.
- [ ] **App Store privacy nutrition labels:** declare email, name, profile photo (Google), AED balance, referrals, KYC docs (uploaded direct to Veriff, not stored by us), device tokens.
- [ ] **GDPR / CCPA:** the `/api/auth/logout` endpoint clears the session; data deletion happens via support request to `surya@onex.exchange`.

---

## 12. Testing matrix before each store submission

| Flow | iOS WKWebView | Android WebView | Notes |
|---|---|---|---|
| Cold launch → splash → login | ✅ | ✅ | <2s on Pixel 5 / iPhone 12 |
| Google OAuth round-trip | ✅ | ✅ | Cookie persists across restart |
| Email OTP magic-code | ✅ | ✅ | Code arrives <60s |
| 30-day "Stay signed in" toggle | ✅ | ✅ | Verify by relaunching after 8 days |
| Deep link `/properties/<id>` from Mail.app | Universal Links | App Links | See §7 |
| Native share sheet from Invite & Earn | postMessage bridge | postMessage bridge | See §5 |
| Pull-to-refresh on Dashboard | Yes | Yes | RN WebView: `pullToRefreshEnabled` |
| Webinars iframe (Jitsi) loads | ✅ | ✅ | Confirm camera/mic permission prompt |
| Background → resume keeps session | ✅ | ✅ | Cookie still valid |
| App backgrounded during OTP entry | ✅ | ✅ | `/api/auth/email/verify` succeeds |
| Top-up checkout opens Stripe (DUMMY) | ✅ | ✅ | Returns to `/payments/status/...` |

---

## 13. Build & ship commands cheat-sheet

```bash
# ─── Capacitor (recommended) ─────────────────────────────────
cd /app/frontend
yarn build && npx cap sync

# iOS — open in Xcode → Product → Archive → upload to App Store Connect
npx cap open ios

# Android — open in Android Studio → Build → Generate Signed Bundle → upload to Play Console
npx cap open android

# Quick OTA update of the web bundle without re-submitting native app:
yarn build && npx cap copy   # then push fresh `build/` via your in-house OTA layer (CodePush / Capgo)

# ─── React Native WebView (alt) ──────────────────────────────
cd ios && pod install && cd ..
npx react-native run-ios       # dev
npx react-native run-android   # dev
# Production: standard fastlane / EAS / Bitrise pipelines
```

---

## 14. Support, escalation & contacts

| Topic | Contact |
|---|---|
| Backend / API issues | OneX engineering team (this repo's main agent) |
| Auth / OAuth / SSL | Backend team owns Google Cloud Console + DNS |
| Brand assets / mockups | `/store-mockups` route + `/app/frontend/public/store-mockups/` |
| Test credentials | `/app/memory/test_credentials.md` |
| Production incidents | `support@onex.exchange` (also goes to surya@) |

---

## Appendix A — Full request/response samples

### A.1 Sign in with Google (in-WebView, no native code)

```http
GET /api/auth/google/login?remember=true HTTP/1.1
Host: club.onex.exchange

→ 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=https://club.onex.exchange/auth/google/callback&...
```

After Google consent:

```http
GET /auth/google/callback?code=4/0AX...&state=abc123 HTTP/1.1
→ (frontend bounce) /api/auth/google/callback?code=4/0AX...&state=abc123
→ 302 Found
Location: https://club.onex.exchange/dashboard?auth=google
Set-Cookie: session_token=google_<uuid>; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=None
```

### A.2 Fetch dashboard

```http
GET /api/dashboard HTTP/1.1
Cookie: session_token=google_xxx
```

```json
{
  "user": {
    "user_id": "user_abc123",
    "email": "hello@onex.exchange",
    "name": "Surya",
    "tier": "Insider",
    "aed_balance": 2840,
    "referral_code": "surya-378738"
  },
  "next_milestone": { "id": "attend_webinar", "title": "Attend a Webinar", "reward": 25 },
  "next_reward": { "kind": "milestone", "amount": 25, "label": "Attend a Webinar" },
  "recent_activity": [
    { "id": "...", "kind": "referral", "title": "Friend joined · Priya N.", "reward": 50, "created_at": "2026-06-20T12:13:08Z" }
  ],
  "percent": 41
}
```

### A.3 Top-up checkout (DUMMY mode — Feb 2026)

```http
POST /api/payments/checkout HTTP/1.1
Cookie: session_token=...
Content-Type: application/json

{ "package_id": "pkg_500", "origin": "https://club.onex.exchange" }
```

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_xxx", "session_id": "cs_test_xxx" }
```

> ⚠️ Until production Stripe keys are added, this returns a fake URL that immediately marks the payment as paid. Do not ship the iOS/Android binary to the public stores until backend confirms Stripe LIVE mode.

---

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **AED** | UAE Dirham; the in-app reward currency, 1:1 with real Dirham value once redeemed |
| **Tier** | One of `Member`, `Insider`, `Co-Owner`, `Pro-Owner` (in increasing order) |
| **Allocation** | A reserved spot in a Dubai property launch |
| **KYC** | Know-Your-Customer verification, handled by Veriff |
| **Brevo** | Transactional email + CRM provider (formerly Sendinblue) |
| **Magic code** | 6-digit one-time email login code (alternative to Google OAuth) |
| **Referral code** | Unique 6-char code per user, embedded in `?ref=` URL parameter |
| **Webinar** | Live session via Jitsi Meet iframe; attendance tracked for milestones |

---

**Last reviewed:** Feb 2026 · Maintained alongside `/app/memory/PRD.md`. Open issues / questions → leave a comment in the OneX repo or ping the engineering team.
