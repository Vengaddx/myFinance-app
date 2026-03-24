"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectionEvent } from "@/app/goals/page";

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editData?: ProjectionEvent;
  userId: string;
  scenarioId: string;
  onClose: () => void;
  onSave: () => void;
}

const QUICK_PICKS = [
  { name: "Wedding", type: "expense" as const },
  { name: "House Down Payment", type: "expense" as const },
  { name: "Car Purchase", type: "expense" as const },
  { name: "International Travel", type: "expense" as const },
  { name: "Medical / Health", type: "expense" as const },
  { name: "Education / Course", type: "expense" as const },
  { name: "Annual Bonus", type: "income" as const },
  { name: "Property Sale", type: "income" as const },
  { name: "Investment Maturity", type: "income" as const },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--separator)",
  background: "var(--surface-secondary)",
  color: "var(--text-primary)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectionEventModal({
  open,
  editData,
  userId,
  scenarioId,
  onClose,
  onSave,
}: Props) {
  const nameRef = useRef<HTMLInputElement>(null);

  const blank = {
    event_name: "",
    amount: "",
    event_type: "expense" as "expense" | "income",
    event_date: todayDate(),
    notes: "",
  };

  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      setForm({
        event_name: editData.event_name,
        amount: String(editData.amount),
        event_type: editData.event_type,
        event_date: editData.event_date.slice(0, 10),
        notes: editData.notes ?? "",
      });
    } else {
      setForm(blank);
    }
    setError("");
  }, [editData, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard dismiss + focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ─── Icons ───────────────────────────────────────────────────────────────────

function IconArrowDown({ size = 14, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IconArrowUp({ size = 14, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function applyQuick(q: (typeof QUICK_PICKS)[0]) {
    setForm((f) => ({ ...f, event_name: q.name, event_type: q.type }));
    setTimeout(() => nameRef.current?.focus(), 10);
  }

  async function handleSave() {
    setError("");
    if (!form.event_name.trim()) return setError("Enter an event name.");
    if (
      !form.amount ||
      isNaN(Number(form.amount)) ||
      Number(form.amount) <= 0
    )
      return setError("Enter a valid amount greater than 0.");
    if (!form.event_date) return setError("Select a date for this event.");

    setSaving(true);

    const payload = {
      user_id: userId,
      scenario_id: scenarioId,
      event_name: form.event_name.trim(),
      amount: Number(form.amount),
      event_type: form.event_type,
      event_date: form.event_date,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let err: { message: string } | null = null;

    if (editData) {
      const { error: e } = await supabase
        .from("projection_events")
        .update(payload)
        .eq("id", editData.id);
      err = e;
    } else {
      const { error: e } = await supabase
        .from("projection_events")
        .insert({ ...payload, created_at: new Date().toISOString() });
      err = e;
    }

    setSaving(false);
    if (err) return setError(err.message);
    onSave();
  }

  if (!open) return null;

  const isExpense = form.event_type === "expense";
  const accentColor = isExpense ? "#ff3b30" : "#34c759";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.52)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 28,
          padding: "28px 28px 24px",
          width: "100%",
          maxWidth: 440,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.45)",
          border: "1px solid var(--separator)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {editData ? "Edit Event" : "Add Event"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--surface-secondary)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Quick picks (add mode only) */}
        {!editData && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                marginBottom: 9,
              }}
            >
              Quick Add
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              {QUICK_PICKS.map((q) => {
                const active = form.event_name === q.name;
                return (
                  <button
                    key={q.name}
                    onClick={() => applyQuick(q)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: 20,
                      border: "1px solid",
                      borderColor: active
                        ? q.type === "expense"
                          ? "#ff3b30"
                          : "#34c759"
                        : "var(--separator)",
                      background: active
                        ? q.type === "expense"
                          ? "rgba(255,59,48,0.1)"
                          : "rgba(52,199,89,0.1)"
                        : "var(--surface-secondary)",
                      color: active
                        ? q.type === "expense"
                          ? "#ff3b30"
                          : "#34c759"
                        : "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 120ms ease",
                    }}
                  >
                    {q.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Event type toggle */}
          <Field label="Type">
            <div style={{ display: "flex", gap: 8 }}>
              {(["expense", "income"] as const).map((t) => {
                const a = form.event_type === t;
                const c = t === "expense" ? "#ff3b30" : "#34c759";
                return (
                  <button
                    key={t}
                    onClick={() => set("event_type", t)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 14,
                      border: "1px solid",
                      borderColor: a ? c : "var(--separator)",
                      background: a
                        ? t === "expense"
                          ? "rgba(255,59,48,0.10)"
                          : "rgba(52,199,89,0.10)"
                        : "var(--surface-secondary)",
                      color: a ? c : "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 120ms ease",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                      {t === "expense"
                        ? <IconArrowDown size={13} stroke={a ? c : "var(--text-secondary)"} />
                        : <IconArrowUp size={13} stroke={a ? c : "var(--text-secondary)"} />
                      }
                      {t === "expense" ? "Expense" : "Income"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Event Name">
            <input
              ref={nameRef}
              value={form.event_name}
              onChange={(e) => set("event_name", e.target.value)}
              placeholder="e.g. Wedding, House, Bonus"
              style={INPUT}
            />
          </Field>

          <Field label="Amount (₹)">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="e.g. 2000000"
              min={0}
              style={INPUT}
            />
          </Field>

          <Field label="Event Date">
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              style={INPUT}
            />
          </Field>

          <Field label="Notes (optional)">
            <input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Add a note…"
              style={INPUT}
            />
          </Field>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              color: "#ff3b30",
              fontSize: 13,
              marginTop: 14,
              padding: "8px 12px",
              background: "rgba(255,59,48,0.08)",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 16,
              background: "var(--surface-secondary)",
              border: "1px solid var(--separator)",
              color: "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: "13px",
              borderRadius: 16,
              background: accentColor,
              border: "none",
              color: "#fff",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 15,
              opacity: saving ? 0.7 : 1,
              fontFamily: "inherit",
              boxShadow: saving
                ? "none"
                : `0 4px 16px ${isExpense ? "rgba(255,59,48,0.28)" : "rgba(52,199,89,0.28)"}`,
            }}
          >
            {saving
              ? "Saving…"
              : editData
              ? "Update Event"
              : isExpense
              ? "Add Expense"
              : "Add Income"}
          </button>
        </div>
      </div>
    </div>
  );
}
