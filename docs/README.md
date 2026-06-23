# OneX Club — Native Mobile Integration · Developer Handover

> **Hand this folder to the React Native / native-mobile engineer.**
> Everything they need to wrap our PWA into App Store + Play Store binaries lives here.

---

## What's in this folder

| File | What it is | When to read it |
|---|---|---|
| **`MOBILE_NATIVE_INTEGRATION.md`** | The complete 14-section guide — architecture, auth, API, deep links, push, store assets, build commands. | Read **first**, end-to-end (~25 min). |
| `openapi.json` | Auto-generated OpenAPI 3.1 spec for all 43 endpoints. | Import to Postman / Insomnia / autogen native API clients. |
| `../frontend/MOBILE_BUILD.md` | Capacitor build commands (older, simpler version). | Skim once — superseded by `MOBILE_NATIVE_INTEGRATION.md` §13. |
| `../frontend/capacitor.config.ts` | Capacitor app config (bundle ID, status bar, splash). | Already wired — don't edit unless requested. |
| `../memory/test_credentials.md` | QA test accounts (Google + email-magic-code). | For testing only; do **not** ship in the binary. |

---

## Live developer endpoints

| URL | What |
|---|---|
| **`https://club.onex.exchange/api/docs`** | Interactive Swagger UI — click any endpoint, hit "Try it out" |
| **`https://club.onex.exchange/api/redoc`** | Read-only ReDoc reference |
| **`https://club.onex.exchange/api/openapi.json`** | Machine-readable spec (Postman-importable) |
| **`https://club.onex.exchange/store-mockups`** | Live preview of the 6 App Store / Play Store screenshot mockups |
| **`https://club.onex.exchange/store-mockups/onex-1.png`** … `onex-6.png` | Direct PNG downloads at native 1290×2796 |

---

## 30-second quick-start (Capacitor path)

```bash
git clone <repo>
cd <repo>/frontend
yarn install
yarn build
npx cap add ios && npx cap add android   # one-time
npx cap sync
npx cap open ios       # → Xcode
npx cap open android   # → Android Studio
```

Authenticate using `hello@onex.exchange` (Google) or any email + the magic code that arrives via Brevo (~30s).

---

## Hand-back checklist (what you owe us)

When the native shell is ready for first store submission, send the OneX engineering team:

- [ ] **iOS Team ID** (10-character alphanumeric, e.g. `A1B2C3D4E5`) — we'll publish `apple-app-site-association`
- [ ] **Android release-key SHA-256 fingerprint** — we'll publish `assetlinks.json`
- [ ] **TestFlight invite** for surya@onex.exchange so we can sign off before App Review
- [ ] **Internal-testing track** Play Console invite for surya@onex.exchange
- [ ] **One full demo recording** (1–2 min) of: Google sign-in → dashboard → property waitlist join → invite-share → logout

---

## Open questions for the OneX team (ask before you start)

1. **Stripe LIVE date** — currently DUMMY mode. Ship to public stores only after Stripe is flipped LIVE. ETA?
2. **Push notifications go-live** — we have FCM token capture on `PUT /api/settings`, but no server-side send yet. Do you want push enabled at v1.0 or v1.1?
3. **Bundle ID** — confirmed as `club.onex.app` for both iOS + Android?
4. **In-app purchases vs Stripe** — Apple may require IAP for AED top-ups. Confirm legal interpretation (subscription vs reward credit).
5. **App Tracking Transparency (iOS)** — we don't fingerprint or use IDFA today, so the prompt isn't required, but confirm with the marketing team if they plan to add Branch / AppsFlyer for attribution.

---

**Maintainer note:** Update `openapi.json` whenever new endpoints ship by re-running:

```bash
cd /app/backend && python3 -c "
from server import app; import json
spec = app.openapi()
spec['servers'] = [{'url':'https://club.onex.exchange'},{'url':'https://exclusive-members-1.preview.emergentagent.com'}]
json.dump(spec, open('/app/docs/openapi.json','w'), indent=2)
"
```
