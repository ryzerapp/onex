import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { Calendar, Clock, Users, Star, Play, Bell, Check, ArrowRight, Radio } from "lucide-react";
import LumaRegisterModal from "@/components/webinars/LumaRegisterModal";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { id: "upcoming", label: "Upcoming Events" },
  { id: "registered", label: "Registered Events" },
  { id: "recorded", label: "Recorded Sessions" },
];

const WebinarCardAction = ({ webinar: w, onRegister, onRemind }) => {
  if (w.status === "recorded") {
    return <button className="w-full btn-ghost" data-testid={`webinar-watch-${w.id}`}><Play size={14} /> Watch Recording</button>;
  }
  if (w.registered && w.is_live) {
    return (
      <a
        href={w.luma_url || w.join_url}
        target="_blank"
        rel="noreferrer"
        data-testid={`webinar-join-${w.id}`}
        className="w-full btn-gold pulse-live"
      >
        <Radio size={14} /> Go Live Now
      </a>
    );
  }
  if (w.registered) {
    return (
      <button
        onClick={() => onRemind(w)}
        className="w-full btn-ghost border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10"
        data-testid={`webinar-remind-${w.id}`}
      >
        <Check size={14} /> Registered · <Bell size={12} /> Remind Me
      </button>
    );
  }
  return <button onClick={() => onRegister(w)} className="w-full btn-gold" data-testid={`webinar-register-${w.id}`}>Register <ArrowRight size={14} /></button>;
};

const WebinarEvents = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("upcoming");
  const [data, setData] = useState(null);
  const [modalWebinar, setModalWebinar] = useState(null);

  const load = useCallback((t = tab) => api.get(`/webinars?tab=${t}`).then(({ data }) => setData(data)), [tab]);
  useEffect(() => { load(tab); }, [tab, load]);

  const openRegisterModal = (w) => setModalWebinar(w);

  const confirmRegister = async (w) => {
    try {
      let ref = null;
      try {
        const q = new URLSearchParams(window.location.search);
        ref = q.get("ref") || sessionStorage.getItem("onex_ref");
      } catch (e) { /* noop */ }
      await api.post("/webinars/register", { webinar_id: w.id, ref });
      toast.success(`Registered for ${w.title}`);
      setModalWebinar(null);
      load();
    } catch { toast.error("Could not register"); }
  };

  const remindMe = async (w) => {
    try {
      const { data: r } = await api.post("/webinars/remind", { webinar_id: w.id });
      toast.success(r.message || "Reminder set");
    } catch { toast.error("Could not set reminder"); }
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
            className={`px-5 py-2.5 rounded-full text-[13px] font-medium border transition-all ${tab === t.id ? "onex-gold-fill border-[#8CFF2E]" : "border-[#27272A] text-zinc-300 hover:border-[#8CFF2E]/30"}`}
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
            {featured.is_live && <span className="absolute top-5 right-5 onex-pill bg-[#EF4444]/20 text-[#FCA5A5] border border-[#EF4444]/40 pulse-live"><Radio size={11} /> LIVE NOW</span>}
          </div>
          <div className="p-8 flex flex-col justify-center">
            <div className="text-[12px] uppercase tracking-[0.18em] text-[#8CFF2E]">{featured.is_live ? "Live now" : `Live · ${new Date(featured.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</div>
            <h2 className="text-3xl font-display text-white mt-3 leading-tight">{featured.title}</h2>
            <p className="text-zinc-400 text-[14px] mt-3">{featured.description}</p>
            <div className="flex items-center gap-5 mt-5 text-zinc-400 text-[13px]">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {featured.duration_minutes} min</span>
              <span className="flex items-center gap-1.5"><Users size={14} /> {featured.attendees} attending</span>
              <span className="flex items-center gap-1.5 text-[#8CFF2E]"><Star size={14} /> +AED {featured.aed_reward}</span>
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              {featured.registered && featured.is_live ? (
                <a href={featured.luma_url || featured.join_url} target="_blank" rel="noreferrer" className="btn-gold pulse-live" data-testid="webinar-featured-golive">
                  <Radio size={14} /> Go Live Now
                </a>
              ) : featured.registered ? (
                <button onClick={() => remindMe(featured)} className="btn-ghost border-[#22C55E]/40 text-[#22C55E]" data-testid="webinar-featured-remind">
                  <Check size={14} /> Registered · <Bell size={12} /> Remind Me
                </button>
              ) : (
                <button onClick={() => openRegisterModal(featured)} className="btn-gold" data-testid="webinar-featured-register">Register Now <ArrowRight size={14} /></button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {data.webinars.length === 0 && <div className="text-zinc-500 col-span-3 text-[14px]" data-testid="webinars-empty">No sessions in this tab yet.</div>}
        {data.webinars.map((w) => (
          <div key={w.id} className="onex-card overflow-hidden hover:-translate-y-1 hover:border-[#8CFF2E]/30 transition-all flex flex-col" data-testid={`webinar-card-${w.id}`}>
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
              {w.is_live && <span className="absolute top-4 right-4 onex-pill bg-[#EF4444]/20 text-[#FCA5A5] border border-[#EF4444]/40 pulse-live"><Radio size={11} /> LIVE</span>}
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
                {w.aed_reward > 0 && <span className="flex items-center gap-1 text-[#8CFF2E]"><Star size={12} /> +AED {w.aed_reward}</span>}
              </div>
              <p className="text-zinc-500 text-[13px] mt-3 line-clamp-2">{w.description}</p>
              <div className="mt-5">
                <WebinarCardAction webinar={w} onRegister={openRegisterModal} onRemind={remindMe} />
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
        <button className="btn-ghost text-[#8CFF2E] border-[#8CFF2E]/40" data-testid="webinars-history-btn">View History <ArrowRight size={14} /></button>
      </div>

      <LumaRegisterModal
        open={!!modalWebinar}
        webinar={modalWebinar}
        userEmail={user?.email}
        onConfirm={confirmRegister}
        onClose={() => setModalWebinar(null)}
      />
    </div>
  );
};

export default WebinarEvents;
