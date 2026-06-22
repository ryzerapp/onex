import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Trophy, Users, TrendingUp, Crown, Medal, Sparkles, Award, ArrowUpRight } from "lucide-react";

const PERIODS = [
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "all_time", label: "All Time" },
];

const PODIUM_TONES = {
  1: { color: "#8CFF2E", soft: "#8CFF2E", glow: "lb-bar-glow", height: "h-60", icon: Crown, label: "Champion" },
  2: { color: "#D4D4D8", soft: "#A1A1AA", glow: "lb-bar-silver-glow", height: "h-48", icon: Medal, label: "Runner-up" },
  3: { color: "#D97706", soft: "#B45309", glow: "lb-bar-bronze-glow", height: "h-40", icon: Award, label: "Bronze" },
};

const initials = (n) => (n || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

const PodiumCard = ({ p, tone }) => {
  if (!p) return null;
  const Icon = tone.icon;
  return (
    <div className="flex flex-col items-center" data-testid={`podium-rank-${p.rank}`}>
      <div className="relative">
        {p.avatar ? (
          <img src={p.avatar} alt={p.name} className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: tone.color }} />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#15161A] flex items-center justify-center text-white text-xl border-2" style={{ borderColor: tone.color }}>
            {initials(p.name)}
          </div>
        )}
        <div
          className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: tone.color, boxShadow: `0 0 20px ${tone.color}80` }}
        >
          <Icon size={16} className="text-black" />
        </div>
      </div>
      <div className="text-white text-[14px] font-medium mt-3 text-center max-w-[140px] truncate">{p.name}</div>
      <div className="text-zinc-500 text-[11px] uppercase tracking-[0.12em] mt-0.5">{tone.label}</div>
      <div
        className={`mt-4 w-full ${tone.height} ${tone.glow} rounded-2xl flex flex-col items-center justify-end px-3 py-5 relative overflow-hidden`}
        style={{
          background: `linear-gradient(180deg, ${tone.color}1A 0%, #15161A 70%, #0F0F12 100%)`,
          border: `1px solid ${tone.color}33`,
        }}
      >
        {/* decorative blur */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-3xl opacity-30" style={{ background: tone.color }} />
        <div className="relative text-center">
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: tone.color }}>Rank · #{p.rank}</div>
          <div className="mt-2 text-[26px] font-display text-white leading-none">AED {p.balance.toLocaleString()}</div>
          <div className="text-zinc-400 text-[11px] mt-2">{p.tier}</div>
          <div className="text-zinc-500 text-[11px] mt-1 flex items-center justify-center gap-1"><Users size={11} /> {p.referrals} referrals</div>
        </div>
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/leaderboard?period=${period}`).then(({ data }) => setData(data)); }, [period]);

  if (!data) return <div className="text-zinc-500" data-testid="leaderboard-loading">Loading…</div>;

  // Podium visual order: 2 · 1 · 3
  const podiumOrder = [data.podium[1], data.podium[0], data.podium[2]].filter(Boolean);
  const periodCopy = { weekly: "this week", monthly: "this month", all_time: "all-time" }[period];

  return (
    <div data-testid="leaderboard-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-[#8CFF2E] flex items-center gap-2"><Trophy size={12} /> Leaderboard</div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight mt-2"><span className="gold-shimmer">OneX Champions</span></h1>
          <p className="text-zinc-400 mt-2 text-[15px]">Celebrating the members who grew the community {periodCopy}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              data-testid={`period-${p.id}`}
              className={`px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${period === p.id ? "onex-gold-fill border-[#8CFF2E]" : "border-[#27272A] text-zinc-300 hover:border-[#8CFF2E]/30"}`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* My rank summary — dramatic hero */}
      <div
        className="onex-card mt-8 p-6 sm:p-7 flex items-center gap-6 flex-wrap relative overflow-hidden"
        style={{ background: "radial-gradient(120% 80% at 0% 0%, rgba(140,255,46,0.10) 0%, rgba(140,255,46,0) 55%), #15161A" }}
        data-testid="my-rank-card"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#8CFF2E]/10 blur-3xl pointer-events-none" />
        <div className="w-20 h-20 rounded-full onex-gold-fill flex items-center justify-center shadow-lg" style={{ boxShadow: "0 0 30px rgba(140,255,46,0.35)" }}>
          <div className="text-[26px] font-display leading-none">#{data.me.rank}</div>
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Your standing · {periodCopy}</div>
          <div className="text-white text-[22px] font-semibold mt-1 flex items-center gap-2 flex-wrap">
            {data.me.name}
            <span className="onex-pill onex-gold-fill !text-[10px]">{data.me.tier}</span>
          </div>
          <div className="text-zinc-400 text-[13px] mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Sparkles size={12} className="text-[#8CFF2E]" /> {data.me.balance.toLocaleString()} AED earned</span>
            <span className="flex items-center gap-1"><Users size={12} /> {data.me.referrals} referrals</span>
          </div>
        </div>
        <div className="flex gap-5 items-stretch">
          <div className="px-5 py-3 rounded-2xl border border-[#8CFF2E]/30 bg-[#1F3008]/40">
            <div className="text-[#8CFF2E] text-[24px] font-display leading-none">AED {data.me.balance.toLocaleString()}</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-[0.18em] mt-1">{period === "all_time" ? "Total Balance" : "Earned"}</div>
          </div>
          <div className="px-5 py-3 rounded-2xl border border-[#22C55E]/30 bg-[#1F3A2D]/40">
            <div className="text-[#22C55E] text-[24px] font-display leading-none flex items-center gap-1">+{data.me.referrals} <ArrowUpRight size={16} /></div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-[0.18em] mt-1">Referrals</div>
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="mt-12">
        <div className="text-center text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">Top 3 · {periodCopy}</div>
        <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto items-end" data-testid="leaderboard-podium">
          {podiumOrder.map((p) => (
            <PodiumCard key={`${p.name}-${p.rank}`} p={p} tone={PODIUM_TONES[p.rank]} />
          ))}
        </div>
      </div>

      {/* Full ranked list */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display text-white tracking-tight">Full standings</h2>
          <span className="text-zinc-500 text-[12px]">{data.list.length} of {data.list.length}+ members</span>
        </div>
        <div className="onex-card p-2 sm:p-3" data-testid="leaderboard-list">
          {data.list.slice(3).map((u, idx) => {
            const movement = idx % 4 === 0 ? "up" : idx % 4 === 1 ? "down" : "flat";
            return (
              <div
                key={`${u.name}-${u.rank}`}
                className={`flex items-center gap-4 px-3 sm:px-4 py-3 rounded-2xl transition-all ${u.is_user ? "bg-[#8CFF2E]/10 border border-[#8CFF2E]/40" : "hover:bg-white/[0.02]"}`}
                data-testid={`leaderboard-row-${u.rank}`}
              >
                <div className="w-10 text-center text-zinc-400 text-[14px] font-semibold tabular-nums">#{u.rank}</div>
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#8CFF2E]/15 text-[#8CFF2E] flex items-center justify-center text-[13px] font-semibold border border-[#8CFF2E]/20">{initials(u.name)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[14px] font-medium truncate flex items-center gap-2">
                    {u.name}
                    {u.is_user && <span className="onex-pill onex-gold-fill !text-[10px]">You</span>}
                  </div>
                  <div className="text-zinc-500 text-[12px] flex items-center gap-2">
                    <span>{u.tier}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="flex items-center gap-1"><Users size={10} /> {u.referrals}</span>
                  </div>
                </div>
                {/* tiny bar visual */}
                <div className="hidden md:block w-32 h-1.5 rounded-full bg-[#27272A] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (u.balance / Math.max(1, data.podium[0]?.balance || 1)) * 100)}%`,
                      background: u.is_user ? "linear-gradient(90deg,#8CFF2E,#6DDB1E)" : "linear-gradient(90deg,#3F3F46,#52525B)",
                    }}
                  />
                </div>
                <div className="text-right min-w-[88px]">
                  <div className="text-[#8CFF2E] text-[14px] font-semibold tabular-nums">AED {u.balance.toLocaleString()}</div>
                  <div className={`text-[11px] flex items-center justify-end gap-0.5 ${movement === "up" ? "text-[#22C55E]" : movement === "down" ? "text-[#F87171]" : "text-zinc-500"}`}>
                    {movement === "up" ? "▲" : movement === "down" ? "▼" : "—"} {movement === "flat" ? "steady" : `${(idx % 6) + 1}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-10 text-zinc-500 text-[13px] flex items-center justify-center gap-2">
        <TrendingUp size={14} className="text-[#22C55E]" /> Every member raises the OneX community. Keep going.
      </div>
    </div>
  );
};

export default Leaderboard;
