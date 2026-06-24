# OneX Club — 60-Second Native Embed

> **For:** React Native engineer who just wants the shortest path to ship OneX inside a native app.
> **Stop reading at the dotted line if you just need the code.** Everything below is rationale + production hardening.

---

## ⚡ The single line

```jsx
<WebView source={{ uri: "https://club.onex.exchange" }} sharedCookiesEnabled thirdPartyCookiesEnabled />
```

That's it. That's the integration. The OneX backend, auth (Google OAuth + email OTP + 30-day stay-signed-in), payments, push-token capture and admin panel all work inside that WebView with **zero native code**.

---

## ⚡ The 8-line production-grade version

Use this in any RN screen — handles cookies, OAuth pop-back, deep links, pull-to-refresh, and external-link routing.

```jsx
import { WebView } from "react-native-webview";
import { Linking } from "react-native";

export default () => (
  <WebView
    source={{ uri: "https://club.onex.exchange" }}
    sharedCookiesEnabled                                          /* iOS: persist session_token */
    thirdPartyCookiesEnabled                                      /* Android: same */
    pullToRefreshEnabled
    startInLoadingState
    onShouldStartLoadWithRequest={(r) => {
      const allow = ["club.onex.exchange", "accounts.google.com"]; /* keep OAuth inside */
      if (allow.some((d) => r.url.includes(d))) return true;
      Linking.openURL(r.url); return false;                       /* anything else → system browser */
    }}
  />
);
```

---

## 📦 Install (one command)

```bash
yarn add react-native-webview && cd ios && pod install && cd ..
```

No backend changes. No auth setup. No env vars. The PWA is fully self-contained at `https://club.onex.exchange`.

---

## ✅ What you get out of the box

| Feature | How |
|---|---|
| Google sign-in ("to continue to **club.onex.exchange**") | In-WebView OAuth — already self-branded |
| Email magic-code login | Same WebView |
| 30-day "Stay signed in" | Cookie + `Max-Age=2592000` |
| All 12 member screens | Dashboard, Properties, Webinars, Invite & Earn, etc. |
| Admin panel | `https://club.onex.exchange/admin/login` (separate URL, separate password) |
| Stripe checkout | Currently DUMMY — don't ship to public stores until LIVE |
| Push token capture | `PUT /api/settings { fcm_token }` — wire via §5 bridge in MOBILE_NATIVE_INTEGRATION.md |
| Pull-to-refresh | WebView prop |
| External links open in Safari/Chrome | `onShouldStartLoadWithRequest` |

---

## ⚡ Capacitor (alternative — recommended if you don't have an existing RN app)

The repo is **already wired for Capacitor**.

```bash
cd /app/frontend && yarn build && npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

That's it. Hit "Run" in Xcode/Android Studio.

---

## 🔍 Verify it's working (10 seconds)

In the WebView, long-press the sidebar footer text `v1.0.0 · hold for build info` (1.2s). A modal pops up with:

```
App:      OneX Club API
Version:  1.0.0
Git SHA:  30b3153
Started:  2026-06-23 17:14
Python:   3.11.15
Platform: Linux
```

If you see this → backend is reachable, session cookies work, the build is current. Done.

> Or hit `https://club.onex.exchange/api/version` directly in a browser for the same info.

---

## ⏭ What to read next

- **`MOBILE_NATIVE_INTEGRATION.md`** — full 14-section guide (auth lifecycle, bridge patterns, deep links, push, store assets, security, build commands, full API reference, sample requests)
- **`README.md`** — quick-start + hand-back checklist + open questions
- **`openapi.json`** — Postman-importable spec for all 43 endpoints

---

## 🤝 Hand-back to the OneX team when you're ready to submit

Send us:
- iOS Team ID (10-char) → we'll publish `apple-app-site-association` for Universal Links
- Android release-key SHA-256 fingerprint → we'll publish `assetlinks.json`
- TestFlight invite to `surya@onex.exchange`
- Play Console internal-testing track invite to `surya@onex.exchange`

That's the whole integration. **One WebView. One URL. Ship it.**
