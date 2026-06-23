import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api";

/**
 * Site-wide referral capture. As soon as the user lands on ANY route with `?ref=<code>`:
 *   1. Persist the code in sessionStorage so signup attribution still works downstream.
 *   2. Fire-and-forget a POST /api/referrals/click so the referrer's dashboard shows the visit.
 * No UI, no auth required.
 */
export default function ReferralCapture() {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("ref") || "").trim().toLowerCase();
    if (!code) return;
    try { sessionStorage.setItem("onex_ref", code); } catch (e) { /* ignore */ }
    // Best-effort click log. Failure is silent — it should never block UX.
    api.post("/referrals/click", { code, source: location.pathname || "landing" }).catch(() => {});
  }, [location.pathname]);
  return null;
}
