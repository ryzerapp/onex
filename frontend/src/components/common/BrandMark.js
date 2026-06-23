import React from "react";

/**
 * Circular brand mark (the OneX "X" inside a dark circle).
 * Used wherever the old "1X" text placeholder lived: sidebar, mobile top bar,
 * drawer header, login screen. Drops in as a self-contained <img>.
 */
const BrandMark = ({ size = 44, className = "", glow = false }) => (
  <span
    className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${className}`}
    style={{
      width: size, height: size, flexShrink: 0,
      boxShadow: glow
        ? "0 0 24px rgba(140, 255, 46, 0.32), 0 0 0 1px rgba(140, 255, 46, 0.35) inset"
        : "0 0 0 1px rgba(255, 255, 255, 0.08) inset",
    }}
    aria-label="OneX Club"
  >
    <img
      src="/brand/onex-circle.png"
      alt=""
      className="w-full h-full object-cover"
      draggable={false}
    />
  </span>
);

export default BrandMark;
