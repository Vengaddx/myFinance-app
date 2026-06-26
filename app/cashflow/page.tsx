"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, Cell, XAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/app/components/Navbar";
import AddIncomeModal, { type IncomeRecord } from "@/app/components/AddIncomeModal";
import { useTheme } from "@/lib/ThemeContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000)    return `${sign}₹${(abs / 100_000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function monthLabelFull(mk: string): string {
  const [y, m] = mk.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function getLast6Months(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function rateColor(rate: number, hasIncome: boolean) {
  if (!hasIncome) return "var(--text-tertiary)";
  if (rate >= 30) return "#16A34A";
  if (rate >= 15) return "#D97706";
  return "#DC2626";
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function RateTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { savings: number; income: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const rate = payload[0]?.value ?? 0;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--separator)",
      borderRadius: 12,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      minWidth: 130,
    }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: rateColor(rate, d.income > 0) }}>
        {d.income > 0 ? `${rate.toFixed(2)}% saved` : "No data"}
      </p>
      {d.income > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          {fmtINR(d.savings)} saved
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MonthData {
  month_key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export default function CashFlowPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user, session, loading: authLoading } = useAuth();

  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expensesByMonth, setExpensesByMonth] = useState<Record<string, number>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeRecord | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const months = useMemo(() => getLast6Months(), []);

  useEffect(() => {
    if (!authLoading && !session) router.replace("/login");
  }, [authLoading, session, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from("income_records").select("*").eq("user_id", user.id).gte("month_key", months[0]).order("created_at", { ascending: false }),
      supabase.from("expenses").select("amount, month_key, notes").eq("user_id", user.id).gte("month_key", months[0]),
    ]);

    setIncomeRecords((incomeRes.data ?? []) as IncomeRecord[]);

    const expMap: Record<string, number> = {};
    for (const e of (expenseRes.data ?? []) as { amount: number; month_key: string; notes: string | null }[]) {
      let inrAmount = Number(e.amount ?? 0);
      try {
        const n = e.notes ? JSON.parse(e.notes) : {};
        if (n.sar && n.rate) inrAmount = Number(n.sar) * Number(n.rate);
      } catch { /* plain notes */ }
      expMap[e.month_key] = (expMap[e.month_key] ?? 0) + inrAmount;
    }
    setExpensesByMonth(expMap);
    setDataLoading(false);
  }, [user, months]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const monthData: MonthData[] = useMemo(() =>
    months.map((mk) => {
      const income   = incomeRecords.filter((r) => r.month_key === mk).reduce((s, r) => s + r.amount, 0);
      const expenses = expensesByMonth[mk] ?? 0;
      const savings  = income - expenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      return { month_key: mk, label: monthLabel(mk), income, expenses, savings, savingsRate };
    }), [months, incomeRecords, expensesByMonth]);

  const current = useMemo(
    () => monthData.find((m) => m.month_key === selectedMonth) ?? {
      month_key: selectedMonth, label: monthLabel(selectedMonth),
      income: 0, expenses: 0, savings: 0, savingsRate: 0,
    },
    [monthData, selectedMonth]
  );

  const currentIncome = useMemo(
    () => incomeRecords.filter((r) => r.month_key === selectedMonth),
    [incomeRecords, selectedMonth]
  );

  const avgSavingsRate = useMemo(() => {
    const withIncome = monthData.filter((m) => m.income > 0);
    return withIncome.length > 0
      ? withIncome.reduce((s, m) => s + m.savingsRate, 0) / withIncome.length
      : 0;
  }, [monthData]);

  // Smart insights
  const insights = useMemo(() => {
    const out: { text: string; type: "positive" | "negative" | "neutral" }[] = [];

    // Streak of months ≥30%
    let streak = 0;
    for (const m of [...monthData].reverse()) {
      if (m.income > 0 && m.savingsRate >= 30) streak++;
      else break;
    }
    if (streak >= 2) {
      out.push({ text: `${streak} months in a row above the 30% savings target`, type: "positive" });
    }

    // Month-over-month expense change (for months that have income data)
    const withIncome = monthData.filter((m) => m.income > 0);
    const prevM = withIncome[withIncome.length - 2];
    const thisM = withIncome[withIncome.length - 1];
    if (prevM && thisM && thisM.month_key === selectedMonth && thisM.expenses > 0 && prevM.expenses > 0) {
      const pct = ((thisM.expenses - prevM.expenses) / prevM.expenses) * 100;
      if (Math.abs(pct) >= 8) {
        out.push({
          text: `Expenses ${pct > 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}% vs ${prevM.label}`,
          type: pct > 0 ? "negative" : "positive",
        });
      }
    }

    // Annualised savings projection
    if (current.income > 0 && current.savings > 0) {
      out.push({ text: `On track to save ${fmtINR(current.savings * 12)} this year`, type: "neutral" });
    }

    // 6-month average
    if (avgSavingsRate > 0 && out.length < 3) {
      out.push({
        text: `6-month avg savings rate: ${avgSavingsRate.toFixed(2)}%`,
        type: avgSavingsRate >= 30 ? "positive" : avgSavingsRate >= 15 ? "neutral" : "negative",
      });
    }

    return out.slice(0, 3);
  }, [monthData, current, avgSavingsRate, selectedMonth]);

  async function deleteIncome(id: string) {
    await supabase.from("income_records").delete().eq("id", id);
    fetchData();
  }

  if (authLoading || !session) return <div className="min-h-screen" />;

  const hasIncome = current.income > 0;
  const rc = rateColor(current.savingsRate, hasIncome);
  const saved = current.savings;

  const card: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 20,
    border: "1px solid var(--separator)",
    padding: "20px",
    boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.04)" : "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)",
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
      <Navbar />
      <main
        className="max-w-[1100px] mx-auto px-4 sm:px-5 lg:px-6 py-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}
      >
        {/* ── Top bar: title + month pills ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", flexShrink: 0 }}>
            Cash Flow
          </h1>

          {/* Month pills — scrollable */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1" style={{ paddingBottom: 2 }}>
            {months.map((mk) => {
              const isSelected = mk === selectedMonth;
              return (
                <button
                  key={mk}
                  onClick={() => setSelectedMonth(mk)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 13px",
                    borderRadius: 20,
                    border: `1px solid ${isSelected ? "#2563EB" : "var(--separator)"}`,
                    background: isSelected ? "#2563EB" : "transparent",
                    color: isSelected ? "#fff" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: isSelected ? 600 : 500,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 150ms ease",
                  }}
                >
                  {monthLabel(mk)}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setEditIncome(null); setShowAddIncome(true); }}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 10,
              background: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
              border: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`,
              color: "var(--text-primary)", fontWeight: 600, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16M4 12h16" /></svg>
            Add Income
          </button>
        </div>

        {/* ── Overall summary strip ─────────────────────────────── */}
        {!dataLoading && (() => {
          const withData = monthData.filter((m) => m.income > 0);
          const totalIncome   = withData.reduce((s, m) => s + m.income, 0);
          const totalExpenses = withData.reduce((s, m) => s + m.expenses, 0);
          const totalSavings  = totalIncome - totalExpenses;
          const overallRate   = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
          if (withData.length === 0) return null;
          const rc2 = rateColor(overallRate, true);
          return (
            <div style={{ ...card, padding: "14px 20px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: "12px 32px", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px", flexShrink: 0 }}>
                {withData.length}-Month Overall
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px", flex: 1 }}>
                {[
                  { label: "Total Income",   value: fmtINR(totalIncome),   color: "#16A34A" },
                  { label: "Total Expenses", value: fmtINR(totalExpenses), color: "#DC2626" },
                  { label: "Total Savings",  value: fmtINR(totalSavings),  color: totalSavings >= 0 ? "var(--text-primary)" : "#DC2626" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p style={{ margin: "0 0 1px", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color, letterSpacing: "-0.01em" }}>{value}</p>
                  </div>
                ))}
                <div>
                  <p style={{ margin: "0 0 1px", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Savings Rate</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: rc2, letterSpacing: "-0.01em" }}>{overallRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 2-column grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

          {/* ── LEFT: Hero + Insights ────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Hero card */}
            <div style={card}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                {monthLabelFull(selectedMonth)}
              </p>

              {dataLoading ? (
                <div style={{ height: 96, background: "var(--surface-secondary)", borderRadius: 12 }} />
              ) : !hasIncome ? (
                <div style={{ padding: "8px 0 4px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)" }}>No income recorded yet.</p>
                  <button
                    onClick={() => { setEditIncome(null); setShowAddIncome(true); }}
                    style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
                  >
                    + Add income to get started
                  </button>
                </div>
              ) : (
                <>
                  {/* Big savings number */}
                  <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {saved >= 0 ? "You saved" : "You overspent by"}
                  </p>
                  <p style={{ margin: 0, fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", color: saved >= 0 ? "var(--text-primary)" : "#DC2626", lineHeight: 1.1 }}>
                    {fmtINR(Math.abs(saved))}
                  </p>

                  {/* Rate badge */}
                  <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: isDark ? "rgba(255,255,255,0.06)" : "var(--surface-secondary)", border: "1px solid var(--separator)" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: rc, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: rc }}>{current.savingsRate.toFixed(2)}% savings rate</span>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>· target 30%</span>
                  </div>

                  {/* Income / Expenses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 0, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--separator)" }}>
                    <div style={{ paddingRight: 16 }}>
                      <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>Income</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#16A34A", letterSpacing: "-0.02em" }}>{fmtINR(current.income)}</p>
                    </div>
                    <div style={{ background: "var(--separator)" }} />
                    <div style={{ paddingLeft: 16 }}>
                      <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>Expenses</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#DC2626", letterSpacing: "-0.02em" }}>{fmtINR(current.expenses)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Insights */}
            {!dataLoading && insights.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insights.map((ins, i) => {
                  const dotColor = ins.type === "positive" ? "#16A34A" : ins.type === "negative" ? "#DC2626" : "#2563EB";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "11px 16px", borderRadius: 14,
                        background: "var(--surface)",
                        border: "1px solid var(--separator)",
                        boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Chart + Income sources ───────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Chart card */}
            <div style={card}>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Savings Rate</p>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-tertiary)" }}>6 months · click bar to select · dashed = 30% target</p>

              {dataLoading ? (
                <div style={{ height: 160, background: "var(--surface-secondary)", borderRadius: 12 }} />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={monthData}
                    barCategoryGap="30%"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(d: any) => {
                      const mk = d?.activePayload?.[0]?.payload?.month_key;
                      if (mk) setSelectedMonth(mk);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<RateTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", radius: 6 }} />
                    <ReferenceLine y={30} stroke={isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.18)"} strokeDasharray="4 3" strokeWidth={1.5} />
                    <Bar dataKey="savingsRate" radius={[5, 5, 0, 0]}>
                      {monthData.map((m) => (
                        <Cell
                          key={m.month_key}
                          fill={
                            m.month_key === selectedMonth
                              ? rateColor(m.savingsRate, m.income > 0)
                              : m.income > 0
                                ? rateColor(m.savingsRate, true) + "55"
                                : (isDark ? "#27272A" : "#E2E8F0")
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Income sources card */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <p style={{ margin: "0 0 1px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Income Sources</p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{monthLabelFull(selectedMonth)}</p>
                </div>
                <button
                  onClick={() => { setEditIncome(null); setShowAddIncome(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 8, background: "transparent", border: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`, color: "#2563EB", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16M4 12h16" /></svg>
                  Add
                </button>
              </div>

              {dataLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2].map((i) => <div key={i} style={{ height: 18, borderRadius: 8, background: "var(--surface-secondary)" }} />)}
                </div>
              ) : currentIncome.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)", padding: "10px 0" }}>No income recorded yet.</p>
              ) : (
                <div>
                  {currentIncome.map((r, i) => (
                    <div
                      key={r.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < currentIncome.length - 1 ? "1px solid var(--separator)" : "none" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{r.source}</p>
                        {r.notes && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 10 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#16A34A", letterSpacing: "-0.01em" }}>{fmtINR(r.amount)}</p>
                        <button onClick={() => { setEditIncome(r); setShowAddIncome(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 12, fontWeight: 500, padding: "2px 5px", fontFamily: "inherit", borderRadius: 5 }}>Edit</button>
                        <button onClick={() => deleteIncome(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", padding: "2px 3px" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentIncome.length > 1 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--separator)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>{fmtINR(current.income)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Monthly breakdown table ───────────────────────────── */}
        <div style={{ ...card, marginTop: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--separator)" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Monthly Breakdown</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                  {["Month", "Income", "Expenses", "Savings", "Savings Rate"].map((h) => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: h === "Month" ? "left" : "right", fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataLoading
                  ? [1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} style={{ padding: "12px 20px" }}>
                          <div style={{ height: 14, borderRadius: 6, background: "var(--surface-secondary)", width: j === 1 ? 60 : 80 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : monthData.map((m, i) => {
                    const isSelected = m.month_key === selectedMonth;
                    const rc3 = rateColor(m.savingsRate, m.income > 0);
                    return (
                      <tr
                        key={m.month_key}
                        onClick={() => setSelectedMonth(m.month_key)}
                        style={{
                          borderBottom: i < monthData.length - 1 ? "1px solid var(--separator)" : "none",
                          background: isSelected ? (isDark ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.04)") : "transparent",
                          cursor: "pointer",
                          transition: "background 120ms",
                        }}
                      >
                        <td style={{ padding: "12px 20px", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#2563EB" : "var(--text-primary)", whiteSpace: "nowrap" }}>
                          {monthLabelFull(m.month_key)}
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: m.income > 0 ? "#16A34A" : "var(--text-tertiary)" }}>
                          {m.income > 0 ? fmtINR(m.income) : "—"}
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: m.expenses > 0 ? "#DC2626" : "var(--text-tertiary)" }}>
                          {m.expenses > 0 ? fmtINR(m.expenses) : "—"}
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: m.income > 0 ? (m.savings >= 0 ? "var(--text-primary)" : "#DC2626") : "var(--text-tertiary)" }}>
                          {m.income > 0 ? fmtINR(m.savings) : "—"}
                        </td>
                        <td style={{ padding: "12px 20px", textAlign: "right" }}>
                          {m.income > 0 ? (
                            <span style={{ fontWeight: 700, color: rc3 }}>{m.savingsRate.toFixed(2)}%</span>
                          ) : (
                            <span style={{ color: "var(--text-tertiary)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
              {/* Overall totals row */}
              {!dataLoading && (() => {
                const withData = monthData.filter((m) => m.income > 0);
                if (withData.length === 0) return null;
                const totalIncome   = withData.reduce((s, m) => s + m.income, 0);
                const totalExpenses = withData.reduce((s, m) => s + m.expenses, 0);
                const totalSavings  = totalIncome - totalExpenses;
                const overallRate   = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
                const rc4 = rateColor(overallRate, true);
                return (
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                      <td style={{ padding: "12px 20px", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {withData.length}-Month Total
                      </td>
                      <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, color: "#16A34A" }}>{fmtINR(totalIncome)}</td>
                      <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, color: "#DC2626" }}>{fmtINR(totalExpenses)}</td>
                      <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, color: totalSavings >= 0 ? "var(--text-primary)" : "#DC2626" }}>{fmtINR(totalSavings)}</td>
                      <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 700, color: rc4 }}>{overallRate.toFixed(2)}%</td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      </main>

      <AddIncomeModal
        open={showAddIncome}
        monthKey={selectedMonth}
        editData={editIncome}
        onClose={() => { setShowAddIncome(false); setEditIncome(null); }}
        onSaved={fetchData}
      />
    </div>
  );
}
