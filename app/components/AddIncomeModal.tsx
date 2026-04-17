"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

const INCOME_SOURCES = ["Salary", "Freelance", "Dividend", "Rental", "Bonus", "Other"];

export interface IncomeRecord {
  id: string;
  source: string;
  amount: number;
  month_key: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  monthKey: string;
  editData?: IncomeRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddIncomeModal({ open, monthKey, editData, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [source, setSource] = useState(editData?.source ?? "Salary");
  const [amount, setAmount] = useState(editData ? String(editData.amount) : "");
  const [notes, setNotes] = useState(editData?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      lockScroll();
      setSource(editData?.source ?? "Salary");
      setAmount(editData ? String(editData.amount) : "");
      setNotes(editData?.notes ?? "");
    } else {
      unlockScroll();
    }
    return () => { unlockScroll(); };
  }, [open, editData]);

  if (!open) return null;

  async function handleSave() {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    if (editData) {
      await supabase
        .from("income_records")
        .update({ source, amount: parseFloat(amount), notes: notes || null })
        .eq("id", editData.id);
    } else {
      await supabase.from("income_records").insert({
        user_id: user.id,
        source,
        amount: parseFloat(amount),
        month_key: monthKey,
        notes: notes || null,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  const valid = !!amount && parseFloat(amount) > 0;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 520, zIndex: 201,
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          padding: "8px 20px calc(env(safe-area-inset-bottom) + 32px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--separator)", margin: "12px auto 20px" }} />
        <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          {editData ? "Edit Income" : "Add Income"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Source</p>
            <div style={{ position: "relative" }}>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", appearance: "none", boxSizing: "border-box" }}
              >
                {INCOME_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount (₹)</p>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Notes (optional)</p>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. March salary"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !valid}
          style={{
            marginTop: 20, width: "100%", padding: "14px", borderRadius: 14,
            background: "#34c759", border: "none", color: "#fff", fontWeight: 700,
            fontSize: 16, cursor: saving || !valid ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: saving || !valid ? 0.5 : 1,
            transition: "opacity 200ms",
          }}
        >
          {saving ? "Saving…" : editData ? "Save Changes" : "Add Income"}
        </button>
      </div>
    </>
  );
}
