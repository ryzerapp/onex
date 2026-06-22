import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { X, Sparkles, Loader2, ArrowRight, Check } from "lucide-react";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 8;

/**
 * Modal for buying AED Balance via Stripe Checkout.
 *
 * - Fetches packages from /api/payments/packages
 * - On select → POST /api/payments/checkout → window.location.href = url
 * - The success URL points back to /benefits-ladder?session_id=...
 *   The parent page handles that redirect and shows the success state.
 */
const TopUpModal = ({ open, onClose }) => {
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/payments/packages").then(({ data }) => {
      setPackages(data.packages);
      setSelected(data.packages.find((p) => p.id === "pro")?.id || data.packages[0]?.id);
    });
  }, [open]);

  if (!open) return null;

  const checkout = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        package_id: selected,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error("Could not start checkout. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="topup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in p-6"
      onClick={onClose}
    >
      <div
        className="onex-card max-w-2xl w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          data-testid="topup-close-btn"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
        >
          <X size={16} className="text-zinc-300" />
        </button>

        <div className="flex items-center gap-2 text-[#FACC15]">
          <Sparkles size={16} />
          <span className="text-[12px] uppercase tracking-[0.18em] font-medium">Top up AED Balance</span>
        </div>
        <h2 className="text-3xl font-display tracking-tight text-white mt-3 leading-tight">
          Unlock the next tier — today.
        </h2>
        <p className="text-zinc-400 text-[14px] mt-2">
          Each AED on your balance reduces your effective entry on every future Dubai allocation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {packages.map((p) => {
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                data-testid={`topup-pkg-${p.id}`}
                className={`onex-card-soft p-5 text-left transition-all relative ${isSelected ? "ring-2 ring-[#FACC15] !border-[#FACC15]" : "hover:border-[#FACC15]/30"}`}
              >
                {p.id === "pro" && (
                  <span className="absolute -top-2 -right-2 onex-pill onex-gold-fill !text-[10px]">Best value</span>
                )}
                <div className="text-white text-[16px] font-semibold">{p.name}</div>
                <div className="text-[#FACC15] text-[24px] font-display mt-2">+AED {p.aed.toLocaleString()}</div>
                <div className="text-zinc-400 text-[13px] mt-1">${p.usd.toFixed(2)} USD</div>
                <div className="text-zinc-500 text-[12px] mt-3">{p.tagline}</div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full onex-gold-fill flex items-center justify-center">
                    <Check size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 text-[12px] text-zinc-500">
          <span>Secured by Stripe · Test mode</span>
          <span>Card details never touch our servers.</span>
        </div>

        <button
          onClick={checkout}
          disabled={busy || !selected}
          data-testid="topup-checkout-btn"
          className={`mt-5 w-full btn-gold !py-4 text-[15px] ${busy ? "opacity-70 cursor-wait" : ""}`}
        >
          {busy ? (<><Loader2 size={16} className="animate-spin" /> Redirecting…</>) : (<>Continue to secure checkout <ArrowRight size={16} /></>)}
        </button>
      </div>
    </div>
  );
};

export { POLL_INTERVAL_MS, MAX_POLLS };
export default TopUpModal;
