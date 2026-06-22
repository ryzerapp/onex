/**
 * Capacitor-only side effects (statusbar, splash, hardware back, haptics).
 * No-ops in the browser — guarded by Capacitor.isNativePlatform().
 */
import { Capacitor } from "@capacitor/core";

export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0A0A0B" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) { /* statusbar plugin not present on this platform */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Splash auto-hides per config, but force-hide once React renders.
    setTimeout(() => SplashScreen.hide().catch(() => {}), 400);
  } catch (e) { /* splash plugin not present */ }

  try {
    const { App } = await import("@capacitor/app");
    // Hardware Back on Android → if no history, exit; else go back.
    App.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) App.exitApp();
      else window.history.back();
    });
  } catch (e) { /* app plugin not present */ }
}
