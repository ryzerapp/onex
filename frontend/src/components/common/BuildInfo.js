/**
 * BuildInfo — a tiny long-press (1.2s) gesture target that opens a modal
 * showing the live backend version (git SHA, start time, python version).
 *
 * Mounted in the member Sidebar footer + AdminLayout footer. Invisible to
 * casual users (just a `v1.0.0` text line); long-press reveals the diag panel.
 * Press-and-hold also works on touch — perfect for QA on iOS / Android beta.
 *
 * Wrap any string with <BuildInfo>v1.0.0</BuildInfo>.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/api";
import { X, Copy, Check, Server } from "lucide-react";

const LONG_PRESS_MS = 1200;

const BuildInfo = ({ children = "v1.0.0", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const fetchVersion = async () => {
    if (version) return;
    try {
      const { data } = await api.get("/version");
      setVersion(data);
    } catch (e) {
      setVersion({ error: "Failed to fetch version" });
    }
  };

  const startPress = () => {
    timerRef.current = setTimeout(() => {
      fetchVersion();
      setOpen(true);
      // Haptic feedback when available — fires once on long-press completion.
      if (navigator.vibrate) navigator.vibrate(15);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };
  useEffect(() => () => cancelPress(), []);

  const copy = () => {
    const text = JSON.stringify(version, null, 2);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const modal = open && (
    <div
      data-testid="build-info-modal"
      className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm fade-in p-6"
      onClick={() => setOpen(false)}
    >
      <div className="onex-card max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setOpen(false)}
          data-testid="build-info-close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center"
        >
          <X size={14} className="text-zinc-300" />
        </button>

        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8CFF2E]">
          <Server size={12} /> Build info
        </div>
        <h3 className="text-[18px] font-display text-white mt-2">OneX Club</h3>

        {!version
          ? <div className="text-zinc-500 text-[13px] mt-4">Loading…</div>
          : version.error
            ? <div className="text-[#EF4444] text-[13px] mt-4">{version.error}</div>
            : (
              <dl className="mt-5 space-y-2.5 text-[12px]" data-testid="build-info-content">
                {[
                  ["App",       version.app],
                  ["Version",   version.version],
                  ["Git SHA",   version.git_sha],
                  ["Started",   new Date(version.started_at).toLocaleString()],
                  ["Python",    version.python],
                  ["Platform",  version.platform],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-3 gap-3">
                    <dt className="text-zinc-500 col-span-1">{k}</dt>
                    <dd className="text-white col-span-2 tabular-nums break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

        <button
          onClick={copy}
          data-testid="build-info-copy"
          disabled={!version}
          className="btn-ghost w-full mt-5 disabled:opacity-50"
        >
          {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy as JSON</>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <span
        data-testid="build-info-trigger"
        className={`select-none cursor-help inline-block ${className}`}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        title="Hold for 1.2 seconds to see build info"
      >
        {children}
      </span>
      {typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
};

export default BuildInfo;
