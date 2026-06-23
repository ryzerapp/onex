/**
 * AdminGuard — wraps the admin route tree.
 * Behaviour:
 *   1. Not authenticated   → redirect to /login
 *   2. Authenticated but NOT in ADMIN_EMAILS allowlist → render 403 page
 *   3. Authenticated + admin → render children (i.e. <AdminLayout>)
 *
 * Allowlist is *also* enforced server-side; this is a UX optimisation only.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

const ADMIN_EMAILS = ["surya@onex.exchange"];

const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0A0A0B]" data-testid="admin-guard-loading">
        <div className="w-10 h-10 rounded-full border-2 border-[#8CFF2E]/30 border-t-[#8CFF2E] animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;

  const ok = ADMIN_EMAILS.includes((user.email || "").toLowerCase());
  if (!ok) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0A0A0B] px-6" data-testid="admin-403">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 grid place-items-center mx-auto">
            <ShieldAlert size={22} className="text-[#EF4444]" />
          </div>
          <h1 className="text-[24px] font-display text-white mt-5">Admin only</h1>
          <p className="text-zinc-400 text-[14px] mt-2">
            This area is restricted to OneX super admins. Signed in as <span className="text-white">{user.email}</span>.
          </p>
          <a href="/dashboard" className="btn-gold mt-6 inline-flex">Back to your dashboard</a>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminGuard;
