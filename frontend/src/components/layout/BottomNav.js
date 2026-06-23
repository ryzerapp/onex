import React from "react";
import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { bottomNavItems } from "@/components/layout/navItems";

/** Fixed bottom navigation bar shown on mobile (<lg). Five tabs; the last opens the drawer. */
const BottomNav = ({ onOpenMore }) => {
  return (
    <nav
      data-testid="bottom-nav"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0A0A0B]/95 backdrop-blur-md border-t border-[#1A1B1F]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {bottomNavItems.map(({ to, icon: Icon, name, testId }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              data-testid={testId}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors active:scale-[0.95] ${
                  isActive ? "text-[#8CFF2E]" : "text-zinc-500 hover:text-zinc-300"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all ${
                      isActive
                        ? "bg-[#8CFF2E]/15 border border-[#8CFF2E]/30 shadow-[0_0_14px_-4px_rgba(140,255,46,0.4)]"
                        : "bg-transparent border border-transparent"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  <span className="leading-none">{name}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMore}
            data-testid="bottom-nav-more"
            className="w-full flex flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-medium text-zinc-500 hover:text-zinc-300 active:scale-[0.95] transition-all"
            aria-label="Open more"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-2xl bg-transparent border border-transparent">
              <MoreHorizontal size={18} strokeWidth={1.8} />
            </span>
            <span className="leading-none">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default BottomNav;
