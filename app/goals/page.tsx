"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import ScenarioModal from "@/app/components/ScenarioModal";
import ProjectionEventModal from "@/app/components/ProjectionEventModal";

// ─────────────────────────────────────────────────────────────────────────────
// Icons (Apple SF Symbol style — stroke, no fill)
// ─────────────────────────────────────────────────────────────────────────────

function IconTrendingUp({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconArrowUpRight({ size = 16, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function IconPlusCircle({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function IconStar({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconTag({ size = 20, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconArrowDown({ size = 18, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IconArrowUp({ size = 18, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectionScenario {
  id: string;
  user_id: string;
  name: string;
  current_net_worth: number;
  monthly_income: number;
  monthly_investment: number;
  annual_return_pct: number;
  start_date: string;
  months: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectionEvent {
  id: string;
  user_id: string;
  scenario_id: string;
  event_name: string;
  amount: number;
  event_type: "expense" | "income";
  event_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChartPoint {
  monthIndex: number;
  label: string;
  netWorth: number;
  events: ProjectionEvent[];
  hasExpense: boolean;
  hasIncome: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}${(abs / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `${sign}${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toLocaleString("en-IN")}`;
}

function horizonLabel(months: number): string {
  const years = months / 12;
  if (Number.isInteger(years)) return `${years}Y`;
  return `${months}mo`;
}

function calculateProjection(
  scenario: ProjectionScenario,
  events: ProjectionEvent[]
): ChartPoint[] {
  const monthlyRate =
    Math.pow(1 + scenario.annual_return_pct / 100, 1 / 12) - 1;
  const start = new Date(scenario.start_date);

  let netWorth = scenario.current_net_worth;
  const points: ChartPoint[] = [];

  for (let i = 0; i <= scenario.months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);

    const monthEvents = events.filter((ev) => {
      const ed = new Date(ev.event_date);
      return (
        ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth()
      );
    });

    if (i > 0) {
      netWorth += scenario.monthly_investment;
      netWorth *= 1 + monthlyRate;
      monthEvents.forEach((ev) => {
        netWorth += ev.event_type === "expense" ? -ev.amount : ev.amount;
      });
    }

    points.push({
      monthIndex: i,
      label: d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      netWorth: Math.max(0, netWorth),
      events: monthEvents,
      hasExpense: monthEvents.some((e) => e.event_type === "expense"),
      hasIncome: monthEvents.some((e) => e.event_type === "income"),
    });
  }

  return points;
}

const MILESTONES = [
  500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000,
  50_000_000, 100_000_000,
];

// ─────────────────────────────────────────────────────────────────────────────
// Chart sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.[0]) return null;
  const point: ChartPoint = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--separator)",
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
        minWidth: 160,
      }}
    >
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 12,
          marginBottom: 2,
        }}
      >
        {point.label}
      </div>
      <div
        style={{
          color: "var(--text-primary)",
          fontWeight: 700,
          fontSize: 20,
          marginBottom: point.events.length ? 8 : 0,
        }}
      >
        {fmtINR(point.netWorth)}
      </div>
      {point.events.map((ev) => (
        <div
          key={ev.id}
          style={{
            fontSize: 12,
            color: ev.event_type === "expense" ? "#ff3b30" : "#34c759",
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <span>{ev.event_type === "expense" ? "↓" : "↑"}</span>
          <span style={{ flex: 1 }}>{ev.event_name}</span>
          <span style={{ fontWeight: 600 }}>{fmtINR(ev.amount)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [scenarios, setScenarios] = useState<ProjectionScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProjectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [scenarioModal, setScenarioModal] = useState<{
    open: boolean;
    editData?: ProjectionScenario;
  }>({ open: false });
  const [eventModal, setEventModal] = useState<{
    open: boolean;
    editData?: ProjectionEvent;
  }>({ open: false });

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // ── Fetch scenarios ─────────────────────────────────────────────────────────
  const fetchScenarios = useCallback(
    async (autoSelect = false) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("projection_scenarios")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setScenarios(data as ProjectionScenario[]);
        if (autoSelect && data.length > 0) setSelectedId(data[0].id);
      }
      setLoading(false);
    },
    [user]
  );

  // ── Fetch events ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!user || !selectedId) return;
    const { data, error } = await supabase
      .from("projection_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("scenario_id", selectedId)
      .order("event_date", { ascending: true });
    if (!error && data) setEvents(data as ProjectionEvent[]);
  }, [user, selectedId]);

  useEffect(() => {
    if (user) fetchScenarios(true);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEvents([]);
    if (selectedId) fetchEvents();
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ────────────────────────────────────────────────────────────
  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? null,
    [scenarios, selectedId]
  );

  const chartData = useMemo(() => {
    if (!selectedScenario) return [];
    return calculateProjection(selectedScenario, events);
  }, [selectedScenario, events]);

  const metrics = useMemo(() => {
    if (!selectedScenario || !chartData.length) return null;
    const final = chartData[chartData.length - 1].netWorth;
    const totalContributions =
      selectedScenario.monthly_investment * selectedScenario.months;
    const totalExpenses = events
      .filter((e) => e.event_type === "expense")
      .reduce((s, e) => s + e.amount, 0);
    const totalIncome = events
      .filter((e) => e.event_type === "income")
      .reduce((s, e) => s + e.amount, 0);
    const netEventImpact = totalIncome - totalExpenses;
    const growthFromReturns =
      final -
      selectedScenario.current_net_worth -
      totalContributions -
      netEventImpact;
    return {
      final,
      totalContributions,
      totalExpenses,
      totalIncome,
      growthFromReturns,
    };
  }, [selectedScenario, events, chartData]);

  const nextMilestone = useMemo(() => {
    if (!selectedScenario || !chartData.length) return null;
    const milestone = MILESTONES.find(
      (m) => m > selectedScenario.current_net_worth
    );
    if (!milestone) return null;
    const point = chartData.find((p) => p.netWorth >= milestone);
    if (!point) return null;
    return { amount: milestone, point };
  }, [selectedScenario, chartData]);

  const xTicks = useMemo(() => {
    if (!selectedScenario) return [];
    const ticks: number[] = [0];
    for (let i = 12; i <= selectedScenario.months; i += 12) ticks.push(i);
    return ticks;
  }, [selectedScenario]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  async function deleteScenario(id: string) {
    if (
      !confirm(
        "Delete this scenario and all its planned events? This cannot be undone."
      )
    )
      return;
    await supabase.from("projection_events").delete().eq("scenario_id", id);
    await supabase.from("projection_scenarios").delete().eq("id", id);
    const remaining = scenarios.filter((s) => s.id !== id);
    setScenarios(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    showToast("Scenario deleted", "success");
  }

  async function deleteEvent(id: string) {
    if (!confirm("Remove this planned event?")) return;
    await supabase.from("projection_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast("Event removed", "success");
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div
        style={{
          background: "var(--bg)",
          minHeight: "100vh",
          paddingTop: "calc(50px + env(safe-area-inset-top))",
        }}
      >
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            color: "var(--text-secondary)",
            fontSize: 15,
          }}
        >
          Loading…
        </div>
        <Footer />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        paddingTop: "calc(50px + env(safe-area-inset-top))",
        paddingBottom: 88,
      }}
    >
      <Navbar />

      <main
        style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 0" }}
      >
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Wealth Projection
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              marginTop: 4,
              margin: "4px 0 0",
            }}
          >
            See where you could be in 3, 5, or 10 years.
          </p>
        </div>

        {/* ── Scenario tabs ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            overflowX: "auto",
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          {scenarios.map((s) => {
            const active = s.id === selectedId;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 20,
                  background: active
                    ? "#007aff"
                    : "var(--surface)",
                  color: active ? "#fff" : "var(--text-primary)",
                  border: `1px solid ${active ? "#007aff" : "var(--separator)"}`,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  transition: "all 160ms ease",
                  userSelect: "none",
                }}
              >
                <span>{s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScenarioModal({ open: true, editData: s });
                  }}
                  title="Edit"
                  style={{
                    background: "none",
                    border: "none",
                    color: active ? "rgba(255,255,255,0.7)" : "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScenario(s.id);
                  }}
                  title="Delete"
                  style={{
                    background: "none",
                    border: "none",
                    color: active ? "rgba(255,255,255,0.6)" : "#ff3b30",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setScenarioModal({ open: true })}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              background: "transparent",
              border: "1.5px dashed var(--separator)",
              color: "#007aff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap",
              transition: "opacity 160ms ease",
            }}
          >
            + New Scenario
          </button>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {scenarios.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 420,
              gap: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background:
                  "linear-gradient(135deg, rgba(0,122,255,0.15), rgba(174,221,0,0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconTrendingUp size={38} stroke="#007aff" />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                Plan your financial future
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 15,
                  maxWidth: 320,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Create a scenario to project where your net worth could be in
                3, 5, or 10 years — with planned expenses, savings, and returns.
              </p>
            </div>
            <button
              onClick={() => setScenarioModal({ open: true })}
              style={{
                padding: "13px 32px",
                borderRadius: 24,
                background: "#007aff",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,122,255,0.35)",
              }}
            >
              Create First Scenario
            </button>
          </div>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {selectedScenario && metrics && (
          <>
            {/* Milestone insight banner */}
            {nextMilestone && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,122,255,0.10), rgba(52,199,89,0.07))",
                  border: "1px solid rgba(0,122,255,0.18)",
                  borderRadius: 16,
                  padding: "13px 18px",
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(52,199,89,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconArrowUpRight size={16} stroke="#34c759" />
                </div>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: 1.4,
                  }}
                >
                  At this pace, you could reach{" "}
                  <span style={{ color: "#007aff" }}>
                    {fmtINR(nextMilestone.amount)}
                  </span>{" "}
                  by{" "}
                  <span style={{ color: "#34c759", fontWeight: 700 }}>
                    {nextMilestone.point.label}
                  </span>
                </span>
              </div>
            )}

            {/* Summary metric cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
                marginBottom: 18,
              }}
            >
              {(
                [
                  {
                    icon: <IconTrendingUp size={18} stroke="#007aff" />,
                    iconBg: "rgba(0,122,255,0.10)",
                    label: "Projected Net Worth",
                    value: fmtINR(metrics.final),
                    sub: `in ${horizonLabel(selectedScenario.months)}`,
                    color: "#007aff",
                  },
                  {
                    icon: <IconPlusCircle size={18} stroke="#34c759" />,
                    iconBg: "rgba(52,199,89,0.10)",
                    label: "Total Contributions",
                    value: fmtINR(metrics.totalContributions),
                    sub: `₹${fmtShort(selectedScenario.monthly_investment)}/mo`,
                    color: "#34c759",
                  },
                  {
                    icon: <IconStar size={18} stroke="#AEDD00" />,
                    iconBg: "rgba(174,221,0,0.10)",
                    label: "Growth from Returns",
                    value: fmtINR(Math.max(0, metrics.growthFromReturns)),
                    sub: `${selectedScenario.annual_return_pct}% p.a.`,
                    color: "#AEDD00",
                  },
                  {
                    icon: <IconTag size={18} stroke={metrics.totalExpenses > 0 ? "#ff3b30" : "var(--text-tertiary)"} />,
                    iconBg: metrics.totalExpenses > 0 ? "rgba(255,59,48,0.08)" : "var(--surface-secondary)",
                    label: "Planned Expenses",
                    value: fmtINR(metrics.totalExpenses),
                    sub:
                      metrics.totalIncome > 0
                        ? `+${fmtINR(metrics.totalIncome)} inflows`
                        : "one-time events",
                    color: metrics.totalExpenses > 0 ? "#ff3b30" : "var(--text-tertiary)",
                  },
                ] as { icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string; color: string }[]
              ).map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "var(--surface)",
                    borderRadius: 20,
                    padding: "18px 18px 16px",
                    border: "1px solid var(--separator)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: card.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      color: card.color,
                      fontSize: 22,
                      fontWeight: 700,
                      margin: "5px 0 3px",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    style={{ color: "var(--text-tertiary)", fontSize: 12 }}
                  >
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart card */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 24,
                padding: "22px 20px 16px",
                border: "1px solid var(--separator)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Net Worth Projection
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {selectedScenario.name} ·{" "}
                    {horizonLabel(selectedScenario.months)} horizon
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#ff3b30",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    Expense
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#34c759",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    Income
                  </span>
                </div>
              </div>

              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="projGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#007aff"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor="#007aff"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--separator)"
                      vertical={false}
                      strokeDasharray="0"
                    />
                    <XAxis
                      dataKey="monthIndex"
                      type="number"
                      domain={[0, selectedScenario.months]}
                      ticks={xTicks}
                      tickFormatter={(v) => chartData[v]?.label ?? ""}
                      tick={{
                        fill: "var(--text-tertiary)",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      padding={{ left: 0, right: 0 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${fmtShort(v)}`}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={68}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{
                        stroke: "var(--separator)",
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#007aff"
                      strokeWidth={2.5}
                      fill="url(#projGradient)"
                      dot={(props: any) => {
                        const { cx, cy, key, payload } = props;
                        if (!payload?.hasExpense && !payload?.hasIncome) {
                          return (
                            <circle
                              key={key}
                              cx={cx}
                              cy={cy}
                              r={0}
                              fill="none"
                            />
                          );
                        }
                        const color = payload.hasExpense
                          ? "#ff3b30"
                          : "#34c759";
                        return (
                          <circle
                            key={key}
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={color}
                            stroke="var(--surface)"
                            strokeWidth={2.5}
                          />
                        );
                      }}
                      activeDot={{
                        r: 5,
                        fill: "#007aff",
                        stroke: "var(--surface)",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom two-column section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {/* Planned events */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: 20,
                  padding: "20px",
                  border: "1px solid var(--separator)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      color: "var(--text-primary)",
                    }}
                  >
                    Planned Events
                  </div>
                  <button
                    onClick={() => setEventModal({ open: true })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 16,
                      background: "#007aff",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + Add
                  </button>
                </div>

                {events.length === 0 ? (
                  <div
                    style={{
                      color: "var(--text-tertiary)",
                      fontSize: 14,
                      textAlign: "center",
                      padding: "28px 16px",
                      lineHeight: 1.6,
                    }}
                  >
                    No events yet.
                    <br />
                    Add a wedding, house down payment, travel…
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "11px 13px",
                          borderRadius: 14,
                          background: "var(--surface-secondary)",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background:
                              ev.event_type === "expense"
                                ? "rgba(255,59,48,0.10)"
                                : "rgba(52,199,89,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {ev.event_type === "expense" ? (
                            <IconArrowDown size={17} stroke="#ff3b30" />
                          ) : (
                            <IconArrowUp size={17} stroke="#34c759" />
                          )}
                        </div>
                        <div
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              fontSize: 14,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ev.event_name}
                          </div>
                          <div
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: 12,
                              marginTop: 1,
                            }}
                          >
                            {new Date(ev.event_date).toLocaleDateString(
                              "en-IN",
                              { month: "short", year: "numeric" }
                            )}
                            {ev.notes ? ` · ${ev.notes}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color:
                              ev.event_type === "expense"
                                ? "#ff3b30"
                                : "#34c759",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ev.event_type === "expense" ? "−" : "+"}
                          {fmtINR(ev.amount)}
                        </div>
                        <div
                          style={{ display: "flex", gap: 2, flexShrink: 0 }}
                        >
                          <button
                            onClick={() =>
                              setEventModal({ open: true, editData: ev })
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-secondary)",
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: 8,
                              fontSize: 13,
                            }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ff3b30",
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: 8,
                              fontSize: 16,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scenario parameters */}
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: 20,
                  padding: "20px",
                  border: "1px solid var(--separator)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      color: "var(--text-primary)",
                    }}
                  >
                    Scenario Parameters
                  </div>
                  <button
                    onClick={() =>
                      setScenarioModal({
                        open: true,
                        editData: selectedScenario,
                      })
                    }
                    style={{
                      padding: "6px 14px",
                      borderRadius: 16,
                      background: "var(--surface-secondary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--separator)",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 13,
                  }}
                >
                  {[
                    {
                      label: "Current Net Worth",
                      value: fmtINR(selectedScenario.current_net_worth),
                    },
                    {
                      label: "Monthly Income",
                      value: fmtINR(selectedScenario.monthly_income),
                    },
                    {
                      label: "Monthly Investment",
                      value: fmtINR(selectedScenario.monthly_investment),
                    },
                    {
                      label: "Annual Return",
                      value: `${selectedScenario.annual_return_pct}%`,
                    },
                    {
                      label: "Time Horizon",
                      value: `${selectedScenario.months} months (${horizonLabel(selectedScenario.months)})`,
                    },
                    {
                      label: "Start Date",
                      value: new Date(
                        selectedScenario.start_date
                      ).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      }),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 13,
                        borderBottom: "1px solid var(--separator)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: 14,
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {scenarioModal.open && (
        <ScenarioModal
          open={scenarioModal.open}
          editData={scenarioModal.editData}
          userId={user!.id}
          onClose={() => setScenarioModal({ open: false })}
          onSave={async (scenario) => {
            await fetchScenarios();
            setSelectedId(scenario.id);
            setScenarioModal({ open: false });
            showToast(
              scenarioModal.editData
                ? "Scenario updated"
                : "Scenario created",
              "success"
            );
          }}
        />
      )}

      {eventModal.open && selectedScenario && (
        <ProjectionEventModal
          open={eventModal.open}
          editData={eventModal.editData}
          userId={user!.id}
          scenarioId={selectedScenario.id}
          onClose={() => setEventModal({ open: false })}
          onSave={async () => {
            await fetchEvents();
            setEventModal({ open: false });
            showToast(
              eventModal.editData ? "Event updated" : "Event added",
              "success"
            );
          }}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 88,
            right: 20,
            padding: "11px 20px",
            borderRadius: 14,
            background: toast.type === "success" ? "#34c759" : "#ff3b30",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            zIndex: 9999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
            animation: "fadeIn 200ms ease",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
