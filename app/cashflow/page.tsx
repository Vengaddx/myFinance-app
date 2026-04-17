"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import AddIncomeModal, { type IncomeRecord } from "@/app/components/AddIncomeModal";

interface MonthData {
  month_key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
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

function CashFlowTooltip({ active, payload }: { active?: boolean; payload?: { dataKey: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
  const expenses = payload.find((p) => p.dataKey === "expenses")?.value ?? 0;
  const savings = income - expenses;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--separator)", borderRadius: 14, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.24)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#34c759" }}>Income {fmtINR(income)}</p>
        <p style={{ margin: 0, fontSize: 13, color: "#ff3b30" }}>Expenses {fmtINR(expenses)}</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: savings >= 0 ? "#34c759" : "#ff3b30" }}>
          Saved {fmtINR(savings)}
          {income > 0 && ` (${((savings / income) * 100).toFixed(0)}%)`}
        </p>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  const router = useRouter();
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
      supabase
        .from("income_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("month_key", months[0])
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("amount, month_key, notes")
        .eq("user_id", user.id)
        .gte("month_key", months[0]),
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
      const income = incomeRecords.filter((r) => r.month_key === mk).reduce((s, r) => s + r.amount, 0);
      const expenses = expensesByMonth[mk] ?? 0;
      const savings = income - expenses;
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

  const avgSavingsRate = useMemo(() => {
    const withIncome = monthData.filter((m) => m.income > 0);
    return withIncome.length > 0
      ? withIncome.reduce((s, m) => s + m.savingsRate, 0) / withIncome.length
      : 0;
  }, [monthData]);

  const currentIncome = useMemo(
    () => incomeRecords.filter((r) => r.month_key === selectedMonth),
    [incomeRecords, selectedMonth]
  );

  async function deleteIncome(id: string) {
    await supabase.from("income_records").delete().eq("id", id);
    fetchData();
  }

  if (authLoading || !session) return <div className="min-h-screen" />;

  const rateColor = current.savingsRate >= 30 ? "#34c759" : current.savingsRate >= 15 ? "#ff9500" : current.income > 0 ? "#ff3b30" : "var(--text-tertiary)";

  const card: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 20,
    border: "1px solid var(--separator)",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)",
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
      <Navbar />
      <main
        className="max-w-[640px] mx-auto px-4 sm:px-5 py-5 flex flex-col gap-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Cash Flow</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Income · Expenses · Savings Rate</p>
          </div>
          <button
            onClick={() => { setEditIncome(null); setShowAddIncome(true); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 16px", borderRadius: 12, background: "#34c759", border: "none", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
          >
            + Income
          </button>
        </div>

        {/* This month summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Income", value: fmtINR(current.income), color: "#34c759" },
            { label: "Expenses", value: fmtINR(current.expenses), color: "#ff3b30" },
            { label: "Saved", value: fmtINR(current.savings), color: current.savings >= 0 ? rateColor : "#ff3b30" },
          ].map((m) => (
            <div key={m.label} style={{ ...card, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>{m.label}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: m.color, letterSpacing: "-0.02em" }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Savings rate */}
        <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>Savings Rate</p>
            <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: rateColor, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {current.income > 0 ? `${current.savingsRate.toFixed(1)}%` : "—"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              6-mo avg: <strong style={{ color: "var(--text-primary)" }}>{avgSavingsRate.toFixed(1)}%</strong>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>Benchmark</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>30%+</p>
            {current.income > 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 600, color: current.savingsRate >= 30 ? "#34c759" : "#ff9500" }}>
                {current.savingsRate >= 30 ? "On track ✓" : "Below target"}
              </p>
            )}
          </div>
        </div>

        {/* 6-month chart */}
        <div style={card}>
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>6-Month Overview</p>
          {dataLoading ? (
            <div style={{ height: 180, background: "rgba(120,120,128,0.08)", borderRadius: 12 }} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthData} barCategoryGap="28%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(120,120,128,0.08)", radius: 4 }} />
                <Bar dataKey="income" fill="#34c759" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expenses" fill="#ff3b30" radius={[5, 5, 0, 0]} opacity={0.75} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[{ color: "#34c759", label: "Income" }, { color: "#ff3b30", label: "Expenses", opacity: 0.75 }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, opacity: l.opacity ?? 1 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income records for selected month */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Income Records</p>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit" }}
            >
              {months.map((mk) => <option key={mk} value={mk}>{monthLabel(mk)}</option>)}
            </select>
          </div>

          {currentIncome.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-tertiary)" }}>No income recorded for {monthLabel(selectedMonth)}.</p>
              <button
                onClick={() => { setEditIncome(null); setShowAddIncome(true); }}
                style={{ color: "#34c759", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
              >
                + Add income
              </button>
            </div>
          ) : (
            <div>
              {currentIncome.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < currentIncome.length - 1 ? "1px solid var(--separator)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{r.source}</p>
                    {r.notes && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{r.notes}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#34c759" }}>{fmtINR(r.amount)}</p>
                    <button
                      onClick={() => { setEditIncome(r); setShowAddIncome(true); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: 13, padding: "4px 6px", fontFamily: "inherit" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteIncome(r.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ff3b30", fontSize: 18, lineHeight: 1, padding: "4px" }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {current.income > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--separator)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#34c759" }}>{fmtINR(current.income)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Monthly breakdown table */}
        <div style={card}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Breakdown</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Month", "Income", "Expenses", "Saved", "Rate"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...monthData].reverse().map((m, i, arr) => (
                  <tr
                    key={m.month_key}
                    onClick={() => setSelectedMonth(m.month_key)}
                    style={{ cursor: "pointer", background: m.month_key === selectedMonth ? "rgba(120,120,128,0.06)" : "transparent" }}
                  >
                    {[
                      <td key="m" style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--separator)" : "none", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap", paddingRight: 16 }}>{m.label}</td>,
                      <td key="i" style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--separator)" : "none", fontSize: 13, color: m.income > 0 ? "#34c759" : "var(--text-tertiary)", fontWeight: 600, paddingRight: 16, whiteSpace: "nowrap" }}>{m.income > 0 ? fmtINR(m.income) : "—"}</td>,
                      <td key="e" style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--separator)" : "none", fontSize: 13, color: m.expenses > 0 ? "#ff3b30" : "var(--text-tertiary)", fontWeight: 600, paddingRight: 16, whiteSpace: "nowrap" }}>{m.expenses > 0 ? fmtINR(m.expenses) : "—"}</td>,
                      <td key="s" style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--separator)" : "none", fontSize: 13, color: m.income > 0 ? (m.savings >= 0 ? "var(--text-primary)" : "#ff3b30") : "var(--text-tertiary)", paddingRight: 16, whiteSpace: "nowrap" }}>{m.income > 0 ? fmtINR(m.savings) : "—"}</td>,
                      <td key="r" style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid var(--separator)" : "none", fontSize: 13, fontWeight: 700, color: m.income > 0 ? (m.savingsRate >= 30 ? "#34c759" : m.savingsRate >= 15 ? "#ff9500" : "#ff3b30") : "var(--text-tertiary)", whiteSpace: "nowrap" }}>{m.income > 0 ? `${m.savingsRate.toFixed(0)}%` : "—"}</td>,
                    ]}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

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
