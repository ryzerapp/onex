import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Trophy, Users, TrendingUp, Crown, Medal } from "lucide-react";

const PERIODS = [
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "all_time", label: "All Time" },
];

const Leaderboard = () => {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/leaderboard?period=${period}`).then(({ data }) => setData(data)); }, [period]);

  if (!data) return <div className="text-zinc-500" data-testid="leaderboard-loading">Loading…</div>;

  const initials = (n) => (n || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const podiumOrder = [data.podium[1], data.podium[0], data.podium[2]].filter(Boolean);
  const podiumStyles = [
    { height: "h-44", color: "#A1A1AA", icon: Medal },
    { height: "h-56", color: "#FACC15", icon: Crown },
    { height: "h-36", color: "#D97706", icon: Medal },
  ];

  return (
    <div data-testid="leaderboard-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Leaderboard</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Celebrating the OneX members who grow the community.</p>

      <div className="flex gap-2 mt-6 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            data-testid={`period-${p.id}`}
            className={`px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${period === p.id ? "onex-gold-fill border-[#FACC15]" : "border-[#27272A] text-zinc-300 hover:border-[#FACC15]/30"}`}
          >{p.label}</button>
        ))}
      </div>

      {/* My rank summary */}
      <div className="onex-card mt-8 p-6 flex items-center gap-6 flex-wrap" data-testid="my-rank-card">
        <div className="w-16 h-16 rounded-full onex-gold-fill flex items-center justify-center text-[22px] font-bold">#{data.me.rank}</div>
        <div className="flex-1 min-w-[240px]">
          <div className="text-[12px] uppercase tracking-[0.15em] text-zinc-500">Your Standing</div>
          <div className="text-white text-[20px] font-semibold mt-1">{data.me.name}</div>
          <div className="text-zinc-400 text-[13px]">{data.me.tier} · AED {data.me.balance} · {data.me.referrals} referrals</div>
        </div>
        <div className="flex gap-6">
          <div><div className="text-[#FACC15] text-[24px] font-display">AED {data.me.balance}</div><div className="text-zinc-500 text-[11px] uppercase tracking-[0.15em]">Your Balance</div></div>
          <div><div className="text-[#22C55E] text-[24px] font-display">+{data.me.referrals}</div><div className="text-zinc-500 text-[11px] uppercase tracking-[0.15em]">Referrals</div></div>
        </div>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-6 mt-10 max-w-3xl mx-auto items-end" data-testid="leaderboard-podium">
        {podiumOrder.map((p, idx) => {
          const style = podiumStyles[idx];
          const Icon = style.icon;
          if (!p) return null;
          return (
            <div key={p.name + idx} className="flex flex-col items-center">
              <div className="relative">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: style.color }} />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#15161A] flex items-center justify-center text-white text-xl border-2" style={{ borderColor: style.color }}>{initials(p.name)}</div>
                )}
                <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: style.color }}>
                  <Icon size={16} className="text-black" />
                </div>
              </div>
              <div className="text-white text-[14px] font-medium mt-3 text-center">{p.name}</div>
              <div className="text-zinc-500 text-[12px]">{p.tier}</div>
              <div className={`onex-card-soft mt-3 w-full ${style.height} flex flex-col items-center justify-center px-3`}>
                <div className="text-[10px] uppercase tracking-[0.15em]" style={{ color: style.color }}>Rank #{p.rank}</div>
                <div className="text-[22px] font-display text-[#FACC15] mt-1">AED {p.balance}</div>
                <div className="text-zinc-500 text-[11px] mt-1">{p.referrals} referrals</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="onex-card mt-10 p-2" data-testid="leaderboard-list">
        {data.list.slice(3).map((u) => (
          <div key={u.name + u.rank} className={`flex items-center gap-4 px-4 py-3 rounded-2xl ${u.is_user ? "bg-[#FACC15]/10 border border-[#FACC15]/30" : ""}`} data-testid={`leaderboard-row-${u.rank}`}>
            <div className="w-8 text-center text-zinc-400 text-[13px] font-semibold">#{u.rank}</div>
            {u.avatar ? <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#FACC15]/15 text-[#FACC15] flex items-center justify-center text-[13px] font-semibold">{initials(u.name)}</div>}
            <div className="flex-1 min-w-0">
              <div className="text-white text-[14px] font-medium truncate">{u.name}{u.is_user && <span className="ml-2 onex-pill onex-gold-fill !text-[10px]">You</span>}</div>
              <div className="text-zinc-500 text-[12px]">{u.tier}</div>
            </div>
            <div className="text-right">
              <div className="text-[#FACC15] text-[14px] font-semibold">AED {u.balance}</div>
              <div className="text-zinc-500 text-[11px] flex items-center justify-end gap-1"><Users size={11} /> {u.referrals}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8 text-zinc-500 text-[13px] flex items-center justify-center gap-2"><TrendingUp size={14} className="text-[#22C55E]" /> Every member raises the OneX community. Keep going.</div>
    </div>
  );
};

export default Leaderboard;
