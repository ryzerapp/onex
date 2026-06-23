import React from "react";
import {
  TrendingUp, Building2, Crown, Users, Sparkles, Calendar,
  ArrowUpRight, Lock, ChevronRight, Bell, Wifi, Battery,
  Bookmark, Gift, Trophy, MapPin, Diamond, Star, ShieldCheck,
} from "lucide-react";

/**
 * App Store / Play Store screenshot mockups.
 *
 * Each tile is rendered at the exact iPhone 6.7" pixel dimension Apple requires
 * (1290 × 2796) — these PNGs upload directly to App Store Connect, and the
 * same crop also satisfies Google Play's 1080×2400 phone screenshot slot.
 *
 * Visit /store-mockups to view all six. Use the on-page "Capture" instructions
 * (or run the headless screenshot script) to export each one as a clean PNG.
 */

// ─── Status bar — universal iPhone chrome ────────────────────────────────────
const StatusBar = () => (
  <div className="flex items-center justify-between px-12 pt-8 pb-3 text-white text-[34px] font-semibold tabular-nums">
    <span>9:41</span>
    <div className="flex items-center gap-3">
      <span className="text-[28px]">●●●●</span>
      <Wifi size={28} strokeWidth={2.5} />
      <div className="flex items-center">
        <span className="text-[20px] mr-1">100</span>
        <Battery size={32} strokeWidth={2} className="rotate-90" />
      </div>
    </div>
  </div>
);

// ─── A reusable phone frame rendered at NATIVE store dimensions ──────────────
// Outer container = 1290×2796 (App Store 6.7"). Background gradient + headline
// sits inside the same canvas so a single screenshot exports the whole tile.
const Tile = ({ id, eyebrow, headline, sub, children, accent = "#8CFF2E" }) => (
  <section
    id={id}
    data-testid={`store-mockup-${id}`}
    className="relative overflow-hidden flex-shrink-0"
    style={{
      width: "1290px",
      height: "2796px",
      background:
        "radial-gradient(120% 70% at 50% -10%, rgba(140,255,46,0.16) 0%, rgba(140,255,46,0) 55%), linear-gradient(180deg, #0A0A0B 0%, #050507 100%)",
    }}
  >
    {/* Marketing headline area */}
    <div className="px-20 pt-32">
      <div
        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-[28px] uppercase tracking-[0.18em] font-semibold"
        style={{ background: `${accent}1A`, color: accent, border: `1.5px solid ${accent}40` }}
      >
        <Sparkles size={26} /> {eyebrow}
      </div>
      <h1
        className="text-white font-display mt-10"
        style={{ fontSize: "112px", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600 }}
      >
        {headline}
      </h1>
      <p className="text-zinc-400 mt-8" style={{ fontSize: "44px", lineHeight: 1.35, maxWidth: "1100px" }}>
        {sub}
      </p>
    </div>

    {/* Phone — pulled up from the bottom so we always show the top half of the screen */}
    <div className="absolute left-1/2" style={{ bottom: "-120px", transform: "translateX(-50%)" }}>
      <div
        className="relative"
        style={{
          width: "1020px",
          height: "2080px",
          borderRadius: "120px",
          background: "#000",
          boxShadow: "0 80px 160px -40px rgba(0,0,0,0.8), 0 0 0 8px #1f1f24, 0 0 0 16px #0a0a0b",
          padding: "16px",
        }}
      >
        {/* Dynamic island */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: "44px", width: "260px", height: "44px", borderRadius: "999px", background: "#000" }}
        />
        {/* Screen */}
        <div
          className="w-full h-full overflow-hidden"
          style={{ borderRadius: "104px", background: "#0A0A0B" }}
        >
          <StatusBar />
          {children}
        </div>
      </div>
    </div>
  </section>
);

