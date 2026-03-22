"use client";

import { useEffect, useRef, useState } from "react";

/* ── Icons ─────────────────────────────────────────────────── */
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function AssetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="8"  y1="14" x2="16" y2="14" />
    </svg>
  );
}
function LiabilityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function ExpenseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/* ── Types ──────────────────────────────────────────────────── */
type Props = {
  onAddAsset:     () => void;
  onAddLiability: () => void;
  onAddExpense?:  () => void;
};

/* ── Component ──────────────────────────────────────────────── */
export default function MobileCreateFab({ onAddAsset, onAddLiability, onAddExpense }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const actions = [
    { label: "Asset",     color: "#007aff", bg: "rgba(0,122,255,0.14)",  icon: <AssetIcon />,     onTap: onAddAsset },
    { label: "Liability", color: "#ff3b30", bg: "rgba(255,59,48,0.14)",  icon: <LiabilityIcon />, onTap: onAddLiability },
    { label: "Expense",   color: "#ff9500", bg: "rgba(255,149,0,0.14)",  icon: <ExpenseIcon />,   onTap: onAddExpense ?? (() => {}) },
  ];

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Backdrop — blurs page when FAB is open */}
      <div
        className="md:hidden"
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 44,
          background: "rgba(0,0,0,0.32)",
          backdropFilter: open ? "blur(3px)" : "none",
          WebkitBackdropFilter: open ? "blur(3px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 240ms ease",
        }}
      />

      {/* FAB stack */}
      <div
        ref={wrapRef}
        className="md:hidden flex flex-col items-end"
        style={{
          position: "fixed",
          right: 20,
          bottom: "calc(env(safe-area-inset-bottom) + 84px)",
          zIndex: 45,
          gap: 10,
        }}
      >
        {/* Action items — fan upward */}
        {actions.map((action, i) => (
          <div
            key={action.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity:   open ? 1 : 0,
              transform: open
                ? "translateY(0) scale(1)"
                : "translateY(20px) scale(0.8)",
              transition: open
                ? `opacity 260ms ease ${i * 60}ms,
                   transform 380ms cubic-bezier(0.34,1.5,0.64,1) ${i * 60}ms`
                : `opacity 160ms ease ${(2 - i) * 40}ms,
                   transform 160ms ease ${(2 - i) * 40}ms`,
              pointerEvents: open ? "auto" : "none",
            }}
          >
            {/* Label pill */}
            <span
              style={{
                background: "rgba(20,20,24,0.88)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 20,
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
                boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {action.label}
            </span>

            {/* Action circle */}
            <button
              onClick={() => { action.onTap(); setOpen(false); }}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: action.bg,
                border: `1.5px solid ${action.color}44`,
                color: action.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: `0 4px 14px ${action.color}30`,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {action.icon}
            </button>
          </div>
        ))}

        {/* Main FAB */}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#007aff",
            color: "#ffffff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: open
              ? "0 6px 24px rgba(0,122,255,0.55), 0 2px 8px rgba(0,0,0,0.15)"
              : "0 4px 18px rgba(0,122,255,0.40), 0 2px 6px rgba(0,0,0,0.10)",
            transform: open ? "rotate(45deg) scale(1.06)" : "rotate(0deg) scale(1)",
            transition: "transform 320ms cubic-bezier(0.34,1.3,0.64,1), box-shadow 200ms ease",
          }}
        >
          <PlusIcon />
        </button>
      </div>
    </>
  );
}
