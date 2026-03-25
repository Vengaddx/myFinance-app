"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/planLimits";

// ─── Constants ────────────────────────────────────────────────────────────────

const UPI_ID   = "deeshvenkat98@okicici";
const PAYEE    = "Deesh";
const TXN_NOTE = "MyFinance Premium Upgrade";
const AMOUNT         = 99;
const AMOUNT_STRIKE  = 299;

function buildUpiLink(): string {
  return `tez://upi/pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&tn=${encodeURIComponent(TXN_NOTE)}&am=${AMOUNT}&cu=INR`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CrownIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M2 19h20v2H2zM2 17l4-10 6 5 6-5 4 10H2z" />
    </svg>
  );
}

function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional context label shown in the header (e.g. "Assets limit reached") */
  limitContext?: string;
}

const LIMIT_ROWS: { label: string; free: string; premium: string }[] = [
  { label: "Assets",          free: `${FREE_LIMITS.assets}`,            premium: `${PREMIUM_LIMITS.assets}` },
  { label: "Liabilities",     free: `${FREE_LIMITS.liabilities}`,        premium: `${PREMIUM_LIMITS.liabilities}` },
  { label: "Expenses / month",free: `${FREE_LIMITS.expensesPerMonth}`,   premium: `${PREMIUM_LIMITS.expensesPerMonth}` },
  { label: "Goal scenarios",  free: `${FREE_LIMITS.scenarios}`,          premium: `${PREMIUM_LIMITS.scenarios}` },
];

export default function PremiumUpgradeModal({ open, onClose, limitContext }: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState(false);
  const upiLink = buildUpiLink();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => { document.body.style.overflow = ""; }, 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  if (!open && !visible) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(14px)" : "none",
        WebkitBackdropFilter: visible ? "blur(14px)" : "none",
        transition: "background 320ms ease, backdrop-filter 320ms ease",
      }}
    >
      {/* Sheet */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "28px 28px 0 0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "96dvh",
          overflowY: "auto",
          padding: "0 0 calc(env(safe-area-inset-bottom) + 24px) 0",
          boxShadow: "0 -2px 60px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.07)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 400ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--separator)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
              boxShadow: "0 3px 12px rgba(255,149,0,0.35)",
            }}>
              <CrownIcon size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                MyFinance Premium
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ textDecoration: "line-through", opacity: 0.5 }}>₹{AMOUNT_STRIKE}</span>
                <span style={{ color: "#FF9500", fontWeight: 700 }}>₹{AMOUNT}</span>
                <span>· Unlock expanded limits</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--surface-secondary)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)", fontSize: 18, cursor: "pointer",
              lineHeight: 1, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "14px 20px 0", display: "flex", flexDirection: "column", gap: 13 }}>

          {/* Context banner if limit reached */}
          {limitContext && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 13px",
              background: "rgba(255,149,0,0.08)",
              borderRadius: 12,
              border: "1px solid rgba(255,149,0,0.18)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {limitContext}
              </span>
            </div>
          )}

          {/* Limits comparison table */}
          <div style={{
            background: "var(--surface-secondary)",
            borderRadius: 16,
            border: "1px solid var(--separator)",
            overflow: "hidden",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 90px",
              padding: "9px 16px",
              borderBottom: "1px solid var(--separator)",
            }}>
              <SLabel>Feature</SLabel>
              <SLabel style={{ textAlign: "center" }}>Free</SLabel>
              <SLabel style={{ textAlign: "center", color: "#FF9500" }}>Premium</SLabel>
            </div>
            {LIMIT_ROWS.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 90px",
                  padding: "10px 16px",
                  borderBottom: i < LIMIT_ROWS.length - 1 ? "1px solid var(--separator)" : "none",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", fontWeight: 500, textAlign: "center" }}>{row.free}</span>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "#FF9500",
                    background: "rgba(255,149,0,0.10)",
                    padding: "2px 10px", borderRadius: 6,
                  }}>{row.premium}</span>
                </div>
              </div>
            ))}
          </div>

          {/* QR + UPI */}
          <div style={{
            display: "flex", gap: 14, alignItems: "center",
            padding: "13px",
            background: "var(--surface-secondary)",
            borderRadius: 16,
            border: "1px solid var(--separator)",
          }}>
            {/* QR */}
            <div style={{
              padding: 9,
              background: "#ffffff",
              borderRadius: 13,
              boxShadow: "0 1px 8px rgba(0,0,0,0.10)",
              flexShrink: 0,
              display: "flex",
            }}>
              <QRCodeSVG value={upiLink} size={104} level="M" bgColor="#ffffff" fgColor="#1d1d1f" />
            </div>

            {/* UPI info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
              <SLabel>Pay via UPI · <span style={{ textDecoration: "line-through", opacity: 0.5 }}>₹{AMOUNT_STRIKE}</span> ₹{AMOUNT}</SLabel>
              <span style={{
                fontSize: 13, color: "var(--text-primary)", fontWeight: 500,
                fontFamily: "monospace, 'SF Mono', Menlo",
                wordBreak: "break-all", lineHeight: 1.4,
              }}>
                {UPI_ID}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  alignSelf: "flex-start",
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 9, border: "none",
                  background: copied ? "rgba(52,199,89,0.12)" : "rgba(0,122,255,0.10)",
                  color: copied ? "#34c759" : "#007aff",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 180ms ease",
                  whiteSpace: "nowrap", marginTop: 2,
                }}
              >
                {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                {copied ? "Copied!" : "Copy ID"}
              </button>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                Scan or copy to pay
              </span>
            </div>
          </div>

          {/* Note */}
          <p style={{
            margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5,
            padding: "0 2px",
          }}>
            After paying, send your UPI transaction ID to activate your plan. We'll verify and enable Premium manually.
          </p>

          {/* Pay button */}
          <button
            onClick={() => { window.location.href = upiLink; }}
            style={{
              width: "100%", padding: "14px", borderRadius: 16,
              background: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
              border: "none", color: "#fff", fontWeight: 700,
              fontSize: 15, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(255,149,0,0.40)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "opacity 150ms ease, transform 150ms ease",
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            <CrownIcon size={16} />
            Pay ₹{AMOUNT} via Google Pay
          </button>
        </div>
      </div>

      {/* Copied toast */}
      {copied && (
        <div style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom) + 100px)",
          left: "50%", transform: "translateX(-50%)",
          background: "rgba(52,199,89,0.95)", color: "#fff",
          padding: "9px 20px", borderRadius: 24,
          fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          whiteSpace: "nowrap", zIndex: 2100,
        }}>
          UPI ID copied!
        </div>
      )}
    </div>
  );
}

function SLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      color: "var(--text-secondary)", fontSize: 11,
      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px",
      ...style,
    }}>
      {children}
    </div>
  );
}
