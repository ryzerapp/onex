/**
 * Admin Overview — KPIs, top referrers, recent activity at a glance.
 */
import React, { useEffect, useState } from "react";
import { api } from "@/api";
import {
  Users, Building2, Calendar, UserPlus, Wallet, Bookmark, Mail, Trophy,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent = "#8CFF2E" }) => (
  <div className="onex-card p-5" data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
    <div className="flex items-center gap-2 text-zinc-500 text-[11px] uppercase tracking-[0.16em]">
      <Icon size={12} style={{ color: accent }} /> {label}
    </div>
    <div className="text-white text-[28px] font-display tabular-nums mt-2">{value}</div>
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/overview").then(({ data }) => setData(data)); }, []);

  if (!data) return <div className="text-zinc-400" data-testid="admin-dashboard-loading">Loading…</div>;

  return (
    <div data-testid="admin-dashboard">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#8CFF2E]">OneX Admin</div>
        <h1 className="text-[36px] sm:text-[44px] font-display tracking-tight text-white mt-2">Overview</h1>
        <p className="text-zinc-400 text-[14px] mt-2 max-w-xl">
          Real-time pulse of every signup, referral, allocation interest and AED earned across OneX Club.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <StatCard icon={Users}      label="Total users"       value={data.users_count.toLocaleString()} />
        <StatCard icon={Building2}  label="Live properties"   value={data.properties_count.toLocaleString()} />
        <StatCard icon={Calendar}   label="Active webinars"   value={data.webinars_count.toLocaleString()} />
        <StatCard icon={UserPlus}   label="Total referrals"   value={data.referrals_count.toLocaleString()} accent="#A78BFA" />
        <StatCard icon={Wallet}     label="AED distributed"   value={`+${data.total_aed_distributed.toLocaleString()}`} />
        <StatCard icon={Bookmark}   label="Allocation interests" value={data.allocation_interests.toLocaleString()} accent="#F472B6" />
        <StatCard icon={Mail}       label="Waitlist signups"  value={data.waitlist_signups.toLocaleString()} accent="#60A5FA" />
        <StatCard icon={Trophy}     label="Pro-Owners"        value={(data.by_tier["Pro-Owner"] || 0)} accent="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Tier distribution */}
        <div className="onex-card p-6" data-testid="admin-tier-distribution">
          <div className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Tier distribution</div>
          <div className="mt-4 space-y-3">
            {["Member","Insider","Co-Owner","Pro-Owner"].map((t) => {
              const count = data.by_tier[t] || 0;
              const pct = data.users_count ? Math.round((count / data.users_count) * 100) : 0;
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-white">{t}</span>
                    <span className="text-zinc-400 tabular-nums">{count} <span className="text-zinc-600">· {pct}%</span></span>
                  </div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-[#27272A] overflow-hidden">
                    <div className="h-full bg-[#8CFF2E]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top referrers */}
        <div className="onex-card p-6" data-testid="admin-top-referrers">
          <div className="text-[12px] uppercase tracking-[0.16em] text-zinc-500">Top referrers</div>
          <ul className="mt-4 space-y-3">
            {data.top_referrers.map((r, i) => (
              <li key={r.user_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#15161A] border border-[#27272A] grid place-items-center text-[12px] text-zinc-400 tabular-nums">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[13px] font-medium truncate">{r.name}</div>
                  <div className="text-zinc-500 text-[11px] truncate">{r.email}</div>
                </div>
                <div className="text-[#8CFF2E] text-[14px] font-semibold tabular-nums">{r.count}</div>
              </li>
            ))}
            {data.top_referrers.length === 0 && (
              <li className="text-zinc-500 text-[13px]">No referrals yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
