"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabase";

type LogRow = {
  id: string;
  action_type: string;
  amount: number;
  previous_outstanding: number | null;
  new_outstanding: number | null;
  action_date: string;
  remarks: string | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "#007aff" },
  repayment: { label: "Repayment", color: "#34c759" },
  borrowed_more: { label: "Borrowed More", color: "#ff9500" },
  adjustment: { label: "Adjustment", color: "#af52de" },
  closed: { label: "Closed", color: "#636366" },
};

type Props = {
  open: boolean;
  onClose: () => void;
  liabilityId: string | null;
  liabilityName: string;
  currency: string;
};

function fmtDate(d: string) {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LiabilityLogsModal({ open, onClose, liabilityId, liabilityName, currency }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currencySymbol = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : "₹";

  useEffect(() => {
    if (!open || !liabilityId) { setLogs([]); return; }
    setLoading(true);
    supabase
      .from("liability_logs")
      .select("*")
      .eq("liability_id", liabilityId)
      .order("action_date", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (!error) setLogs((data as LogRow[]) ?? []);
      });
  }, [open, liabilityId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const modalBg = isDark ? "rgba(18,18,20,0.96)" : "rgba(255,255,255,0.94)";
  const modalBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)";
  const titleColor = isDark ? "#ffffff" : "#1d1d1f";
  const labelColor = isDark ? "rgba(235,235,245,0.45)" : "#aeaeb2";
  const dividerColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const closeBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const closeColor = isDark ? "rgba(235,235,245,0.6)" : "#86868b";
  const cancelBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const cancelColor = isDark ? "rgba(235,235,245,0.6)" : "#86868b";

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center justify-center px-4 py-6"}`}
      style={{
        background: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 200ms ease",
      }}
    >
      <div
        style={{
          background: modalBg,
          backdropFilter: "blur(48px) saturate(200%)",
          WebkitBackdropFilter: "blur(48px) saturate(200%)",
          borderRadius: isMobile ? "24px 24px 0 0" : 20,
          border: modalBorder,
          boxShadow: isDark
            ? "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 32px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)",
          width: "100%",
          maxWidth: isMobile ? "100%" : 580,
          maxHeight: isMobile ? "92dvh" : "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateY(0)" : (isMobile ? "translateY(100%)" : "scale(0.97) translateY(12px)"),
          opacity: open ? 1 : 0,
          transition: "transform 320ms cubic-bezier(0.34,1.2,0.64,1), opacity 200ms ease",
        }}
      >
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-[4px] rounded-full" style={{ background: "rgba(120,120,128,0.3)" }} />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${dividerColor}` }}>
          <div>
            <h2 className="text-[19px] font-semibold" style={{ color: titleColor, letterSpacing: "-0.02em" }}>
              Liability Logs
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: labelColor }}>{liabilityName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: closeBg, color: closeColor, transition: "background 150ms ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = closeBg; }}
            aria-label="Close"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Log entries */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <p className="text-center text-[14px] py-10" style={{ color: labelColor }}>Loading...</p>
          )}
          {!loading && logs.length === 0 && (
            <p className="text-center text-[14px] py-10" style={{ color: labelColor }}>No logs yet</p>
          )}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col gap-3">
              {logs.map((log) => {
                const meta = ACTION_META[log.action_type] ?? { label: log.action_type, color: "#636366" };
                return (
                  <div
                    key={log.id}
                    className="rounded-[14px] p-4"
                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: `${meta.color}18`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[12px]" style={{ color: labelColor }}>{fmtDate(log.action_date)}</span>
                    </div>

                    <div className="flex items-start gap-5 flex-wrap">
                      <div>
                        <p className="text-[10.5px] uppercase font-semibold mb-0.5" style={{ color: labelColor, letterSpacing: "0.07em" }}>Amount</p>
                        <p className="text-[14px] font-semibold" style={{ color: titleColor }}>
                          {currencySymbol}{Number(log.amount).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {log.previous_outstanding != null && (
                        <div>
                          <p className="text-[10.5px] uppercase font-semibold mb-0.5" style={{ color: labelColor, letterSpacing: "0.07em" }}>Before</p>
                          <p className="text-[14px] font-semibold" style={{ color: titleColor }}>
                            {currencySymbol}{Number(log.previous_outstanding).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                      {log.new_outstanding != null && (
                        <div>
                          <p className="text-[10.5px] uppercase font-semibold mb-0.5" style={{ color: labelColor, letterSpacing: "0.07em" }}>After</p>
                          <p className="text-[14px] font-semibold" style={{ color: titleColor }}>
                            {currencySymbol}{Number(log.new_outstanding).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                    </div>

                    {log.remarks && (
                      <p className="text-[12px] mt-2" style={{ color: labelColor }}>{log.remarks}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-[12px] text-[14px] font-medium w-full"
            style={{ background: cancelBg, color: cancelColor, transition: "background 150ms ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cancelBg; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
