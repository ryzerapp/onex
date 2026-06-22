import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Capture ?ref=<code> on landing for referral attribution (persists across the OAuth round-trip).
  React.useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get("ref");
    if (refCode) {
      try { sessionStorage.setItem("onex_ref", refCode); } catch (e) { /* noop */ }
    }
  }, []);

  const redirectUrl = typeof window !== "undefined" ? window.location.origin + "/dashboard" : "/dashboard";
  const oauthHref = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

  const handleGoogle = (e) => {
    e.preventDefault();
    window.location.href = oauthHref;
  };

  return (
    <div className="min-h-screen w-full flex" data-testid="login-page">
      {/* Left panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md fade-in-up">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl">1X</div>
            <div>
              <div className="text-[18px] font-semibold leading-none">
                <span className="text-white">OneX</span> <span className="onex-gold-text">Club</span>
              </div>
              <div className="text-[10px] tracking-[0.2em] text-zinc-500 mt-1.5 uppercase">Dubai · Assets</div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-display font-medium text-white leading-[1.05] tracking-tight">
            Become a co-owner of Dubai’s most exclusive assets.
          </h1>
          <p className="mt-5 text-zinc-400 text-[15px] leading-relaxed">
            OneX Club is invitation-only. Sign in to unlock priority allocations, executive briefings, and the AED Balance system.
          </p>

          <div className="mt-10 space-y-3">
            <a
              href={oauthHref}
              onClick={handleGoogle}
              data-testid="login-google-btn"
              className="w-full btn-gold !py-4 text-[15px]"
            >
              Continue with Google
              <ArrowRight size={18} />
            </a>
            <p className="text-[12px] text-zinc-500 text-center mt-4">
              We never post on your behalf. Your profile stays private.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="onex-card-soft p-4">
              <ShieldCheck size={18} className="text-[#FACC15] mb-2" />
              <div className="text-[13px] font-medium text-white">Bank-grade security</div>
              <div className="text-[12px] text-zinc-500 mt-1">Encrypted at rest and in transit.</div>
            </div>
            <div className="onex-card-soft p-4">
              <Sparkles size={18} className="text-[#FACC15] mb-2" />
              <div className="text-[13px] font-medium text-white">Priority access</div>
              <div className="text-[12px] text-zinc-500 mt-1">Members allocate before the public.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right showcase */}
      <div className="hidden lg:flex flex-1 relative onex-skyline">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0A0B]/80 via-transparent to-transparent" />
        <div className="relative z-10 m-auto max-w-md px-8 text-center">
          <div className="onex-pill bg-white/10 text-white">Invitation Only</div>
          <h2 className="font-display text-4xl text-white mt-4 leading-tight">
            Apple Wallet meets Dubai real estate.
          </h2>
          <p className="text-zinc-300 mt-3 text-[14px]">
            Five flagship launches. Curated by OneX. Reserved for members.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
