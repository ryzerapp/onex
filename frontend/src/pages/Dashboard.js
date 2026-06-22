import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import ProgressRing from "@/components/common/ProgressRing";
import {
  Hand, Bell, ArrowRight, ChevronRight, Star, Smartphone, IdCard, Calendar, PieChart,
  UserPlus, Flag, Building2, Wallet, CheckCircle2, Gift,
} from "lucide-react";

const iconMap = { "user-plus": UserPlus, smartphone: Smartphone, "id-card": IdCard, calendar: Calendar, "pie-chart": PieChart, flag: Flag };

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1_000;

const Countdown = ({ target }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MS_PER_SECOND);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(diff / MS_PER_DAY);
  const hours = Math.floor((diff / MS_PER_HOUR) % 24);
  const mins = Math.floor((diff / MS_PER_MINUTE) % 60);
  const secs = Math.floor((diff / MS_PER_SECOND) % 60);
  return [["Days", days], ["Hours", hours], ["Mins", mins], ["Secs", secs]].map(([label, v]) => (
    <div key={label} className="text-center">
      <div className="text-[24px] font-semibold text-white tabular-nums">{String(v).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mt-0.5">{label}</div>
    </div>
  ));
};

const ActivityIcon = ({ kind }) => {
  const map = {
    milestone: { Icon: CheckCircle2, color: "#22C55E" },
    webinar: { Icon: Calendar, color: "#A78BFA" },
    join: { Icon: Star, color: "#8CFF2E" },
    waitlist: { Icon: Building2, color: "#8CFF2E" },
  };
  const { Icon, color } = map[kind] || { Icon: Gift, color: "#8CFF2E" };
  return <Icon size={16} style={{ color }} />;
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) {
    return <div className="text-zinc-500" data-testid="dashboard-loading">Loading your journey…</div>;
  }

  const { user, next_milestone, next_reward, all_milestones_done, next_tier, spotlight_property, stats, recent_activity } = data;
  const nextMilestonePct = data.milestones_total ? Math.round((data.milestones_completed / data.milestones_total) * 100) : 0;
  const tierPct = Math.min(100, Math.round((user.aed_balance / next_tier.threshold) * 100));

  return (
    <div data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display tracking-tight text-white flex items-center gap-3">
            Welcome back, {user.name.split(" ")[0]}!
            <Hand className="text-[#8CFF2E]" size={32} />
          </h1>
          <p className="text-zinc-400 mt-3 text-[15px]">Your journey to co-ownership starts here.</p>
        </div>
        <div className="flex items-center gap-4">
          <button data-testid="dashboard-notifications-btn" className="relative w-11 h-11 rounded-full border border-[#27272A] bg-[#15161A] hover:bg-[#1E1F24] transition-all flex items-center justify-center">
            <Bell size={16} className="text-zinc-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8CFF2E]" />
          </button>
          <button
            onClick={() => navigate("/benefits-ladder")}
            data-testid="dashboard-balance-pill"
            className="onex-card flex items-center gap-3 px-5 py-3 hover:border-[#8CFF2E]/40 transition-all"
          >
            <div className="w-11 h-11 rounded-2xl onex-gold-fill flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Co-Owner Credits Balance</div>
              <div className="text-[20px] font-semibold text-[#8CFF2E] leading-none mt-1">AED {user.aed_balance}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Reduce effective entry on upcoming assets</div>
            </div>
            <ChevronRight size={16} className="text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Top trio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Next milestone / tier rollover */}
        {all_milestones_done && next_reward?.kind !== "milestone" ? (
          <div className="onex-card p-6 sm:p-7" data-testid="dashboard-next-milestone-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-[#22C55E] flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Journey Complete
                </div>
                <h3 className="text-[22px] font-semibold text-white mt-3">
                  {next_reward?.kind === "maxed" ? "Elite Co-Owner" : next_reward?.label}
                </h3>
                <p className="text-zinc-400 text-[14px] mt-1.5 max-w-[260px]">
                  {next_reward?.kind === "maxed"
                    ? "Every benefit unlocked. Welcome to the top tier."
                    : `AED ${next_reward?.amount} until your next tier unlocks.`}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#1F3008] border border-[#8CFF2E]/30 flex items-center justify-center">
                <Star size={22} className="text-[#8CFF2E]" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-[12px] text-zinc-400">
                <span>AED {user.aed_balance} / AED {next_reward?.tier_threshold || next_tier.threshold}</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-[#27272A] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8CFF2E] to-[#6DDB1E]" style={{ width: `${tierPct}%` }} />
              </div>
            </div>
            <button
              onClick={() => navigate("/benefits-ladder")}
              data-testid="dashboard-earn-more-aed-btn"
              className="mt-6 w-full btn-gold"
            >Earn More AED <ArrowRight size={16} /></button>
          </div>
        ) : (
          <div className="onex-card p-6 sm:p-7" data-testid="dashboard-next-milestone-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">Your Next Milestone</div>
                <h3 className="text-[22px] font-semibold text-white mt-3">{next_milestone?.title || "Journey Complete"}</h3>
                <p className="text-zinc-400 text-[14px] mt-1.5 max-w-[260px]">{next_milestone?.subtitle}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#1F3A2D] border border-[#22C55E]/30 flex items-center justify-center">
                {(() => { const Icon = iconMap[next_milestone?.icon] || Flag; return <Icon size={22} className="text-[#22C55E]" />; })()}
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-[12px] text-zinc-400">
                <span>{data.milestones_completed} / {data.milestones_total} Completed</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-[#27272A] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A]" style={{ width: `${nextMilestonePct}%` }} />
              </div>
            </div>
          <button
            onClick={() => navigate("/progress")}
            data-testid="dashboard-continue-journey-btn"
            className="mt-6 w-full btn-ghost border-[#8CFF2E]/30 text-[#8CFF2E] hover:border-[#8CFF2E]"
          >Continue Journey <ArrowRight size={16} /></button>
          </div>
        )}

        {/* Property spotlight */}
        {spotlight_property && (
          <div className="onex-card p-6 sm:p-7" data-testid="dashboard-property-spotlight">
            <div className="flex items-start gap-5">
              <div className="flex-1">
                <div className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">Upcoming Property Launch</div>
                <h3 className="text-[22px] font-semibold text-white mt-3 leading-tight">{spotlight_property.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-zinc-400 text-[13px]">
                  <Calendar size={14} className="text-[#8CFF2E]" />
                  <span>{new Date(spotlight_property.launch_date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-6">
                  <Countdown target={spotlight_property.launch_date} />
                </div>
              </div>
              <img src={spotlight_property.image} alt={spotlight_property.name} className="w-24 h-32 object-cover rounded-2xl border border-[#27272A]" />
            </div>
            <button
              onClick={() => navigate("/properties")}
              data-testid="dashboard-view-property-btn"
              className="mt-6 w-full btn-ghost border-[#8CFF2E]/30 text-[#8CFF2E] hover:border-[#8CFF2E]"
            >View Details <ArrowRight size={16} /></button>
          </div>
        )}

        {/* Current tier */}
        <div className="onex-card p-6 sm:p-7" data-testid="dashboard-current-tier-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-zinc-500">Your Current Tier</div>
              <h3 className="text-[22px] font-semibold text-white mt-3">{user.tier}</h3>
              <p className="text-zinc-400 text-[13px] mt-1.5">AED {next_tier.remaining} more to reach {next_tier.name}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#8CFF2E]/10 border border-[#8CFF2E]/30 flex items-center justify-center">
              <Star size={22} className="text-[#8CFF2E]" />
            </div>
          </div>
          <div className="mt-6">
            <div className="h-2 rounded-full bg-[#27272A] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#8CFF2E] to-[#6DDB1E]" style={{ width: `${tierPct}%` }} />
            </div>
            <div className="text-right text-[12px] text-zinc-500 mt-2 tabular-nums">{user.aed_balance} / {next_tier.threshold}</div>
          </div>
          <button
            onClick={() => navigate("/benefits-ladder")}
            data-testid="dashboard-view-benefits-btn"
            className="mt-4 w-full btn-ghost border-[#8CFF2E]/30 text-[#8CFF2E] hover:border-[#8CFF2E]"
          >View Benefits Ladder <ArrowRight size={16} /></button>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-2xl font-display tracking-tight text-white mt-12">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">
        {[
          { title: "Continue Journey", subtitle: "Complete the next steps in your co-ownership journey.", icon: Flag, color: "#22C55E", bg: "#1F3A2D", route: "/progress", testId: "quick-action-continue-journey" },
          { title: "Explore Properties", subtitle: "Browse exclusive Dubai properties and investment opportunities.", icon: Building2, color: "#8CFF2E", bg: "#1F3008", route: "/properties", testId: "quick-action-explore-properties" },
          { title: "Invite Friends", subtitle: "Invite friends and earn AED 50 when they complete basic KYC.", icon: UserPlus, color: "#A78BFA", bg: "#2A1F4A", route: "/invite", testId: "quick-action-invite-friends" },
          { title: "Register Webinar", subtitle: "Join upcoming webinars and learn from industry experts.", icon: Calendar, color: "#60A5FA", bg: "#1E2D4A", route: "/webinars", testId: "quick-action-register-webinar" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.title}
              onClick={() => navigate(a.route)}
              data-testid={a.testId}
              className="onex-card p-6 text-left hover:-translate-y-1 hover:border-[#8CFF2E]/30 transition-all flex flex-col justify-between min-h-[200px]"
            >
              <div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: a.bg, border: `1px solid ${a.color}44` }}>
                  <Icon size={22} style={{ color: a.color }} />
                </div>
                <h4 className="text-[18px] font-semibold text-white mt-5">{a.title}</h4>
                <p className="text-zinc-400 text-[13px] mt-1.5 leading-relaxed">{a.subtitle}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center self-end mt-4">
                <ArrowRight size={14} className="text-zinc-300" />
              </div>
            </button>
          );
        })}
      </div>

      {/* At a Glance + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-display tracking-tight text-white">At a Glance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {[
              { label: "Co-Owner Credits", value: `AED ${stats.aed_balance}`, tag: `+AED ${stats.balance_this_week} this week`, color: "#8CFF2E", icon: Wallet },
              { label: "Investments Interested", value: `${stats.interests_count} / ${stats.interests_total}`, tag: "Allocation saved", color: "#8CFF2E", icon: PieChart },
              { label: "Webinars Attended", value: `${stats.webinars_attended}`, tag: "Keep learning", color: "#A78BFA", icon: Calendar },
              { label: "Friends Invited", value: `${stats.friends_invited}`, tag: `+${stats.friends_invited} this week`, color: "#22C55E", icon: UserPlus },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="onex-card-soft p-4" data-testid={`glance-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">{s.label}</div>
                    <Icon size={14} style={{ color: s.color }} />
                  </div>
                  <div className="text-[20px] font-semibold text-white mt-3">{s.value}</div>
                  <div className="text-[11px] text-[#22C55E] mt-1">{s.tag}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display tracking-tight text-white">Recent Activity</h2>
            <button data-testid="recent-activity-view-all" className="text-[12px] text-zinc-400 hover:text-white flex items-center gap-1">View All <ChevronRight size={12} /></button>
          </div>
          <div className="onex-card-soft p-2 mt-5 divide-y divide-[#27272A]">
            {(recent_activity?.length ? recent_activity : [{ id: "x", kind: "welcome", title: "Welcome to OneX Club", reward: 100, created_at: new Date().toISOString() }]).slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3" data-testid={`activity-${a.id}`}>
                <div className="w-10 h-10 rounded-full bg-[#1F3A2D] border border-[#22C55E]/20 flex items-center justify-center">
                  <ActivityIcon kind={a.kind} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white truncate">{a.title}</div>
                  <div className="text-[11px] text-zinc-500">{new Date(a.created_at).toLocaleString("en-US", { dateStyle: "medium" })}</div>
                </div>
                {a.reward > 0 && <div className="text-[12px] font-semibold text-[#8CFF2E]">+AED {a.reward}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer banner */}
      <div className="onex-card mt-12 p-6 sm:p-8 flex items-center gap-6 flex-wrap" data-testid="dashboard-footer-banner">
        <div className="w-14 h-14 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl">1X</div>
        <div className="flex-1 min-w-[260px]">
          <h3 className="text-[18px] font-semibold text-white">Exclusive Co-Ownership. High-Yield Assets. Premium Benefits.</h3>
          <p className="text-zinc-400 text-[13px] mt-1">OneX Club is your gateway to Dubai’s most exclusive real estate opportunities.</p>
        </div>
        <button onClick={() => navigate("/co-owner-benefits")} className="btn-gold" data-testid="dashboard-learn-more-btn">Learn More <ArrowRight size={16} /></button>
      </div>
    </div>
  );
};

export default Dashboard;
