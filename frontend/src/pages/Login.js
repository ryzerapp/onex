import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Mail, KeyRound, Loader2 } from "lucide-react";
import BrandMark from "@/components/common/BrandMark";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Login = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [mode, setMode] = React.useState("choose"); // choose | email-input | otp-input
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [remember, setRemember] = React.useState(true);  // Default ON — sticky 30-day session.

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) { try { sessionStorage.setItem("onex_ref", refCode); } catch (e) { /* ignore */ } }
    // After a successful Google OAuth round-trip the backend appends `?auth=google`.
    // Refresh the auth context so the session cookie is recognised, then bounce to dashboard.
    if (params.get("auth") === "google") {
      api.get("/auth/me").then(({ data }) => {
        if (data?.user) {
          setUser(data.user);
          navigate("/dashboard", { replace: true });
        }
      }).catch(() => {});
      return;
    }
    // OAuth error surfaced by the callback (?error=token_exchange_failed etc.).
    const oauthError = params.get("error");
    if (oauthError) {
      toast.error(`Google sign-in failed: ${oauthError.replace(/_/g, " ")}`);
    }
    // Email pre-filled from the waitlist welcome email's CTA — skip the "choose method" step
    // and land the visitor directly in the email-OTP entry box (or they can hit Back for Google).
    const prefillEmail = params.get("email");
    if (prefillEmail && prefillEmail.includes("@")) {
      setEmail(prefillEmail);
      setMode("email-input");
    }
  }, [navigate, setUser]);

  React.useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [user, navigate]);

  // Self-hosted Google OAuth — backend handles redirect to Google with the right
  // origin-derived redirect_uri. Carries any active ?ref=<code> through to the callback.
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
  const handleGoogle = (e) => {
    e.preventDefault();
    let ref = "";
    try { ref = sessionStorage.getItem("onex_ref") || ""; } catch { /* ignore */ }
    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    if (remember) params.set("remember", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/google/login${qs}`;
  };

  const startEmail = async (e) => {
    e?.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    try {
      let ref = null;
      try { ref = sessionStorage.getItem("onex_ref"); } catch (e) { /* ignore */ }
      await api.post("/auth/email/start", { email: email.trim().toLowerCase(), ref });
      toast.success("Check your inbox for the 6-digit code.");
      setMode("otp-input");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send code");
    } finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/email/verify", { email: email.trim().toLowerCase(), code: otp.trim(), remember });
      try { sessionStorage.removeItem("onex_ref"); } catch (e) { /* ignore */ }
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid code");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen w-full flex" data-testid="login-page">
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md fade-in-up">
          <div className="flex items-center gap-3 mb-12">
            <BrandMark size={48} glow />
            <div>
              <div className="text-[18px] font-semibold leading-none"><span className="text-white">OneX</span> <span className="onex-gold-text">Club</span></div>
              <div className="text-[10px] tracking-[0.2em] text-zinc-500 mt-1.5 uppercase">Dubai · Assets</div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-medium text-white leading-[1.05] tracking-tight">
            Become a co-owner of Dubai{"’"}s most exclusive assets.
          </h1>
          <p className="mt-5 text-zinc-400 text-[15px] leading-relaxed">
            OneX Club is invitation-only. Sign in with Google, or use your email — we{"’"}ll send you a 6-digit code.
          </p>

          {(mode === "choose" || mode === "email-input") && (
            <label
              className="mt-6 flex items-center gap-2.5 cursor-pointer select-none group"
              data-testid="login-remember-label"
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                data-testid="login-remember-toggle"
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-[5px] border border-[#3F3F46] bg-[#15161A] grid place-items-center
                           peer-checked:bg-[#8CFF2E] peer-checked:border-[#8CFF2E]
                           transition-colors group-hover:border-zinc-400"
              >
                {remember && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L4.7 8.7L9.5 3.5" stroke="#0A0A0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="text-[13px] text-zinc-400 group-hover:text-zinc-200">
                Stay signed in for 30 days
              </span>
            </label>
          )}

          {mode === "choose" && (
            <div className="mt-4 space-y-3">
              <a href="#" onClick={handleGoogle} data-testid="login-google-btn" className="w-full btn-gold !py-4 text-[15px]">
                Continue with Google <ArrowRight size={18} />
              </a>
              <button onClick={() => setMode("email-input")} data-testid="login-email-toggle" className="w-full btn-ghost !py-4 text-[14px]">
                <Mail size={16} /> Sign in with email
              </button>
            </div>
          )}

          {mode === "email-input" && (
            <form onSubmit={startEmail} className="mt-4 space-y-3" data-testid="login-email-form">
              <label className="block text-[12px] text-zinc-500 uppercase tracking-[0.15em]">Your email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                data-testid="login-email-input"
                className="w-full onex-card-soft px-4 py-3.5 text-white outline-none focus:border-[#8CFF2E]/40"
              />
              <button type="submit" disabled={busy} data-testid="login-email-send-btn" className="w-full btn-gold !py-4 text-[15px]">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send 6-digit code <ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={() => setMode("choose")} className="w-full text-[12px] text-zinc-500 hover:text-zinc-300 mt-1">← Use Google instead</button>
            </form>
          )}

          {mode === "otp-input" && (
            <form onSubmit={verifyOtp} className="mt-8 space-y-3" data-testid="login-otp-form">
              <label className="block text-[12px] text-zinc-500 uppercase tracking-[0.15em]">Enter the 6-digit code we sent to {email}</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="123456"
                data-testid="login-otp-input"
                className="w-full onex-card-soft px-4 py-3.5 text-white outline-none focus:border-[#8CFF2E]/40 text-center text-[22px] tracking-[0.4em] font-mono"
              />
              <button type="submit" disabled={busy || otp.length !== 6} data-testid="login-otp-verify-btn" className="w-full btn-gold !py-4 text-[15px]">
                {busy ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : <><KeyRound size={16} /> Verify & sign in</>}
              </button>
              <button type="button" onClick={() => setMode("email-input")} className="w-full text-[12px] text-zinc-500 hover:text-zinc-300 mt-1">← Use a different email</button>
            </form>
          )}

          <p className="text-[12px] text-zinc-500 text-center mt-6">
            We never post on your behalf. Your profile stays private.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative onex-skyline">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0B]/80 via-transparent to-transparent" />
        <div className="relative z-10 m-auto max-w-md px-8 text-center">
          <div className="onex-pill bg-white/10 text-white">Invitation Only</div>
          <h2 className="font-display text-4xl text-white mt-4 leading-tight">Apple Wallet meets Dubai real estate.</h2>
          <p className="text-zinc-300 mt-3 text-[14px]">Five flagship launches. Curated by OneX. Reserved for members.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
