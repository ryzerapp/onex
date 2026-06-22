import React, { useState } from "react";
import { X, Mail, ExternalLink, Calendar, Clock, Users, Sparkles, Check } from "lucide-react";

/**
 * Lightweight Luma register popup.
 * - Pre-fills the logged-in user's email (read-only)
 * - Primary action: open the Luma event page with the email querystring
 * - Secondary action: open the embedded preview (iframe) inline
 */
const LumaRegisterModal = ({ open, webinar, userEmail, onConfirm, onClose }) => {
  const [showIframe, setShowIframe] = useState(false);
  if (!open || !webinar) return null;

  const lumaUrl = webinar.luma_url || "https://luma.com/dveb7fpt";
  const lumaWithEmail = `${lumaUrl}${lumaUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(userEmail || "")}`;
  const date = webinar.date ? new Date(webinar.date) : null;

  return (
    <div
      data-testid="luma-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-testid="luma-modal"
        className="relative w-full max-w-lg rounded-3xl border border-[#27272A] bg-[#0F0F12] shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 30px 90px -20px rgba(250,204,21,0.18), 0 0 0 1px rgba(250,204,21,0.06)" }}
      >
        <button
          data-testid="luma-modal-close"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
        >
          <X size={16} className="text-zinc-300" />
        </button>

        {!showIframe ? (
          <>
            <div className="relative h-44">
              <img src={webinar.image} alt={webinar.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F12] via-[#0F0F12]/40 to-transparent" />
              <span className="absolute top-4 left-4 onex-gold-fill onex-pill"><Sparkles size={11} /> Luma Event</span>
            </div>
            <div className="p-6">
              <h3 className="text-white text-[20px] font-display tracking-tight leading-snug">{webinar.title}</h3>
              <div className="flex items-center gap-4 mt-3 text-zinc-400 text-[12px]">
                {date && <span className="flex items-center gap-1.5"><Calendar size={12} /> {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                <span className="flex items-center gap-1.5"><Clock size={12} /> {webinar.duration_minutes} min</span>
                <span className="flex items-center gap-1.5"><Users size={12} /> {webinar.attendees}</span>
              </div>

              <div className="mt-5 rounded-2xl border border-[#27272A] bg-[#15161A] p-4">
                <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Registering with</div>
                <div className="mt-2 flex items-center gap-2.5 text-white text-[14px]">
                  <Mail size={14} className="text-[#FACC15]" /> {userEmail || "your account email"}
                </div>
                <div className="mt-3 text-[12px] text-zinc-500 leading-relaxed">
                  We'll prefill this on Luma so you can confirm in a single click. No second sign-in needed.
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <a
                  data-testid="luma-modal-confirm"
                  href={lumaWithEmail}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onConfirm && onConfirm(webinar)}
                  className="btn-gold flex-1 justify-center"
                >
                  <Check size={14} /> Confirm on Luma
                </a>
                <button
                  data-testid="luma-modal-view-full"
                  onClick={() => setShowIframe(true)}
                  className="btn-ghost flex-1 justify-center"
                >
                  <ExternalLink size={14} /> View Full
                </button>
              </div>

              <div className="mt-4 text-center text-[11px] text-zinc-600">
                Powered by Luma · OneX Club secure registration
              </div>
            </div>
          </>
        ) : (
          <div className="relative" data-testid="luma-iframe-wrap">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272A]">
              <button onClick={() => setShowIframe(false)} className="text-[12px] text-zinc-400 hover:text-white transition">← Back to summary</button>
              <a href={lumaWithEmail} target="_blank" rel="noreferrer" className="text-[12px] text-[#FACC15] hover:underline flex items-center gap-1">Open on Luma <ExternalLink size={11} /></a>
            </div>
            <iframe
              title="Luma event"
              src={lumaUrl}
              className="w-full"
              style={{ height: "70vh", border: 0, background: "#fff" }}
              data-testid="luma-iframe"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LumaRegisterModal;
