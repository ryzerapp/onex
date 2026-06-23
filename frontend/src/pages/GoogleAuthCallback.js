import React, { useEffect } from "react";

/**
 * Google OAuth callback bounce page.
 *
 * Google redirects to `https://<frontend>/auth/google/callback?code=...&state=...`.
 * Kubernetes ingress routes this path to the frontend (only `/api/*` reaches the
 * backend), so we immediately forward the same query string to the backend's
 * `/api/auth/google/callback` — which exchanges the code, sets the session
 * cookie, and 302s back to `/dashboard`.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 */
const GoogleAuthCallback = () => {
  useEffect(() => {
    // Same-origin redirect — preserves all OAuth params (code, state, error).
    window.location.replace(`/api/auth/google/callback${window.location.search}`);
  }, []);

  return (
    <div data-testid="google-auth-bounce" className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-white">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8CFF2E]/30 border-t-[#8CFF2E] animate-spin mx-auto" />
        <div className="mt-5 text-[14px] text-zinc-400">Signing you in…</div>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
