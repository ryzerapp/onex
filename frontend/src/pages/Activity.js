import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import {
  ArrowLeft, Sparkles, Gift, Calendar, UserCheck, ShieldCheck, Wallet,
  Award, Bookmark, Share2, Heart, Building2, Trophy, MessageSquare, UserPlus,
} from "lucide-react";

/** Icon resolver — matches the `kind` strings emitted by backend add_activity(). */
const KIND_ICONS = {
  welcome: Sparkles,
  signup_bonus: Gift,
  referral: UserPlus,
  referral_signup: UserPlus,
  referral_kyc: ShieldCheck,
  referral_co_owner: Building2,
  webinar_attended: Calendar,
  webinar_reminder: Calendar,
  milestone: Award,
  topup: Wallet,
  saved_property: Bookmark,
  shared_referral: Share2,
  community_like: Heart,
  community_save: Bookmark,
  kyc_complete: UserCheck,
  allocation_reserved: Building2,
  allocation_ready: Trophy,
  support_message: MessageSquare,
};

const KIND_COLORS = {
  topup: "#8CFF2E",
  milestone: "#22C55E",
  allocation_ready: "#F472B6",
  referral: "#A78BFA",
  referral_signup: "#A78BFA",
  referral_kyc: "#A78BFA",
  referral_co_owner: "#A78BFA",
  webinar_attended: "#60A5FA",
  webinar_reminder: "#60A5FA",
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const Activity = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/activity?limit=100").then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="text-zinc-500" data-testid="activity-loading">Loading activity…</div>;

  const items = data.items || [];

  return (
    <div data-testid="activity-page" className="pb-12">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        data-testid="activity-back-btn"
        className="text-zinc-400 hover:text-white text-[13px] flex items-center gap-1.5 mb-5"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#8CFF2E] flex items-center gap-2">
            <Sparkles size={12} /> Your history
          </div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white mt-2">Activity</h1>
          <p className="text-zinc-400 mt-2 text-[15px] max-w-xl">
            Every AED earned, every milestone hit. The full record of how you climbed the OneX ladder.
          </p>
        </div>

        <div className="onex-card p-4 sm:p-5 flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Events</div>
            <div className="text-white text-[22px] font-semibold tabular-nums mt-1">{data.summary.count}</div>
          </div>
          <div className="w-px h-10 bg-[#27272A]" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">AED earned (visible)</div>
            <div className="text-[#8CFF2E] text-[22px] font-semibold tabular-nums mt-1">+AED {data.summary.aed_earned_visible.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="onex-card mt-8 overflow-hidden" data-testid="activity-list">
        {items.length === 0 ? (
          <div className="p-8 text-center text-zinc-500" data-testid="activity-empty">
            <div className="w-12 h-12 rounded-full bg-[#15161A] border border-[#27272A] mx-auto flex items-center justify-center">
              <Sparkles size={18} className="text-zinc-500" />
            </div>
            <div className="mt-3 text-[14px]">No activity yet — your journey is about to begin.</div>
            <button onClick={() => navigate("/progress")} data-testid="activity-empty-cta" className="btn-gold mt-5">
              Start earning AED
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#27272A]">
            {items.map((a) => {
              const Icon = KIND_ICONS[a.kind] || Sparkles;
              const color = KIND_COLORS[a.kind] || "#8CFF2E";
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-4 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
                  data-testid={`activity-row-${a.id}`}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}1A`, border: `1px solid ${color}40`, color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[14px] font-medium leading-snug">{a.title}</div>
                    <div className="text-zinc-500 text-[11.5px] mt-1 tabular-nums">{fmtDate(a.created_at)}</div>
                  </div>
                  {a.reward > 0 && (
                    <div className="text-[#8CFF2E] text-[14px] font-semibold tabular-nums shrink-0">
                      +AED {a.reward.toLocaleString()}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Activity;
