/**
 * Admin login — separate from the member login page.
 *
 * Email + password, rate-limited server-side (5 attempts / 15 min per ip+email).
 * On success the backend sets the same `session_token` cookie used elsewhere,
 * so once we land on /admin/dashboard the existing AdminGuard verifies access.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const formatErr = (detail) => {
  if (!detail) return "Something went wrong. Try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("surya@onex.exchange");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await api.post("/admin/auth/login", { email: email.trim().toLowerCase(), password });
      // Cookie is set; refresh auth context so AdminGuard picks up the user.
      const { data } = await api.get("/auth/me");
      if (data?.user) setUser(data.user);
      toast.success("Welcome back, admin");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(formatErr(err?.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#0A0A0B] px-6" data-testid="admin-login-page">
      <div className="onex-card w-full max-w-md p-8">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#8CFF2E]">
          <ShieldCheck size={12} /> OneX Admin
        </div>
        <h1 className="text-[28px] font-display tracking-tight text-white mt-3 leading-tight">Sign in to the admin panel</h1>
        <p className="text-zinc-400 text-[13px] mt-2">
          Restricted to OneX super admins. All sign-ins are logged.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-1.5">Admin email</div>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              data-testid="admin-login-email"
              className="w-full bg-[#0F1014] border border-[#27272A] rounded-xl px-3 py-3 text-white text-[14px] placeholder:text-zinc-600 focus:outline-none focus:border-[#8CFF2E]/60"
            />
          </label>
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-1.5">Password</div>
            <div className="relative">
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                data-testid="admin-login-password"
                className="w-full bg-[#0F1014] border border-[#27272A] rounded-xl pl-10 pr-3 py-3 text-white text-[14px] placeholder:text-zinc-600 focus:outline-none focus:border-[#8CFF2E]/60"
              />
              <Lock size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-zinc-500" />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-[13px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl px-3 py-2.5" data-testid="admin-login-error">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button
            type="submit" disabled={busy}
            data-testid="admin-login-submit"
            className="w-full btn-gold !py-3.5 disabled:opacity-50"
          >
            {busy ? "Signing in…" : <>Sign in to admin <ArrowRight size={14} /></>}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#27272A] text-[12px] text-zinc-500">
          Looking for the member app? <a href="/login" className="text-[#8CFF2E] hover:underline">Sign in there →</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
