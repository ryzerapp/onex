import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Lock, Sparkles, ArrowRight, Check, Crown, Diamond, Star, Trophy, Plus, Calendar, Gift, ChevronRight } from "lucide-react";
import LevelDetailModal from "@/components/levels/LevelDetailModal";

/** Tier metadata. Order matters: index 0 = lowest, 3 = highest. */
const TIERS = [
  { name: "Member",    level: 1, threshold: 500,   icon: Star,    accent: "#60A5FA", tagline: "You're in. The gateway into OneX co-ownership.",              lifestyle: "Early-access perks · curated property briefings · founding-circle pricing." },
  { name: "Insider",   level: 2, threshold: 2500,  icon: Diamond, accent: "#A78BFA", tagline: "Front-of-line allocation across every launch.",                lifestyle: "Chauffeured airport pickup · executive Q&As · 7-day priority window before public." },
  { name: "Co-Owner",  level: 3, threshold: 5000,  icon: Crown,   accent: "#8CFF2E", tagline: "An intimate community of high-conviction partners.",           lifestyle: "Annual stays at OneX properties · founder briefings · invite-only assets." },
  { name: "Pro-Owner", level: 4, threshold: 10000, icon: Trophy,  accent: "#F472B6", tagline: "Help shape the next decade of OneX.",                          lifestyle: "Dedicated relationship manager · advisory council seat · co-ownership of flagship assets." },
];

const fmtAED = (n) => `AED ${Math.round(n).toLocaleString()}`;

const TierProgressBar = ({ balance, threshold, accent, unlocked }) => {
  const pct = unlocked ? 100 : Math.min(99, Math.round((balance / threshold) * 100));
  return (
    <div className="w-full mt-3">
      <div className="h-1.5 rounded-full bg-[#1F1F22] overflow-hidden relative">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: unlocked
              ? "linear-gradient(90deg, #22C55E, #4ADE80)"
              : `linear-gradient(90deg, ${accent}, ${accent}AA)`,
            boxShadow: unlocked ? "0 0 20px rgba(34,197,94,0.35)" : `0 0 20px ${accent}55`,
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500 tabular-nums">{fmtAED(Math.min(balance, threshold))} / {fmtAED(threshold)}</span>
        <span className={unlocked ? "text-[#22C55E]" : "text-zinc-400 tabular-nums"}>
          {unlocked ? "Unlocked" : `${pct}%`}
        </span>
      </div>
    </div>
  );
};

