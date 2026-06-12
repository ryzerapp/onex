import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Sprout, Crown, Building2, Target, Calendar,
  Gift, Trophy, MessageSquare, Diamond, Headphones, Settings as SettingsIcon,
  Wallet, ChevronRight, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const groups = [
  {
    label: "My Journey",
    items: [
      { to: "/dashboard", icon: Home, name: "Dashboard", testId: "sidebar-dashboard-link" },
      { to: "/progress", icon: Sprout, name: "My Progress", testId: "sidebar-progress-link" },
      { to: "/benefits-ladder", icon: Crown, name: "Benefits Ladder", testId: "sidebar-benefits-ladder-link" },
    ],
  },
  {
    label: "Discover",
    items: [
      { to: "/properties", icon: Building2, name: "Dubai Properties", testId: "sidebar-properties-link" },
      { to: "/allocation-interests", icon: Target, name: "Allocation Interests", testId: "sidebar-allocation-link" },
      { to: "/webinars", icon: Calendar, name: "Webinar Events", testId: "sidebar-webinars-link" },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/invite", icon: Gift, name: "Invite & Earn", testId: "sidebar-invite-link" },
      { to: "/leaderboard", icon: Trophy, name: "Leaderboard", testId: "sidebar-leaderboard-link" },
      { to: "/community", icon: MessageSquare, name: "Community Updates", testId: "sidebar-community-link" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/co-owner-benefits", icon: Diamond, name: "Co-Owner Benefits", testId: "sidebar-co-owner-benefits-link" },
      { to: "/support", icon: Headphones, name: "Support Center", testId: "sidebar-support-link" },
      { to: "/settings", icon: SettingsIcon, name: "Settings", testId: "sidebar-settings-link" },
    ],
  },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "OneX").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[280px] bg-[#0A0A0B] border-r border-[#1A1B1F] px-4 py-6 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-2" data-testid="brand-block">
        <div className="w-12 h-12 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl tracking-tight">1X</div>
        <div>
          <div className="text-[17px] font-semibold leading-none">
            <span className="text-white">OneX</span> <span className="onex-gold-text">Club</span>
          </div>
          <div className="text-[10px] tracking-[0.2em] text-zinc-500 mt-1.5 uppercase">Dubai · Assets</div>
        </div>
      </div>

      <nav className="flex-1 mt-4 overflow-y-auto onex-scroll pr-1">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="onex-sidebar-label">{group.label}</div>
            {group.items.map(({ to, icon: Icon, name, testId }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={testId}
                className={({ isActive }) => `onex-sidebar-item ${isActive ? "active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* AED balance card */}
      <button
        type="button"
        onClick={() => navigate("/benefits-ladder")}
        data-testid="sidebar-aed-balance-card"
        className="mt-4 w-full flex items-center justify-between gap-3 rounded-2xl border border-[#27272A] bg-[#15161A] hover:border-[#FACC15]/40 transition-all px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FACC15]/10 border border-[#FACC15]/30 flex items-center justify-center">
            <Wallet size={16} className="text-[#FACC15]" />
          </div>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Co-Owner Credits</div>
            <div className="text-[15px] font-semibold text-white">AED {user?.aed_balance ?? 0}</div>
          </div>
        </div>
        <ChevronRight size={16} className="text-zinc-500" />
      </button>

      {/* Profile card */}
      <button
        type="button"
        onClick={() => navigate("/settings")}
        data-testid="sidebar-profile-card"
        className="mt-3 w-full flex items-center justify-between gap-3 rounded-2xl border border-[#27272A] bg-[#15161A] hover:border-[#FACC15]/30 transition-all px-3 py-2.5"
      >
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt={user?.name} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#FACC15]/15 text-[#FACC15] flex items-center justify-center font-semibold text-sm">{initials}</div>
          )}
          <div className="text-left">
            <div className="text-[14px] font-medium text-white leading-tight">{user?.name?.split(" ")[0] || "Member"}</div>
            <div className="text-[11px] text-zinc-500">{user?.tier || "Cadet"} Tier</div>
          </div>
        </div>
        <ChevronDown size={14} className="text-zinc-500" />
      </button>

      <button
        type="button"
        onClick={logout}
        data-testid="sidebar-logout-btn"
        className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 uppercase tracking-[0.2em] py-1"
      >
        Sign out
      </button>
    </aside>
  );
};

export default Sidebar;