// ─── Mockup 1 — Home / Tier ──────────────────────────────────────────────────
const Mockup1 = () => (
  <Tile
    id="1"
    eyebrow="Co-Owners Club"
    headline={<>Co-own Dubai{"'"}s<br/>most exclusive<br/>assets.</>}
    sub="Burj views, beachfront villas, branded residences — fractional from AED 500."
  >
    <div className="px-12 pt-6">
      <div className="text-zinc-400 text-[26px]">Welcome back,</div>
      <div className="text-white text-[44px] font-semibold mt-1">Surya</div>

      {/* Tier ring card */}
      <div className="mt-10 rounded-[44px] p-10 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #15161A 0%, #0F1014 100%)", border: "2px solid #27272A" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[22px] uppercase tracking-[0.15em] text-zinc-500">Your tier</div>
            <div className="text-white text-[64px] font-semibold mt-2">Insider</div>
            <div className="text-[#8CFF2E] text-[28px] mt-1">Level 2 · AED 2,840</div>
          </div>
          <div className="w-[180px] h-[180px] rounded-full grid place-items-center"
               style={{ background: "conic-gradient(#8CFF2E 0% 68%, #27272A 68% 100%)" }}>
            <div className="w-[154px] h-[154px] rounded-full bg-[#0F1014] grid place-items-center">
              <div className="text-center">
                <div className="text-white text-[44px] font-semibold">68%</div>
                <div className="text-zinc-500 text-[18px]">to Co-Owner</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 text-[24px] text-zinc-400">
          <TrendingUp size={26} className="text-[#8CFF2E]" /> AED 2,160 from your next unlock
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-5 mt-8">
        {[
          { k: "Referrals", v: "11" },
          { k: "Webinars", v: "6" },
          { k: "Saved", v: "3" },
        ].map((s) => (
          <div key={s.k} className="rounded-[28px] p-7 text-center"
               style={{ background: "#15161A", border: "2px solid #27272A" }}>
            <div className="text-white text-[44px] font-semibold tabular-nums">{s.v}</div>
            <div className="text-zinc-500 text-[20px] mt-1">{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  </Tile>
);

// ─── Mockup 2 — Properties ───────────────────────────────────────────────────
const Mockup2 = () => (
  <Tile
    id="2"
    eyebrow="Allocation"
    headline={<>Five flagship<br/>launches. <span style={{color:"#8CFF2E"}}>Reserved<br/>for members.</span></>}
    sub="Burj Khalifa residences. Palm Jumeirah villas. Pre-public allocation, member pricing."
  >
    <div className="px-12 pt-6 pb-20 space-y-6">
      {[
        { name: "The Edge · Downtown", img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80&auto=format&fit=crop", price: "AED 1.85M", roi: "+18.4%" },
        { name: "Palm Atrium · Crescent", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80&auto=format&fit=crop", price: "AED 4.20M", roi: "+22.1%" },
        { name: "Marina Bay · Tower 3", img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80&auto=format&fit=crop", price: "AED 2.05M", roi: "+15.2%" },
      ].map((p, i) => (
        <div key={i} className="rounded-[36px] overflow-hidden"
             style={{ background: "#15161A", border: "2px solid #27272A" }}>
          <div className="h-[420px] relative">
            <img src={p.img} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6 px-5 py-2 rounded-full text-[22px] font-semibold"
                 style={{ background: "rgba(140,255,46,0.95)", color: "#0A0A0B" }}>
              MEMBERS · 24h EARLY
            </div>
            <div className="absolute bottom-6 right-6 flex items-center gap-2 px-5 py-2 rounded-full"
                 style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(20px)" }}>
              <Bookmark size={22} className="text-white" />
              <span className="text-white text-[22px]">Save</span>
            </div>
          </div>
          <div className="p-7 flex items-center justify-between">
            <div>
              <div className="text-white text-[34px] font-semibold">{p.name}</div>
              <div className="text-zinc-500 text-[22px] mt-1 flex items-center gap-2">
                <MapPin size={20}/> Dubai · {p.price}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#8CFF2E] text-[32px] font-semibold">{p.roi}</div>
              <div className="text-zinc-500 text-[18px]">5y forecast</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </Tile>
);

// ─── Mockup 3 — Benefits ladder ──────────────────────────────────────────────
const Mockup3 = () => {
  const tiers = [
    { name: "Member",   thr: "500",    icon: Star,    unlocked: true,  accent: "#60A5FA" },
    { name: "Insider",  thr: "2,500",  icon: Diamond, unlocked: true,  accent: "#A78BFA", current: true },
    { name: "Co-Owner", thr: "5,000",  icon: Crown,   unlocked: false, accent: "#8CFF2E" },
    { name: "Pro-Owner",thr: "10,000", icon: Trophy,  unlocked: false, accent: "#F472B6" },
  ];
  return (
    <Tile
      id="3"
      eyebrow="The Ladder"
      headline={<>Climb the ladder.<br/>Unlock the <span style={{color:"#8CFF2E"}}>life</span>.</>}
      sub="Airport transfers, private founder briefings, complimentary annual stays."
    >
      <div className="px-12 pt-8 space-y-6">
        {tiers.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.name}
                 className="rounded-[36px] p-8 flex items-center gap-7 relative"
                 style={{
                   background: t.current ? `linear-gradient(135deg, ${t.accent}26 0%, #15161A 100%)` : "#15161A",
                   border: `2px solid ${t.current ? t.accent : "#27272A"}`,
                 }}>
              <div className="w-[120px] h-[120px] rounded-[28px] grid place-items-center flex-shrink-0"
                   style={{ background: `${t.accent}1A`, border: `2px solid ${t.accent}66` }}>
                <Icon size={56} style={{ color: t.accent }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="text-white text-[40px] font-semibold">{t.name}</div>
                  {t.current && (
                    <span className="px-3 py-1 rounded-full text-[18px] font-semibold"
                          style={{ background: t.accent, color: "#0A0A0B" }}>YOU</span>
                  )}
                </div>
                <div className="text-zinc-400 text-[24px] mt-1">AED {t.thr}+ · {t.unlocked ? "Unlocked" : "Locked"}</div>
              </div>
              {t.unlocked
                ? <ShieldCheck size={48} className="text-[#8CFF2E]" />
                : <Lock size={44} className="text-zinc-600" />}
            </div>
          );
        })}
        <div className="mt-6 rounded-[36px] p-7"
             style={{ background: "#15161A", border: "2px solid #27272A" }}>
          <div className="text-zinc-500 text-[22px] uppercase tracking-[0.15em]">Next unlock at Co-Owner</div>
          <div className="grid grid-cols-2 gap-4 mt-5">
            {["Airport transfers","Annual stays","Founder briefings","Lounge events"].map(b=>(
              <div key={b} className="flex items-center gap-3 text-white text-[24px]">
                <div className="w-3 h-3 rounded-full bg-[#8CFF2E]"/> {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Tile>
  );
};

// ─── Mockup 4 — Webinar / closed-door briefing ───────────────────────────────
const Mockup4 = () => (
  <Tile
    id="4"
    eyebrow="Live with the team"
    headline={<>Closed-door<br/>briefings with<br/>the founders.</>}
    sub="Monthly live AMAs and pre-launch property walkthroughs. Member-only."
  >
    <div className="px-12 pt-8">
      <div className="rounded-[40px] overflow-hidden" style={{border:"2px solid #27272A"}}>
        <div className="relative h-[640px]">
          <img src="https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=1400&q=80&auto=format&fit=crop"
               alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{background:"linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)"}}/>
          <div className="absolute top-7 left-7 flex items-center gap-3 px-5 py-2.5 rounded-full"
               style={{ background: "#EF4444" }}>
            <div className="w-3 h-3 rounded-full bg-white animate-pulse"/>
            <span className="text-white text-[22px] font-bold tracking-wide">LIVE NOW</span>
          </div>
          <div className="absolute bottom-7 left-7 right-7">
            <div className="text-white text-[40px] font-semibold leading-tight">Burj 8 Allocation Briefing</div>
            <div className="text-zinc-300 text-[24px] mt-2">Hosted by founders · 247 watching</div>
          </div>
        </div>
        <div className="p-8 bg-[#15161A] flex items-center justify-between">
          <div className="flex -space-x-4">
            {["1507003211169","1494790108377","1531746020798","1500648767791"].map((id,i)=>(
              <div key={i} className="w-[80px] h-[80px] rounded-full border-4 border-[#15161A] overflow-hidden">
                <img src={`https://images.unsplash.com/photo-${id}-${id.startsWith('149')?'be9c29b29330':'0a1dd7228f2d'}?w=200&q=80&auto=format&fit=crop`}
                     alt="" className="w-full h-full object-cover"/>
              </div>
            ))}
          </div>
          <button className="px-8 py-4 rounded-full text-[26px] font-semibold"
                  style={{ background: "#8CFF2E", color: "#0A0A0B" }}>
            Join now
          </button>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mt-10">
        <div className="text-zinc-500 text-[24px] uppercase tracking-[0.18em] mb-5">Upcoming</div>
        {[
          { d: "Jul 12", t: "Palm Atrium · Walkthrough" },
          { d: "Jul 19", t: "Quarterly Founder AMA" },
        ].map((e,i)=>(
          <div key={i} className="flex items-center gap-6 py-6"
               style={{borderTop:"1.5px solid #27272A"}}>
            <div className="w-[100px] h-[100px] rounded-[24px] grid place-items-center flex-shrink-0"
                 style={{background:"#15161A", border:"2px solid #27272A"}}>
              <Calendar size={42} className="text-[#8CFF2E]"/>
            </div>
            <div className="flex-1">
              <div className="text-zinc-500 text-[22px]">{e.d}</div>
              <div className="text-white text-[30px] font-semibold mt-1">{e.t}</div>
            </div>
            <Bell size={40} className="text-zinc-500"/>
          </div>
        ))}
      </div>
    </div>
  </Tile>
);

// ─── Mockup 5 — Invite & Earn ────────────────────────────────────────────────
const Mockup5 = () => (
  <Tile
    id="5"
    eyebrow="Invite & Earn"
    headline={<>Bring a friend.<br/>Earn <span style={{color:"#8CFF2E"}}>AED 100</span><br/>per signup.</>}
    sub="Real AED credits, applied directly to your tier balance and future allocations."
  >
    <div className="px-12 pt-8">
      <div className="rounded-[44px] p-10 text-center"
           style={{ background: "linear-gradient(135deg, #8CFF2E26 0%, #15161A 100%)", border: "2px solid #8CFF2E40" }}>
        <div className="text-zinc-400 text-[24px] uppercase tracking-[0.18em]">Total earned</div>
        <div className="text-white font-display tabular-nums mt-3" style={{fontSize:"160px",lineHeight:1, fontWeight:600}}>
          <span style={{color:"#8CFF2E"}}>+1,180</span>
        </div>
        <div className="text-zinc-400 text-[28px] mt-2">AED · from 11 referrals</div>
      </div>

      {/* Code card */}
      <div className="mt-8 rounded-[36px] p-7 flex items-center gap-5"
           style={{background:"#15161A", border:"2px solid #27272A"}}>
        <div className="flex-1">
          <div className="text-zinc-500 text-[22px] uppercase tracking-[0.15em]">Your link</div>
          <div className="text-white text-[28px] font-mono mt-2 truncate">club.onex.exchange/?ref=surya-378738</div>
        </div>
        <button className="px-6 py-4 rounded-full text-[26px] font-semibold"
                style={{ background: "#8CFF2E", color: "#0A0A0B" }}>
          Share
        </button>
      </div>

      {/* Reward breakdown */}
      <div className="mt-8 space-y-4">
        {[
          { k: "Friend signs up", v: "+AED 50",  icon: Users },
          { k: "Friend completes KYC", v: "+AED 100", icon: ShieldCheck },
          { k: "Friend becomes Co-Owner", v: "+AED 500", icon: Crown },
        ].map((r,i)=>{
          const Icon=r.icon;
          return (
            <div key={i} className="rounded-[32px] p-7 flex items-center gap-6"
                 style={{background:"#15161A", border:"2px solid #27272A"}}>
              <div className="w-[88px] h-[88px] rounded-[22px] grid place-items-center"
                   style={{background:"#8CFF2E1A", border:"2px solid #8CFF2E40"}}>
                <Icon size={42} className="text-[#8CFF2E]"/>
              </div>
              <div className="flex-1 text-white text-[28px]">{r.k}</div>
              <div className="text-[#8CFF2E] text-[34px] font-semibold tabular-nums">{r.v}</div>
            </div>
          );
        })}
      </div>
    </div>
  </Tile>
);

// ─── Mockup 6 — Activity timeline ────────────────────────────────────────────
const Mockup6 = () => {
  const items = [
    { i: Crown,       k: "Tier upgrade · Insider unlocked",     a: "+AED 200", ago: "2h ago", c:"#A78BFA" },
    { i: Users,       k: "Friend joined · Priya N.",            a: "+AED 50",  ago: "Yesterday", c:"#8CFF2E"},
    { i: ShieldCheck, k: "KYC verified",                        a: "+AED 100", ago: "2 days", c:"#8CFF2E" },
    { i: Calendar,    k: "Attended · Burj 8 Briefing",          a: "+AED 25",  ago: "3 days", c:"#60A5FA" },
    { i: Building2,   k: "Saved · Palm Atrium",                 a: "",          ago: "4 days", c:"#F472B6" },
    { i: Gift,        k: "Welcome bonus",                       a: "+AED 100", ago: "1 week", c:"#8CFF2E" },
  ];
  return (
    <Tile
      id="6"
      eyebrow="Your Journey"
      headline={<>Every milestone.<br/>Every <span style={{color:"#8CFF2E"}}>reward</span>.</>}
      sub="A live feed of every AED earned, every tier unlocked, every referral converted."
    >
      <div className="px-12 pt-8">
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-[32px] p-7" style={{background:"#15161A",border:"2px solid #27272A"}}>
            <div className="text-zinc-500 text-[22px] uppercase tracking-[0.15em]">Events</div>
            <div className="text-white text-[64px] font-semibold tabular-nums mt-2">62</div>
          </div>
          <div className="rounded-[32px] p-7"
               style={{background:"linear-gradient(135deg,#8CFF2E26 0%,#15161A 100%)",border:"2px solid #8CFF2E40"}}>
            <div className="text-zinc-400 text-[22px] uppercase tracking-[0.15em]">AED earned</div>
            <div className="text-[#8CFF2E] text-[64px] font-semibold tabular-nums mt-2">+3,395</div>
          </div>
        </div>

        <div className="rounded-[36px] overflow-hidden"
             style={{background:"#15161A",border:"2px solid #27272A"}}>
          {items.map((it,i)=>{
            const Icon=it.i;
            return (
              <div key={i} className="flex items-center gap-6 p-7"
                   style={{borderBottom: i<items.length-1?"1.5px solid #27272A":"none"}}>
                <div className="w-[80px] h-[80px] rounded-[22px] grid place-items-center flex-shrink-0"
                     style={{background:`${it.c}1A`,border:`2px solid ${it.c}40`}}>
                  <Icon size={36} style={{color:it.c}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[26px] font-medium leading-tight">{it.k}</div>
                  <div className="text-zinc-500 text-[20px] mt-1">{it.ago}</div>
                </div>
                {it.a && <div className="text-[#8CFF2E] text-[28px] font-semibold tabular-nums">{it.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </Tile>
  );
};

// ─── Page wrapper — vertical stack at native pixel sizes ─────────────────────
const StoreMockups = () => {
  return (
    <div data-testid="store-mockups-page" style={{ background: "#000" }}>
      {/* Tiny header for the dev (NOT part of the screenshots) */}
      <div className="px-10 py-8 text-zinc-300 text-sm flex items-center justify-between"
           style={{ background: "#0A0A0B", borderBottom: "1px solid #27272A" }}>
        <div>
          <span className="text-white font-semibold">App Store / Play Store mockups</span>
          <span className="text-zinc-500 ml-3">6 tiles · 1290 × 2796 px (iPhone 6.7{"\u201D"})</span>
        </div>
        <div className="text-zinc-500">Scroll → screenshot each tile, or use the export script.</div>
      </div>

      <div className="flex flex-col items-center gap-12 py-12">
        <Mockup1 />
        <Mockup2 />
        <Mockup3 />
        <Mockup4 />
        <Mockup5 />
        <Mockup6 />
      </div>
    </div>
  );
};

export default StoreMockups;
