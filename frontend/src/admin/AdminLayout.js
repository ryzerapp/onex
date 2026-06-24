/**
 * Admin shell layout — separate from the member AppLayout.
 * Sidebar with admin sections + content slot. Renders only inside AdminGuard.
 */
import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, Calendar, Megaphone, Award,
  Bookmark, Bell, LogOut, ShieldCheck,
} from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import BuildInfo from "@/components/common/BuildInfo";

const NAV = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/properties", label: "Properties", icon: Building2 },
  { to: "/admin/webinars", label: "Webinars", icon: Calendar },
  { to: "/admin/community", label: "Community Updates", icon: Megaphone },
  { to: "/admin/benefits", label: "Co-Owner Benefits", icon: Award },
  { to: "/admin/allocations", label: "Allocation Interests", icon: Bookmark },
  { to: "/admin/notify", label: "Notifications", icon: Bell },
];

const AdminLayout = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex">
      <aside className="hidden md:flex w-64 border-r border-[#27272A] bg-[#0A0A0B] flex-col" data-testid="admin-sidebar">
        <div className="px-5 py-6 border-b border-[#27272A]">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8CFF2E] grid place-items-center font-bold text-[#0A0A0B]">1X</div>
            <div>
              <div className="text-white font-semibold text-[14px]">OneX Admin</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8CFF2E] flex items-center gap-1">
                <ShieldCheck size={10} /> Super
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                isActive ? "bg-[#8CFF2E]/12 text-white" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[#27272A] space-y-1">
          <Link to="/dashboard" data-testid="admin-back-to-app" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.04]">
            ← Back to member app
          </Link>
          <button onClick={logout} data-testid="admin-logout-btn" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.04]">
            <LogOut size={16} /> Logout
          </button>
          <div className="px-3 py-2 text-[11px] text-zinc-600 truncate">{user?.email}</div>
          <div className="px-3 pb-1 text-[10px] text-zinc-700">
            <BuildInfo>v1.0.0 · hold for build info</BuildInfo>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-6 sm:px-10 py-8 onex-scroll overflow-y-auto" data-testid="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
