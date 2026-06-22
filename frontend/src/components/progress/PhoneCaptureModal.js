import React, { useEffect, useState } from "react";
import { X, Smartphone, Shield } from "lucide-react";

/** Small modal that captures a phone number before completing the "Verify Mobile" milestone. */
const PhoneCaptureModal = ({ open, onSubmit, onClose }) => {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const submit = async () => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) return;
    setSubmitting(true);
    try { await onSubmit(phone.trim()); } finally { setSubmitting(false); }
  };

  return (
    <div
      data-testid="phone-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div data-testid="phone-modal" className="w-full max-w-md rounded-3xl border border-[#27272A] bg-[#0F0F12] p-6 relative" style={{ boxShadow: "0 30px 90px -20px rgba(250,204,21,0.16)" }}>
        <button data-testid="phone-modal-close" onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
          <X size={16} className="text-zinc-300" />
        </button>
        <div className="w-12 h-12 rounded-2xl onex-gold-fill flex items-center justify-center"><Smartphone size={18} /></div>
        <h3 className="text-white text-[20px] font-display tracking-tight mt-4 leading-snug">Verify your mobile</h3>
        <p className="text-zinc-400 text-[13px] mt-2 leading-relaxed">
          Add a number so our concierge can reach you quickly for time-sensitive allocation slots. We never share it.
        </p>

        <label className="block mt-5 text-[12px] text-zinc-500">Mobile number</label>
        <input
          data-testid="phone-modal-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 123 4567"
          className="mt-2 w-full onex-card-soft px-4 py-3 text-white text-[14px] outline-none focus:border-[#FACC15]/40 transition-all"
          autoFocus
        />

        <div className="mt-3 text-[11px] text-zinc-500 flex items-center gap-1.5"><Shield size={11} className="text-[#22C55E]" /> Bank-grade encryption. Never shared.</div>

        <button
          data-testid="phone-modal-submit"
          onClick={submit}
          disabled={submitting || phone.replace(/\D/g, "").length < 7}
          className="mt-5 w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Verifying…" : "Verify & earn +AED 25"}
        </button>
      </div>
    </div>
  );
};

export default PhoneCaptureModal;
