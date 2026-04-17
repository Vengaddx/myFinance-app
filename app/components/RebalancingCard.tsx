"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = [
  "stocks", "gold", "fd", "realestate", "crypto", "bank", "cash", "lended", "other",
] as const;

const CAT_LABELS: Record<string, string> = {
  stocks: "Stocks & ETFs",
  gold: "Gold & Silver",
  fd: "Fixed Deposits",
  realestate: "Real Estate",
  crypto: "Crypto",
  bank: "Bank",
  cash: "Cash",
  lended: "Lended",
  other: "Other",
};

const CAT_COLORS: Record<string, string> = {
  stocks: "#00C1FF",
  gold: "#FFBB00",
  fd: "#0055b3",
  realestate: "#AEDD00",
  crypto: "#5b30c0",
  bank: "#4DA8FF",
  cash: "#636366",
  lended: "#1e7a3e",
  other: "#8E8E93",
};

interface Props {
  byCategory: Record<string, number>;
  totalAssets: number;
}

function BarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export default function RebalancingCard({ byCategory, totalAssets }: Props) {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchTargets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("allocation_targets")
      .select("category, target_pct")
      .eq("user_id", user.id);
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as { category: string; target_pct: number }[]) {
      map[row.category] = row.target_pct;
    }
    setTargets(map);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (user) fetchTargets();
  }, [user, fetchTargets]);

  async function saveTargets() {
    if (!user) return;
    setSaving(true);
    const rows = Object.entries(draft)
      .filter(([, v]) => v > 0)
      .map(([category, target_pct]) => ({ user_id: user.id, category, target_pct }));
    await supabase.from("allocation_targets").delete().eq("user_id", user.id);
    if (rows.length > 0) await supabase.from("allocation_targets").insert(rows);
    await fetchTargets();
    setSaving(false);
    setEditMode(false);
  }

  const activeCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat] ?? 0) > 0 || (targets[cat] ?? 0) > 0
  );

  const drifts = activeCategories.map((cat) => {
    const actualPct = totalAssets > 0 ? ((byCategory[cat] ?? 0) / totalAssets) * 100 : 0;
    const targetPct = targets[cat] ?? 0;
    return { cat, actualPct, targetPct, drift: actualPct - targetPct };
  });

  const alertCount = drifts.filter((d) => d.targetPct > 0 && Math.abs(d.drift) > 5).length;
  const hasTargets = Object.values(targets).some((v) => v > 0);
  const draftTotal = Object.values(draft).reduce((a, b) => a + (b || 0), 0);

  if (!loaded) return null;

  const borderColor = alertCount > 0 ? "rgba(255,149,0,0.35)" : "var(--separator)";
  const boxShadow = alertCount > 0
    ? "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(255,149,0,0.10)"
    : "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)";

  return (
    <div style={{ background: "var(--surface)", borderRadius: 20, border: `1px solid ${borderColor}`, padding: "20px", boxShadow }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            background: alertCount > 0 ? "rgba(255,149,0,0.15)" : "rgba(0,122,255,0.10)",
            color: alertCount > 0 ? "#ff9500" : "#007aff",
          }}>
            <BarIcon />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Rebalancing</p>
            {alertCount > 0 && (
              <p style={{ margin: "1px 0 0", fontSize: 12, color: "#ff9500", fontWeight: 600 }}>
                {alertCount} {alertCount === 1 ? "category" : "categories"} drift &gt;5%
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--separator)", background: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={saveTargets}
                disabled={saving}
                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#007aff", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "…" : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setDraft({ ...targets }); setEditMode(true); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--separator)", background: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Set Targets
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-tertiary)" }}>
            Enter target % per category. Total should equal 100%.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[cat], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>{CAT_LABELS[cat]}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft[cat] ?? 0}
                  onChange={(e) => setDraft((p) => ({ ...p, [cat]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: 64, padding: "6px 8px", borderRadius: 8, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, textAlign: "right", fontFamily: "inherit" }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", width: 12 }}>%</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: draftTotal === 100 ? "#34c759" : "#ff9500" }}>
              Total: {draftTotal.toFixed(0)}%
            </span>
          </div>
        </div>
      ) : !hasTargets ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)" }}>No target allocation set.</p>
          <button
            onClick={() => { setDraft({}); setEditMode(true); }}
            style={{ color: "#007aff", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
          >
            Set targets →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {drifts.map(({ cat, actualPct, targetPct, drift }) => {
            const hasTarget = targetPct > 0;
            const isDrift = hasTarget && Math.abs(drift) > 5;
            return (
              <div key={cat}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{CAT_LABELS[cat]}</span>
                    {isDrift && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 5,
                        background: drift > 0 ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.10)",
                        color: drift > 0 ? "#ff9500" : "#ff3b30",
                      }}>
                        {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {hasTarget && (
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>target {targetPct}%</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: isDrift ? (drift > 0 ? "#ff9500" : "#ff3b30") : "var(--text-primary)" }}>
                      {actualPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div style={{ position: "relative", height: 5, borderRadius: 3, background: "var(--surface-secondary, rgba(120,120,128,0.12))", overflow: "visible" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${Math.min(actualPct, 100)}%`, borderRadius: 3,
                    background: CAT_COLORS[cat],
                    transition: "width 600ms cubic-bezier(0.34,1.15,0.64,1)",
                  }} />
                  {hasTarget && (
                    <div style={{
                      position: "absolute", top: -4, width: 2, height: 13,
                      background: isDrift ? "#ff9500" : "var(--text-tertiary)",
                      borderRadius: 1, left: `${Math.min(targetPct, 100)}%`,
                      transform: "translateX(-50%)",
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
