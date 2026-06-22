import React from "react";
import { Menu, Wallet, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BrandMark from "@/components/common/BrandMark";

/** Sticky top bar shown on mobile (<lg). Contains brand, AED balance, notifications and the drawer trigger. */
const MobileTopBar = ({ onOpenMenu }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <header
      data-testid="mobile-top-bar"
      className="lg:hidden sticky top-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#1A1B1F]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5"
          data-testid="mobile-brand"
          aria-label="OneX Club home"
        >
          <BrandMark size={36} />
          <div className="leading-none">
            <div className="text-[14px] font-semibold">
              <span className="text-white">OneX</span> <span className="onex-gold-text">Club</span>
            </div>
            <div className="text-[9px] tracking-[0.2em] text-zinc-500 mt-1 uppercase">Dubai · Assets</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/benefits-ladder")}
            data-testid="mobile-aed-balance"
            className="flex items-center gap-1.5 rounded-full bg-[#8CFF2E]/10 border border-[#8CFF2E]/30 px-3 py-1.5"
            aria-label="View AED balance"
          >
            <Wallet size={12} className="text-[#8CFF2E]" />
            <span className="text-[12px] font-semibold text-white tabular-nums">{user?.aed_balance ?? 0}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/community")}
            data-testid="mobile-notifications"
            className="relative w-10 h-10 rounded-xl bg-[#15161A] border border-[#27272A] flex items-center justify-center active:scale-95 transition"
            aria-label="View notifications"
          >
            <Bell size={16} className="text-zinc-200" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#8CFF2E]" />
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            data-testid="mobile-menu-trigger"
            className="w-10 h-10 rounded-xl bg-[#15161A] border border-[#27272A] flex items-center justify-center active:scale-95 transition"
            aria-label="Open menu"
          >
            <Menu size={18} className="text-zinc-200" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
