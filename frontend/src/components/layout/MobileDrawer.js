import React, { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { X, LogOut, ChevronRight, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { navGroups } from "@/components/layout/navItems";

/** Slide-in drawer with full nav. Closes on route change and Escape. */
const MobileDrawer = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close on route change. We intentionally exclude `open`/`onClose` — when the
  // pathname changes we always want to dismiss the drawer if it's open.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ESC to close.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const initials = (user?.name || "OneX").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="mobile-drawer-backdrop"
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer panel */}
      <aside
        data-testid="mobile-drawer"
        className={`lg:hidden fixed top-0 right-0 z-[70] h-full w-[86%] max-w-[340px] bg-[#0A0A0B] border-l border-[#1A1B1F] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1A1B1F]">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user?.name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#8CFF2E]/15 text-[#8CFF2E] flex items-center justify-center font-semibold">{initials}</div>
            )}
            <div className="leading-tight">
              <div className="text-white text-[15px] font-medium">{user?.name || "Member"}</div>
              <div className="text-[11px] text-zinc-500">{user?.tier || "Cadet"} Tier</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="mobile-drawer-close"
            className="w-10 h-10 rounded-xl bg-[#15161A] border border-[#27272A] flex items-center justify-center active:scale-95 transition"
            aria-label="Close menu"
          >
            <X size={18} className="text-zinc-200" />
          </button>
        </div>

        {/* AED balance */}
        <button
          type="button"
          onClick={() => navigate("/benefits-ladder")}
          data-testid="drawer-aed-balance"
          className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#8CFF2E]/30 bg-[#1F3008]/40 hover:bg-[#1F3008]/60 transition-all px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8CFF2E]/15 border border-[#8CFF2E]/30 flex items-center justify-center">
              <Wallet size={15} className="text-[#8CFF2E]" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Co-Owner Credits</div>
              <div className="text-[16px] font-semibold text-white">AED {user?.aed_balance ?? 0}</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-400" />
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto onex-scroll px-2 mt-4 pb-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="onex-sidebar-label">{group.label}</div>
              {group.items.map(({ to, icon: Icon, name, testId }) => (
                <NavLink
                  key={to}
                  to={to}
                  data-testid={`drawer-${testId}`}
                  className={({ isActive }) => `onex-sidebar-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{name}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <button
          type="button"
          onClick={() => { onClose(); logout(); }}
          data-testid="mobile-drawer-logout"
          className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-2xl border border-[#27272A] bg-[#15161A] hover:border-[#EF4444]/40 transition-all py-3 text-[13px] text-zinc-300 active:scale-[0.99]"
        >
          <LogOut size={14} /> Sign out
        </button>
      </aside>
    </>
  );
};

export default MobileDrawer;
