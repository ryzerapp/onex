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

  React.useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get("ref");
    if (refCode) { try { sessionStorage.setItem("onex_ref", refCode); } catch (e) {} }
  }, []);

  React.useEffect(() => { if (user) navigate("/dashboard", { replace: true }); }, [user, navigate]);

  const redirectUrl = typeof window !== "undefined" ? window.location.origin + "/dashboard" : "/dashboard";
  const oauthHref = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  const handleGoogle = (e) => { e.preventDefault(); window.location.href = oauthHref; };

  const startEmail = async (e) => {
    e?.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    try {
      let ref = null;
      try { ref = sessionStorage.getItem("onex_ref"); } catch {}
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
      const { data } = await api.post("/auth/email/verify", { email: email.trim().toLowerCase(), code: otp.trim() });
      try { sessionStorage.removeItem("onex_ref"); } catch {}
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

          {mode === "choose" && (
            <div className="mt-8 space-y-3">
              <a href={oauthHref} onClick={handleGoogle} data-testid="login-google-btn" className="w-full btn-gold !py-4 text-[15px]">
                Continue with Google <ArrowRight size={18} />
              </a>
              <button onClick={() => setMode("email-input")} data-testid="login-email-toggle" className="w-full btn-ghost !py-4 text-[14px]">
                <Mail size={16} /> Sign in with email
              </button>
            </div>
          )}

          {mode === "email-input" && (
            <form onSubmit={startEmail} className="mt-8 space-y-3" data-testid="login-email-form">
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
