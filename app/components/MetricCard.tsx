"use client";

import { useTheme } from "@/lib/ThemeContext";

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  subColor?: "green" | "red" | "blue" | "muted";
  variant?: "default" | "danger";
  className?: string;
};

const subColorMap = {
  green: "#34c759",
  red:   "#ff3b30",
  blue:  "#007aff",
  muted: "var(--text-secondary)",
};

export default function MetricCard({
  label,
  value,
  sub,
  subColor = "muted",
  variant = "default",
  className = "",
}: MetricCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isDanger = variant === "danger";

  let background: string;
  let border: string;
  let boxShadow: string;

  if (isDanger) {
    background = isDark ? "rgba(255,59,48,0.08)" : "color-mix(in srgb, #ff3b30 8%, var(--surface))";
    border = "1px solid rgba(255,59,48,0.18)";
    boxShadow = isDark ? "0 0 0 1px rgba(255,59,48,0.12)" : "none";
  } else if (isDark) {
    background = "#000000";
    border = "1px solid rgba(255,255,255,0.1)";
    boxShadow = "0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(255,255,255,0.03)";
  } else {
    background = "var(--surface)";
    border = "1px solid var(--separator)";
    boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.03)";
  }

  return (
    <div
      className={`card-lift rounded-[14px] px-4 py-3 flex flex-col justify-center ${className}`}
      style={{ background, border, boxShadow }}
    >
      <p
        className="text-[11px] font-semibold uppercase mb-1"
        style={{ color: isDanger ? "rgba(255,59,48,0.6)" : "var(--text-tertiary)", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <p
        className="text-[21px] font-bold leading-none"
        style={{ color: isDanger ? "#ff3b30" : "var(--text-primary)", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[12.5px] font-medium mt-1"
          style={{ color: isDanger ? "rgba(255,59,48,0.55)" : subColorMap[subColor] }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
