import type { CapacitorConfig } from "@capacitor/cli";

/**
 * OneX Club™ — Capacitor configuration
 *
 * The web build (CRA `yarn build` → `build/`) is loaded into a native shell on iOS & Android.
 * All `/api/*` calls keep going to REACT_APP_BACKEND_URL exactly as in the web app.
 *
 * To wire native projects:
 *   yarn build           # creates ./build
 *   npx cap add ios      # one-time (requires macOS + Xcode)
 *   npx cap add android  # one-time (requires Android Studio)
 *   npx cap sync         # copies build/ + plugins into native projects
 *   npx cap open ios     # opens Xcode → archive + upload to App Store Connect
 *   npx cap open android # opens Android Studio → bundle → upload to Play Console
 */
const config: CapacitorConfig = {
  appId: "club.onex.app",
  appName: "OneX Club",
  webDir: "build",
  bundledWebRuntime: false,
  backgroundColor: "#0A0A0B",
  ios: {
    contentInset: "always",
    backgroundColor: "#0A0A0B",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#0A0A0B",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0A0A0B",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A0A0B",
      overlaysWebView: false,
    },
  },
};

export default config;
