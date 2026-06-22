import React from "react";

// SVG circular progress ring. `size`, stroke, percent (0-100), color.
const ProgressRing = ({
  size = 180,
  stroke = 10,
  percent = 0,
  color = "#8CFF2E",
  trackColor = "#27272A",
  children,
  className = "",
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

export default ProgressRing;