const CoOwnerBenefits = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTier, setActiveTier] = useState(null);

  useEffect(() => { api.get("/co-owner-benefits").then(({ data }) => setData(data)); }, []);

  // Group benefits by tier
  const grouped = useMemo(() => {
    if (!data) return {};
    return data.benefits.reduce((acc, b) => {
      (acc[b.unlock_tier] = acc[b.unlock_tier] || []).push(b);
      return acc;
    }, {});
  }, [data]);

  if (!data) return <div className="text-zinc-500" data-testid="co-benefits-loading">Loading benefits…</div>;

  const balance = data.current_balance;
  const currentTierIdx = TIERS.reduce((idx, t, i) => balance >= t.threshold ? i : idx, -1);
  const currentTier = currentTierIdx >= 0 ? TIERS[currentTierIdx] : null;
  const nextTier = currentTierIdx + 1 < TIERS.length ? TIERS[currentTierIdx + 1] : null;
  const unlockedCount = data.benefits.filter((b) => balance >= b.unlock_threshold).length;
  const totalCount = data.benefits.length;

  return (
    <div data-testid="co-owner-benefits-page" className="pb-12">
      {/* ────────── Hero ────────── */}
      <div
        className="onex-card relative overflow-hidden p-6 sm:p-10"
        data-testid="co-benefits-hero"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, rgba(140,255,46,0.10) 0%, rgba(140,255,46,0) 55%)," +
            "radial-gradient(80% 70% at 100% 100%, rgba(167,139,250,0.08) 0%, rgba(167,139,250,0) 55%)," +
            "linear-gradient(180deg, #15161A 0%, #0F0F12 100%)",
        }}
      >
        {/* decorative blurs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#8CFF2E]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-[#A78BFA]/8 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8CFF2E] flex items-center gap-2">
              <Sparkles size={12} /> Co-Owner Benefits
            </div>
            <h1 className="text-4xl sm:text-[52px] font-display tracking-tight text-white leading-[1.05] mt-3">
              Exceptional experiences,<br className="hidden sm:block" />
              <span className="onex-gold-text">unlocked as you grow.</span>
            </h1>
            <p className="text-zinc-400 text-[15px] mt-4 leading-relaxed max-w-xl">
              Every AED you earn moves you closer to membership perks that feel less like a programme and more like a private circle.
              {currentTier
                ? <> You{"\u2019"}re currently a <span className="text-white font-medium">{currentTier.name}</span>{nextTier ? <> — {fmtAED(nextTier.threshold - balance)} from <span className="text-white font-medium">{nextTier.name}</span>.</> : <> — the highest tier.</>}</>
                : <> Reach <span className="text-white font-medium">Member</span> at {fmtAED(500)} to unlock your first benefits.</>}
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <button onClick={() => navigate("/benefits-ladder")} data-testid="co-benefits-ladder-link" className="btn-gold">
                Open Benefits Ladder <ArrowRight size={14} />
              </button>
              <button onClick={() => navigate("/progress")} className="btn-ghost" data-testid="co-benefits-progress-link">
                <Plus size={14} /> Grow your balance
              </button>
            </div>
          </div>

          {/* Balance + tier counter card */}
          <div className="relative" data-testid="co-benefits-current-state">
            <div className="rounded-3xl border border-[#27272A] bg-[#0A0A0B]/80 backdrop-blur p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl onex-gold-fill flex items-center justify-center"><Sparkles size={16} /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Your AED Balance</div>
                  <div className="text-[#8CFF2E] text-[28px] sm:text-[32px] font-display leading-none mt-1">{fmtAED(balance)}</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#27272A] bg-[#15161A] p-3.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Tier</div>
                  <div className="text-white text-[15px] font-semibold mt-1 leading-tight">{currentTier?.name || "Member"}</div>
                </div>
                <div className="rounded-2xl border border-[#27272A] bg-[#15161A] p-3.5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Benefits Active</div>
                  <div className="text-white text-[15px] font-semibold mt-1 leading-tight tabular-nums">{unlockedCount} / {totalCount}</div>
                </div>
              </div>

              {nextTier && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Next: {nextTier.name}</span>
                    <span className="text-[#8CFF2E] tabular-nums">{fmtAED(nextTier.threshold - balance)} to go</span>
                  </div>
                  <TierProgressBar balance={balance} threshold={nextTier.threshold} accent={nextTier.accent} unlocked={false} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ────────── Tier overview rail ────────── */}
      <div className="mt-10" data-testid="co-benefits-tier-rail">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
          <h2 className="text-2xl sm:text-3xl font-display tracking-tight text-white">The four levels</h2>
          <p className="text-zinc-500 text-[13px]">Tap a level for benefit details and the path to unlock.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {TIERS.map((t) => {
            const unlocked = balance >= t.threshold;
            const isCurrent = currentTier?.name === t.name;
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.name}
                onClick={() => setActiveTier({ level: t.level, name: t.name, threshold: t.threshold })}
                data-testid={`tier-card-${t.level}`}
                className={`text-left rounded-3xl p-4 sm:p-5 border transition-all hover:-translate-y-1 ${isCurrent ? "border-[#8CFF2E]/40 bg-[#1F3008]/30" : unlocked ? "border-[#27272A] bg-[#15161A] hover:border-[#8CFF2E]/30" : "border-[#1F1F22] bg-[#0F0F12]"}`}
                style={isCurrent ? { boxShadow: "0 0 30px -6px rgba(140,255,46,0.30)" } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${t.accent}1F`, border: `1px solid ${t.accent}44`, color: t.accent }}>
                    <Icon size={16} />
                  </div>
                  {unlocked ? (
                    <span className="onex-pill bg-[#22C55E]/15 text-[#22C55E] !text-[10px]"><Check size={10} /> Unlocked</span>
                  ) : (
                    <span className="onex-pill bg-white/5 text-zinc-400 !text-[10px]">Locked</span>
                  )}
                </div>
                <div className="text-[10px] uppercase tracking-[0.16em] mt-4" style={{ color: t.accent }}>Level {t.level}</div>
                <div className="text-white text-[15px] sm:text-[16px] font-semibold mt-1 leading-tight">{t.name}</div>
                <div className="text-zinc-500 text-[12px] mt-2 leading-snug line-clamp-2">{t.tagline}</div>
                <TierProgressBar balance={balance} threshold={t.threshold} accent={t.accent} unlocked={unlocked} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────── Tier-by-tier benefit sections ────────── */}
      {TIERS.filter((t) => grouped[t.name]?.length).map((t) => {
        const benefits = grouped[t.name];
        const unlocked = balance >= t.threshold;
        const Icon = t.icon;
        return (
          <section key={t.name} className="mt-14" data-testid={`tier-section-${t.name.replace(/\s+/g, "-").toLowerCase()}`}>
            {/* tier banner */}
            <div
              className="rounded-3xl border p-5 sm:p-7 relative overflow-hidden"
              style={{
                borderColor: `${t.accent}33`,
                background: `linear-gradient(135deg, ${t.accent}14 0%, transparent 50%), #0F0F12`,
              }}
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: t.accent }} />
              <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${t.accent}22`, border: `1.5px solid ${t.accent}55`, color: t.accent }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: t.accent }}>Level {t.level} · {fmtAED(t.threshold)}</div>
                    <h3 className="text-2xl sm:text-[28px] font-display text-white mt-1 leading-tight">{t.name}</h3>
                    <p className="text-zinc-400 text-[13.5px] mt-2 leading-relaxed max-w-xl">{t.lifestyle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {unlocked ? (
                    <span className="onex-pill bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"><Check size={10} /> Unlocked at {fmtAED(t.threshold)}</span>
                  ) : (
                    <span className="onex-pill bg-white/5 text-zinc-300 border border-white/10">{fmtAED(t.threshold - balance)} to unlock</span>
                  )}
                  <button
                    onClick={() => setActiveTier({ level: t.level, name: t.name, threshold: t.threshold })}
                    data-testid={`tier-details-${t.level}`}
                    className="text-[12px] hover:underline flex items-center gap-1"
                    style={{ color: t.accent }}
                  >
                    Tier details <ArrowRight size={12} />
                  </button>
                </div>
              </div>
              {!unlocked && (
                <div className="relative mt-5">
                  <TierProgressBar balance={balance} threshold={t.threshold} accent={t.accent} unlocked={false} />
                </div>
              )}
            </div>

            {/* benefit cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
              {benefits.map((b) => (
                <div
                  key={b.id}
                  className={`onex-card overflow-hidden flex flex-col transition-all ${b.unlocked ? "hover:-translate-y-1" : "opacity-95"}`}
                  data-testid={`benefit-${b.id}`}
                  style={b.unlocked ? { borderColor: `${t.accent}30` } : {}}
                >
                  <div className="relative h-44">
                    <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, #0F0F12 100%)` }} />
                    {!b.unlocked ? (
                      <div className="absolute inset-0 backdrop-blur-[3px] bg-[#0A0A0B]/50 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/70 border border-white/15 flex items-center justify-center"><Lock size={18} className="text-white" /></div>
                        <div className="text-zinc-300 text-[11px] mt-3 uppercase tracking-[0.15em]">Locked</div>
                      </div>
                    ) : (
                      <span
                        className="absolute top-3.5 right-3.5 onex-pill !text-[10px]"
                        style={{ background: `${t.accent}25`, color: t.accent, border: `1px solid ${t.accent}55` }}
                      >
                        <Sparkles size={10} /> Unlocked
                      </span>
                    )}
                    <span className="absolute top-3.5 left-3.5 onex-pill bg-black/55 text-white !text-[10px] backdrop-blur-sm">
                      Level {t.level}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="text-white text-[16px] font-semibold leading-snug">{b.title}</h4>
                    <p className="text-zinc-400 text-[13px] mt-2 leading-relaxed flex-1">{b.description}</p>
                    <div className="mt-4 pt-4 border-t border-[#1F1F22] flex items-center justify-between text-[11.5px]">
                      <span className="text-zinc-500">Unlock at {fmtAED(b.unlock_threshold)}</span>
                      {b.unlocked
                        ? <span className="text-[#22C55E] flex items-center gap-1"><Check size={11} /> Available now</span>
                        : <span style={{ color: t.accent }} className="tabular-nums">{fmtAED(Math.max(0, b.unlock_threshold - balance))} to go</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* ────────── Bottom CTA: ways to grow ────────── */}
      <div
        className="onex-card mt-14 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center relative overflow-hidden"
        data-testid="co-benefits-grow-cta"
        style={{ background: "radial-gradient(80% 60% at 100% 0%, rgba(140,255,46,0.10), transparent 55%), #15161A" }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#8CFF2E]/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#8CFF2E]">Increase your balance</div>
          <h3 className="text-2xl sm:text-3xl font-display text-white mt-2 leading-tight">Three fast ways to climb a tier.</h3>
          <p className="text-zinc-400 text-[13.5px] mt-2 max-w-md leading-relaxed">
            Every action below adds AED to your balance instantly. The more you do, the sooner you unlock the next layer of OneX privileges.
          </p>
        </div>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Attend a webinar", aed: "+25", route: "/webinars", icon: Calendar, color: "#60A5FA" },
            { label: "Invite a friend",  aed: "+50", route: "/invite",   icon: Gift,     color: "#A78BFA" },
            { label: "Top up balance",   aed: "+",   route: "/benefits-ladder", icon: Plus, color: "#8CFF2E" },
          ].map((a) => {
            const Ic = a.icon;
            return (
              <button
                type="button"
                key={a.label}
                onClick={() => navigate(a.route)}
                data-testid={`co-benefits-grow-${a.route.replace("/", "")}`}
                className="onex-card-soft p-4 text-left hover:border-[#8CFF2E]/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${a.color}1F`, border: `1px solid ${a.color}44` }}>
                    <Ic size={15} style={{ color: a.color }} />
                  </div>
                  <span className="text-[#8CFF2E] text-[13px] font-semibold">{a.aed} AED</span>
                </div>
                <div className="text-white text-[14px] font-medium mt-3">{a.label}</div>
                <div className="text-zinc-500 text-[12px] mt-1 flex items-center gap-1">Open <ChevronRight size={12} /></div>
              </button>
            );
          })}
        </div>
      </div>

      <LevelDetailModal
        tier={activeTier}
        currentBalance={balance}
        onClose={() => setActiveTier(null)}
        onAction={(a) => { setActiveTier(null); navigate("/benefits-ladder#topup"); }}
      />
    </div>
  );
};

export default CoOwnerBenefits;
