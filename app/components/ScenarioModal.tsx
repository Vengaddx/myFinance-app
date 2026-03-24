"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectionScenario } from "@/app/goals/page";

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editData?: ProjectionScenario;
  userId: string;
  onClose: () => void;
  onSave: (scenario: ProjectionScenario) => void;
}

const PRESETS = [
  { label: "3 Years", months: 36 },
  { label: "5 Years", months: 60 },
  { label: "10 Years", months: 120 },
];

// Returns "YYYY-MM" for today
function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

export default function ScenarioModal({
  open,
  editData,
  userId,
  onClose,
  onSave,
}: Props) {
  const firstRef = useRef<HTMLInputElement>(null);

  const blank = {
    name: "",
    current_net_worth: "",
    monthly_income: "",
    monthly_investment: "",
    annual_return_pct: "12",
    start_date: todayMonth(),
    months: "60",
  };

  const [form, setForm] = useState(blank);
  const [customHorizon, setCustomHorizon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      const ym = editData.start_date.slice(0, 7);
      setForm({
        name: editData.name,
        current_net_worth: String(editData.current_net_worth),
        monthly_income: String(editData.monthly_income),
        monthly_investment: String(editData.monthly_investment),
        annual_return_pct: String(editData.annual_return_pct),
        start_date: ym,
        months: String(editData.months),
      });
      setCustomHorizon(!PRESETS.some((p) => p.months === editData.months));
    } else {
      setForm(blank);
      setCustomHorizon(false);
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
    setTimeout(() => firstRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function handleSave() {
    setError("");
    if (!form.name.trim()) return setError("Enter a scenario name.");
    if (!form.current_net_worth || isNaN(Number(form.current_net_worth)))
      return setError("Enter a valid current net worth.");
    if (!form.monthly_investment || isNaN(Number(form.monthly_investment)))
      return setError("Enter a valid monthly investment amount.");
    const months = Number(form.months);
    if (!form.months || isNaN(months) || months < 1)
      return setError("Enter a valid time horizon (at least 1 month).");

    setSaving(true);

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      current_net_worth: Number(form.current_net_worth),
      monthly_income: Number(form.monthly_income) || 0,
      monthly_investment: Number(form.monthly_investment),
      annual_return_pct: Number(form.annual_return_pct) || 0,
      start_date: form.start_date + "-01",
      months,
      updated_at: new Date().toISOString(),
    };

    let resultData: ProjectionScenario | null = null;
    let resultError: { message: string } | null = null;

    if (editData) {
      const { data, error: err } = await supabase
        .from("projection_scenarios")
        .update(payload)
        .eq("id", editData.id)
        .select()
        .single();
      resultData = data;
      resultError = err;
    } else {
      const { data, error: err } = await supabase
        .from("projection_scenarios")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();
      resultData = data;
      resultError = err;
    }

    setSaving(false);
    if (resultError) return setError(resultError.message);
    if (resultData) onSave(resultData);
  }

  if (!open) return null;

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
          maxWidth: 500,
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.45)",
          border: "1px solid var(--separator)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
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
            {editData ? "Edit Scenario" : "New Scenario"}
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

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Scenario Name">
            <input
              ref={firstRef}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Base Plan, House Plan, Aggressive"
              style={INPUT}
            />
          </Field>

          <Field label="Current Net Worth (₹)">
            <input
              type="number"
              value={form.current_net_worth}
              onChange={(e) => set("current_net_worth", e.target.value)}
              placeholder="e.g. 2000000"
              style={INPUT}
            />
          </Field>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Monthly Income (₹)">
              <input
                type="number"
                value={form.monthly_income}
                onChange={(e) => set("monthly_income", e.target.value)}
                placeholder="e.g. 150000"
                style={INPUT}
              />
            </Field>
            <Field label="Monthly Investment (₹)">
              <input
                type="number"
                value={form.monthly_investment}
                onChange={(e) => set("monthly_investment", e.target.value)}
                placeholder="e.g. 50000"
                style={INPUT}
              />
            </Field>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Field label="Annual Return (%)">
              <input
                type="number"
                value={form.annual_return_pct}
                onChange={(e) => set("annual_return_pct", e.target.value)}
                placeholder="e.g. 12"
                min={0}
                max={100}
                style={INPUT}
              />
            </Field>
            <Field label="Start Month">
              <input
                type="month"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                style={INPUT}
              />
            </Field>
          </div>

          {/* Time horizon presets */}
          <Field label="Time Horizon">
            <div style={{ display: "flex", gap: 8, marginBottom: customHorizon ? 10 : 0 }}>
              {PRESETS.map((p) => {
                const active =
                  !customHorizon && form.months === String(p.months);
                return (
                  <button
                    key={p.months}
                    onClick={() => {
                      set("months", String(p.months));
                      setCustomHorizon(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "9px 4px",
                      borderRadius: 12,
                      border: "1px solid",
                      borderColor: active ? "#007aff" : "var(--separator)",
                      background: active
                        ? "rgba(0,122,255,0.12)"
                        : "var(--surface-secondary)",
                      color: active ? "#007aff" : "var(--text-primary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      transition: "all 120ms ease",
                      fontFamily: "inherit",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                onClick={() => setCustomHorizon(true)}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: customHorizon ? "#007aff" : "var(--separator)",
                  background: customHorizon
                    ? "rgba(0,122,255,0.12)"
                    : "var(--surface-secondary)",
                  color: customHorizon ? "#007aff" : "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 120ms ease",
                  fontFamily: "inherit",
                }}
              >
                Custom
              </button>
            </div>
            {customHorizon && (
              <input
                type="number"
                value={form.months}
                onChange={(e) => set("months", e.target.value)}
                placeholder="Months (e.g. 84 for 7 years)"
                min={1}
                autoFocus
                style={INPUT}
              />
            )}
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
              background: "#007aff",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 15,
              opacity: saving ? 0.7 : 1,
              fontFamily: "inherit",
              boxShadow: saving ? "none" : "0 4px 16px rgba(0,122,255,0.30)",
            }}
          >
            {saving
              ? "Saving…"
              : editData
              ? "Update Scenario"
              : "Create Scenario"}
          </button>
        </div>
      </div>
    </div>
  );
}
