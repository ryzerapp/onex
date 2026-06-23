# OneX Club™ — Mobile (iOS + Android) Build Guide

The OneX Club web app is wrapped with **Capacitor 7** to ship as a native
iOS and Android app to the App Store and Google Play. Same React codebase,
no separate React Native rewrite needed.

---

## What's already wired
- ✅ Capacitor 7 core, CLI, iOS, Android, StatusBar, SplashScreen, App, Haptics plugins installed
- ✅ `capacitor.config.ts` at `/app/frontend/capacitor.config.ts` (appId: `club.onex.app`)
- ✅ Native shell bootstrap in `/app/frontend/src/native.js` (status-bar style, splash hide, Android hardware back button)
- ✅ Mobile UI: top bar + drawer + bottom navigation
- ✅ Safe-area handling (`env(safe-area-inset-*)`) on top bar, drawer and bottom nav
- ✅ Viewport meta tuned for native (`viewport-fit=cover`, `user-scalable=no`)
- ✅ NPM scripts in `package.json` (`yarn cap:add:ios`, `cap:add:android`, `cap:sync`, `cap:open:ios`, `cap:open:android`)

---

## One-time setup (per developer machine)

You need a Mac with **Xcode 16+** for iOS and **Android Studio Koala (2024.1)+** for Android.

```bash
cd /app/frontend

# 1. Build the web bundle (CRA → build/)
yarn build

# 2. Add native platforms (run ONCE per repo)
npx cap add ios       # macOS only — generates frontend/ios/
npx cap add android   # Linux/Mac/Win — generates frontend/android/

# 3. Sync the build + plugins into native projects
npx cap sync
```

---

## Daily workflow

After any React/JS change:

```bash
yarn cap:sync    # rebuilds web bundle + copies into native projects
# then in Xcode/Android Studio: Cmd+R / Run
```

Or live-reload to a device while developing:

```bash
yarn cap:run:ios
yarn cap:run:android
```

---

## Shipping to the stores

### iOS — App Store Connect
```bash
yarn cap:open:ios          # opens Xcode
# In Xcode:
#  1. Select target: OneX Club > Signing & Capabilities > sign with your Apple Developer Team
#  2. Product → Archive
#  3. Window → Organizer → Distribute App → App Store Connect
```

### Android — Google Play Console
```bash
yarn cap:open:android      # opens Android Studio
# In Android Studio:
#  1. File → Project Structure → Modules → "app" → Signing Configs → add release keystore
#  2. Build → Generate Signed Bundle/APK → Android App Bundle (.aab)
#  3. Upload .aab to Play Console
```

---

## App metadata (set before submission)

| Field                 | iOS                                    | Android                                |
|-----------------------|----------------------------------------|----------------------------------------|
| Bundle ID / Package   | `club.onex.app`                        | `club.onex.app`                        |
| App name              | OneX Club                              | OneX Club                              |
| Display name (home)   | "OneX Club"                            | "OneX Club"                            |
| Primary category      | Finance                                | Finance                                |
| Privacy policy URL    | https://onex.finance/privacy           | https://onex.finance/privacy           |
| Support URL           | https://onex.finance/support           | https://onex.finance/support           |
| Min OS                | iOS 14.0+                              | Android 6.0+ (API 23)                  |

---

## Icons & splash

Generate icons + splash using **@capacitor/assets** (preferred) — drop one
1024×1024 PNG into `frontend/assets/icon.png` and a 2732×2732 splash into
`frontend/assets/splash.png`, then:

```bash
yarn add -D @capacitor/assets
npx capacitor-assets generate
```

This produces all required iOS + Android icon variants automatically.

---

## API config

The native app talks to the same backend the web app uses
(`REACT_APP_BACKEND_URL`). Nothing else to configure.

Note: since the API is HTTPS, no extra `NSAppTransportSecurity` flag
or `usesCleartextTraffic` is needed.

---

## Troubleshooting

- **White screen on cold boot** → ensure `webDir` in `capacitor.config.ts` matches the CRA output folder (`build`). Re-run `yarn cap:sync`.
- **API calls fail with CORS** → backend CORS already allows `capacitor://localhost` + `https://localhost` origins via the FastAPI `*` setting. No change needed.
- **Bottom nav hidden behind home indicator** → already handled by `env(safe-area-inset-bottom)` in `index.css`.
- **Status bar text invisible on light backgrounds** → toggle `StatusBar.setStyle({ style: Style.Light })` in `native.js`.
