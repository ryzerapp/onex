import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { Calendar, Clock, Users, Star, Play, Bell, Check, ArrowRight } from "lucide-react";

const TABS = [
  { id: "upcoming", label: "Upcoming Events" },
  { id: "registered", label: "Registered Events" },
  { id: "recorded", label: "Recorded Sessions" },
];

const WebinarEvents = () => {
  const [tab, setTab] = useState("upcoming");
  const [data, setData] = useState(null);
  const load = useCallback((t = tab) => api.get(`/webinars?tab=${t}`).then(({ data }) => setData(data)), [tab]);
  useEffect(() => { load(tab); }, [tab, load]);

  const register = async (w) => {
    try { await api.post("/webinars/register", { webinar_id: w.id }); toast.success(`Registered for ${w.title}`); load(); }
    catch { toast.error("Could not register"); }
  };

  if (!data) return <div className="text-zinc-500" data-testid="webinars-loading">Loading webinars…</div>;

  const featured = data.featured;

  return (
    <div data-testid="webinars-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Webinar Events</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Reduce investment anxiety with curated expert sessions.</p>

      <div className="flex gap-2 mt-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`webinars-tab-${t.id}`}
            className={`px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${tab === t.id ? "onex-gold-fill border-[#FACC15]" : "border-[#27272A] text-zinc-300 hover:border-[#FACC15]/30"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Featured */}
      {featured && tab === "upcoming" && (
        <div className="onex-card overflow-hidden mt-8 grid grid-cols-1 md:grid-cols-2" data-testid="webinar-featured">
          <div className="relative h-72 md:h-auto">
            <img src={featured.image} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B] via-[#0A0A0B]/30 to-transparent" />
            <span className="absolute top-5 left-5 onex-gold-fill onex-pill"><Star size={11} /> Featured</span>
          </div>
          <div className="p-8 flex flex-col justify-center">
            <div className="text-[12px] uppercase tracking-[0.18em] text-[#FACC15]">Live · {new Date(featured.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <h2 className="text-3xl font-display text-white mt-3 leading-tight">{featured.title}</h2>
            <p className="text-zinc-400 text-[14px] mt-3">{featured.description}</p>
            <div className="flex items-center gap-5 mt-5 text-zinc-400 text-[13px]">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {featured.duration_minutes} min</span>
              <span className="flex items-center gap-1.5"><Users size={14} /> {featured.attendees} attending</span>
              <span className="flex items-center gap-1.5 text-[#FACC15]"><Star size={14} /> +AED {featured.aed_reward}</span>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => register(featured)} className="btn-gold" data-testid="webinar-featured-register">Register Now <ArrowRight size={14} /></button>
              <button className="btn-ghost" data-testid="webinar-featured-remind"><Bell size={14} /> Remind Me</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {data.webinars.length === 0 && <div className="text-zinc-500 col-span-3 text-[14px]" data-testid="webinars-empty">No sessions in this tab yet.</div>}
        {data.webinars.map((w) => (
          <div key={w.id} className="onex-card overflow-hidden hover:-translate-y-1 hover:border-[#FACC15]/30 transition-all flex flex-col" data-testid={`webinar-card-${w.id}`}>
            <div className="relative h-44">
              <img src={w.image} alt={w.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B]/80 via-transparent to-transparent" />
              {w.status === "recorded" && (
                <button className="absolute inset-0 flex items-center justify-center" data-testid={`webinar-play-${w.id}`}>
                  <div className="w-14 h-14 rounded-full onex-gold-fill flex items-center justify-center"><Play size={20} fill="#0A0A0B" /></div>
                </button>
              )}
              <span className="absolute top-4 left-4 onex-pill bg-black/40 text-white backdrop-blur-md">
                {w.status === "recorded" ? "Recording" : new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h4 className="text-white text-[16px] font-semibold leading-tight">{w.title}</h4>
              <div className="flex items-center gap-2 mt-3">
                <img src={w.host_image} alt={w.host} className="w-7 h-7 rounded-full" />
                <span className="text-zinc-400 text-[12px]">Hosted by {w.host}</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-400 text-[12px] mt-3">
                <span className="flex items-center gap-1.5"><Clock size={12} /> {w.duration_minutes} min</span>
                <span className="flex items-center gap-1.5"><Users size={12} /> {w.attendees}</span>
                {w.aed_reward > 0 && <span className="flex items-center gap-1 text-[#FACC15]"><Star size={12} /> +AED {w.aed_reward}</span>}
              </div>
              <p className="text-zinc-500 text-[13px] mt-3 line-clamp-2">{w.description}</p>
              <div className="mt-5">
                {w.status === "recorded" ? (
                  <button className="w-full btn-ghost" data-testid={`webinar-watch-${w.id}`}><Play size={14} /> Watch Recording</button>
                ) : w.registered ? (
                  <button disabled className="w-full btn-ghost border-[#22C55E]/40 text-[#22C55E]" data-testid={`webinar-registered-${w.id}`}><Check size={14} /> Registered</button>
                ) : (
                  <button onClick={() => register(w)} className="w-full btn-gold" data-testid={`webinar-register-${w.id}`}>Register <ArrowRight size={14} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Learning summary */}
      <div className="onex-card mt-10 p-6 flex items-center justify-between gap-6 flex-wrap" data-testid="webinars-summary">
        <div>
          <h3 className="text-white text-[18px] font-semibold">Your Learning Journey</h3>
          <p className="text-zinc-400 text-[13px]">Attended {data.summary.attended} · Registered {data.summary.registered}</p>
        </div>
        <button className="btn-ghost text-[#FACC15] border-[#FACC15]/40" data-testid="webinars-history-btn">View History <ArrowRight size={14} /></button>
      </div>
    </div>
  );
};

export default WebinarEvents;
