import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, PlayCircle, Sparkles, Youtube, Clock, Check, X,
} from "lucide-react";

/**
 * Learning Journey — full-page list of every webinar the user has registered for,
 * grouped into Upcoming · Past with recording · Past attended (no recording yet).
 *
 * Recordings open in a centered modal with the YouTube/Vimeo iframe embedded
 * — taps "Watch recording" → modal → iframe player.
 *
 * Recording links are admin-managed via `/admin/webinars` → `recording_url`.
 */

// Convert YouTube/Vimeo public URL → embeddable iframe src.
const toEmbed = (url) => {
  if (!url) return null;
  // YouTube watch?v=, youtu.be/, embed/ — all map to /embed/<id>.
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return url; // fall back to raw URL inside iframe (works for most embed-friendly hosts)
};

const RecordingModal = ({ webinar, onClose }) => {
  if (!webinar) return null;
  const src = toEmbed(webinar.recording_url);
  return (
    <div
      data-testid="recording-modal"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/85 backdrop-blur-sm fade-in p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-5xl onex-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272A]">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#EF4444] flex items-center gap-1.5"><Youtube size={10}/> Recording</div>
            <div className="text-white text-[15px] font-semibold truncate">{webinar.title}</div>
          </div>
          <button onClick={onClose} data-testid="recording-modal-close" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center">
            <X size={16} className="text-zinc-300"/>
          </button>
        </div>
        <div className="aspect-video bg-black">
          {src
            ? <iframe src={src} title={webinar.title}
                      className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen/>
            : <div className="grid place-items-center h-full text-zinc-500 text-[14px]">No recording attached.</div>}
        </div>
      </div>
    </div>
  );
};

const LearningJourney = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [openWebinar, setOpenWebinar] = useState(null);

  useEffect(() => {
    api.get("/webinars/my").then(({ data }) => setData(data)).catch(() => setData({ items: [] }));
  }, []);

  const groups = useMemo(() => {
    const items = data?.items || [];
    const now = Date.now();
    const upcoming = items.filter((w) => new Date(w.starts_at).getTime() > now);
    const pastWithRec = items.filter((w) => new Date(w.starts_at).getTime() <= now && w.recording_url);
    const pastNoRec = items.filter((w) => new Date(w.starts_at).getTime() <= now && !w.recording_url);
    return { upcoming, pastWithRec, pastNoRec };
  }, [data]);

  if (!data) return <div className="text-zinc-400" data-testid="learning-journey-loading">Loading…</div>;

  return (
    <div data-testid="learning-journey-page" className="pb-12">
      <button onClick={() => navigate(-1)} data-testid="learning-back-btn"
              className="text-zinc-400 hover:text-white text-[13px] flex items-center gap-1.5 mb-5">
        <ArrowLeft size={14}/> Back
      </button>

      <div className="text-[11px] uppercase tracking-[0.2em] text-[#8CFF2E] flex items-center gap-2">
        <Sparkles size={12}/> Learning Journey
      </div>
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white mt-2">Your sessions</h1>
      <p className="text-zinc-400 text-[15px] mt-2 max-w-xl">
        Every briefing you've joined, every replay you can rewatch — your private archive of OneX intel.
      </p>

      {/* Recordings */}
      {groups.pastWithRec.length > 0 && (
        <section className="mt-10" data-testid="learning-recordings-section">
          <div className="flex items-center gap-2 mb-4">
            <PlayCircle size={16} className="text-[#EF4444]"/>
            <h2 className="text-[20px] font-display text-white">Recorded sessions</h2>
            <span className="text-zinc-500 text-[12px]">· {groups.pastWithRec.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.pastWithRec.map((w) => (
              <button key={w.id} onClick={() => setOpenWebinar(w)} data-testid={`recording-card-${w.id}`}
                      className="onex-card overflow-hidden text-left group hover:border-[#EF4444]/40 transition-colors">
                <div className="aspect-video relative bg-[#15161A]">
                  {w.image
                    ? <img src={w.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                    : <div className="absolute inset-0 grid place-items-center text-zinc-700"><Youtube size={48}/></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="w-14 h-14 rounded-full bg-[#EF4444] grid place-items-center group-hover:scale-110 transition-transform">
                      <PlayCircle size={28} className="text-white" strokeWidth={1.5}/>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-white text-[14px] font-semibold leading-tight line-clamp-2">{w.title}</div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] mt-1.5">
                    <Calendar size={11}/> {new Date(w.starts_at).toLocaleDateString()} · {w.duration_minutes || 60} min
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {groups.upcoming.length > 0 && (
        <section className="mt-12" data-testid="learning-upcoming-section">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-[#8CFF2E]"/>
            <h2 className="text-[20px] font-display text-white">Upcoming · you're registered</h2>
            <span className="text-zinc-500 text-[12px]">· {groups.upcoming.length}</span>
          </div>
          <ul className="onex-card divide-y divide-[#27272A]">
            {groups.upcoming.map((w) => (
              <li key={w.id} className="p-5 flex items-center gap-4" data-testid={`upcoming-row-${w.id}`}>
                <div className="w-12 h-12 rounded-2xl bg-[#8CFF2E]/12 border border-[#8CFF2E]/30 grid place-items-center shrink-0">
                  <Calendar size={18} className="text-[#8CFF2E]"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[14px] font-medium leading-tight">{w.title}</div>
                  <div className="text-zinc-500 text-[12px] mt-0.5">{new Date(w.starts_at).toLocaleString()}</div>
                </div>
                {w.luma_url && (
                  <a href={w.luma_url} target="_blank" rel="noreferrer" data-testid={`upcoming-luma-${w.id}`}
                     className="btn-ghost !py-2 text-[12px]">Open Luma</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Past, no recording */}
      {groups.pastNoRec.length > 0 && (
        <section className="mt-12" data-testid="learning-past-section">
          <div className="flex items-center gap-2 mb-4">
            <Check size={16} className="text-zinc-500"/>
            <h2 className="text-[20px] font-display text-white">Past · recording pending</h2>
          </div>
          <ul className="onex-card divide-y divide-[#27272A]">
            {groups.pastNoRec.map((w) => (
              <li key={w.id} className="p-5 flex items-center gap-4 opacity-70" data-testid={`past-row-${w.id}`}>
                <Calendar size={16} className="text-zinc-500 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[14px] font-medium leading-tight">{w.title}</div>
                  <div className="text-zinc-500 text-[12px] mt-0.5">{new Date(w.starts_at).toLocaleString()}</div>
                </div>
                <span className="text-zinc-500 text-[11px]">Recording uploads soon</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(data.items || []).length === 0 && (
        <div className="onex-card p-10 text-center mt-10" data-testid="learning-empty">
          <Calendar size={32} className="text-zinc-700 mx-auto"/>
          <div className="text-white text-[16px] font-semibold mt-3">No sessions yet</div>
          <div className="text-zinc-500 text-[13px] mt-1">Browse webinars and register to start your archive.</div>
          <button onClick={() => navigate("/webinars")} className="btn-gold mt-5">Browse webinars</button>
        </div>
      )}

      <RecordingModal webinar={openWebinar} onClose={() => setOpenWebinar(null)}/>
    </div>
  );
};

export default LearningJourney;
