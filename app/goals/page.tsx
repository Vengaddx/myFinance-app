"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
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
import PremiumUpgradeModal from "@/app/components/PremiumUpgradeModal";
import { getLimits, isPremium } from "@/lib/planLimits";

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
  is_auto_net_worth?: boolean;
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

const COMPARE_COLORS = ["#007aff", "#AEDD00", "#ff9f0a", "#bf5af2", "#ff6b6b"];
const MAX_COMPARE = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Chart sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload as ChartPoint & { actualNetWorth?: number };
  const hasActual = point.actualNetWorth !== undefined && point.actualNetWorth !== null;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--separator)",
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
        minWidth: 170,
      }}
    >
      <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 8 }}>
        {point.label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: point.events.length ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ width: 10, height: 3, borderRadius: 2, background: "#007aff", display: "inline-block", flexShrink: 0 }} />
            Planned
          </span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{fmtINR(point.netWorth)}</span>
        </div>
        {hasActual && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: "#34c759", display: "inline-block", flexShrink: 0 }} />
              Actual
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#34c759" }}>{fmtINR(point.actualNetWorth!)}</span>
          </div>
        )}
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

function CompareTooltip({
  active,
  payload,
  compareScenarios,
  colorMap,
}: {
  active?: boolean;
  payload?: { payload: Record<string, number | string> }[];
  compareScenarios: ProjectionScenario[];
  colorMap: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--separator)",
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        minWidth: 200,
      }}
    >
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.4px",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {String(point.label ?? `Month ${point.monthIndex}`)}
      </div>
      {compareScenarios.map((s) => {
        const val = typeof point[s.id] === "number" ? (point[s.id] as number) : null;
        const color = colorMap[s.id] ?? "#007aff";
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              marginBottom: 6,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                {s.name}
              </span>
            </span>
            <span style={{ color, fontWeight: 700, fontSize: 14 }}>
              {val !== null ? fmtINR(val) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRE Calculator view
// ─────────────────────────────────────────────────────────────────────────────

function calcMonthsToFIRE(nw: number, pmt: number, annualRatePct: number, target: number): number | null {
  if (target <= 0) return null;
  if (nw >= target) return 0;
  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (r <= 0 && pmt <= 0) return null;
  let n = nw;
  for (let months = 1; months <= 720; months++) {
    n = (n + pmt) * (1 + r);
    if (n >= target) return months;
  }
  return null;
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  display,
  accentColor = "#007aff",
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  accentColor?: string;
}) {
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
          {hint && <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 6 }}>{hint}</span>}
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: accentColor, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{display}</span>
      </div>
      <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: "rgba(120,120,128,0.15)" }}>
          <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: "100%", borderRadius: 2, background: accentColor, transition: "width 60ms ease" }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%", height: 28,
            opacity: 0, cursor: "pointer", margin: 0, padding: 0,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{min >= 1000 ? fmtShort(min) : min}</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{max >= 1000 ? fmtShort(max) : max}{max < 100 ? "%" : ""}</span>
      </div>
    </div>
  );
}

function FIREView({
  currentNetWorth,
  avgMonthlyExpenses,
  expensesLoaded,
}: {
  currentNetWorth: number;
  avgMonthlyExpenses: number;
  expensesLoaded: boolean;
}) {
  const [monthlyExp, setMonthlyExp] = useState(0);
  const [monthlyInv, setMonthlyInv] = useState(50000);
  const [roiPct, setRoiPct] = useState(12);
  const [swrPct, setSwrPct] = useState(4);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (expensesLoaded && !initialized) {
      setMonthlyExp(Math.max(Math.round(avgMonthlyExpenses / 1000) * 1000, 10000));
      setInitialized(true);
    }
  }, [expensesLoaded, avgMonthlyExpenses, initialized]);

  const fireCorpus = useMemo(() => swrPct > 0 ? (monthlyExp * 12) / (swrPct / 100) : 0, [monthlyExp, swrPct]);
  const progress = useMemo(() => fireCorpus > 0 ? Math.min((currentNetWorth / fireCorpus) * 100, 100) : 0, [currentNetWorth, fireCorpus]);
  const monthsToFIRE = useMemo(() => calcMonthsToFIRE(currentNetWorth, monthlyInv, roiPct, fireCorpus), [currentNetWorth, monthlyInv, roiPct, fireCorpus]);
  const fireYear = useMemo(() => {
    if (monthsToFIRE == null || monthsToFIRE === 0) return null;
    const d = new Date(new Date().getFullYear(), new Date().getMonth() + monthsToFIRE, 1);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }, [monthsToFIRE]);
  const passiveMonthly = useMemo(() => fireCorpus > 0 ? (fireCorpus * (swrPct / 100)) / 12 : 0, [fireCorpus, swrPct]);

  const progressColor = progress >= 100 ? "#34c759" : progress >= 50 ? "#007aff" : "#ff9500";
  const timeLabel = monthsToFIRE == null
    ? "60+ yrs"
    : monthsToFIRE === 0
    ? "You're FIRE!"
    : monthsToFIRE < 12
    ? `${monthsToFIRE} months`
    : `${(monthsToFIRE / 12).toFixed(1)} years`;

  const card: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 22,
    border: "1px solid var(--separator)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

      {/* ── Left: Outcome card ── */}
      <div style={{ ...card, padding: "24px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-tertiary)" }}>
          Time to FIRE
        </p>
        <p style={{
          margin: 0, fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
          color: monthsToFIRE === 0 ? "#34c759" : monthsToFIRE == null ? "#ff9500" : "var(--text-primary)",
        }}>
          {timeLabel}
        </p>
        {fireYear && (
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
            Estimated retirement — <strong style={{ color: "var(--text-primary)" }}>{fireYear}</strong>
          </p>
        )}

        <div style={{ height: 1, background: "var(--separator)", margin: "20px 0" }} />

        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Progress to FIRE</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: progressColor }}>{progress.toFixed(1)}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(120,120,128,0.12)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, width: `${progress}%`,
              background: progress >= 100 ? "#34c759" : `linear-gradient(90deg, #ff9500 0%, #007aff 60%, #34c759 100%)`,
              transition: "width 300ms ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Now: {fmtINR(currentNetWorth)}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Goal: {fmtINR(fireCorpus)}</span>
          </div>
        </div>

        {/* 4 stat pills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Corpus Needed", value: fmtINR(fireCorpus), color: "var(--text-primary)" },
            { label: "Monthly Passive", value: `${fmtINR(passiveMonthly)}/mo`, color: "#34c759" },
            { label: "Gap Remaining", value: fireCorpus > currentNetWorth ? fmtINR(fireCorpus - currentNetWorth) : "Achieved!", color: "#ff9500" },
            { label: "Annual Expenses", value: fmtINR(monthlyExp * 12), color: "#ff3b30" },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(120,120,128,0.06)", borderRadius: 14, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-tertiary)" }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: "-0.01em" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Parameters card ── */}
      <div style={{ ...card, padding: "24px" }}>
        <p style={{ margin: "0 0 20px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-tertiary)" }}>
          Adjust Parameters
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SliderRow
            label="Monthly Expenses"
            hint={expensesLoaded && avgMonthlyExpenses > 0 ? `avg ${fmtShort(avgMonthlyExpenses)}` : undefined}
            value={monthlyExp}
            min={10000}
            max={500000}
            step={5000}
            onChange={setMonthlyExp}
            display={fmtINR(monthlyExp)}
            accentColor="#ff3b30"
          />
          <SliderRow
            label="Monthly Investment"
            value={monthlyInv}
            min={5000}
            max={500000}
            step={5000}
            onChange={setMonthlyInv}
            display={fmtINR(monthlyInv)}
            accentColor="#34c759"
          />
          <SliderRow
            label="Expected ROI / year"
            value={roiPct}
            min={4}
            max={30}
            step={0.5}
            onChange={setRoiPct}
            display={`${roiPct}%`}
            accentColor="#007aff"
          />
          <SliderRow
            label="Safe Withdrawal Rate"
            hint="4% rule = 25× expenses"
            value={swrPct}
            min={2}
            max={6}
            step={0.5}
            onChange={setSwrPct}
            display={`${swrPct}%`}
            accentColor="#bf5af2"
          />
        </div>

        <div style={{ height: 1, background: "var(--separator)", margin: "20px 0" }} />

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          Corpus = Annual expenses ÷ SWR · Classic 4% rule means you need 25× your annual spending.
          Returns compound monthly. Net worth grows with your monthly investment.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { user, loading: authLoading, profile } = useAuth();
  const router = useRouter();

  const [scenarios, setScenarios] = useState<ProjectionScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<ProjectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentNetWorth, setCurrentNetWorth] = useState<number>(0);

  // ── Compare mode ─────────────────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [allEventsMap, setAllEventsMap] = useState<Record<string, ProjectionEvent[]>>({});

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
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // ── vs-Actual overlay ────────────────────────────────────────────────────────
  const [showActual, setShowActual] = useState(false);
  const [snapshots, setSnapshots] = useState<{ snapshot_date: string; net_worth: number }[]>([]);

  // ── FIRE calculator ──────────────────────────────────────────────────────────
  const [goalTab, setGoalTab] = useState<"scenarios" | "fire">("scenarios");
  const [avgMonthlyExpenses, setAvgMonthlyExpenses] = useState(0);
  const [expensesLoaded, setExpensesLoaded] = useState(false);

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

  const fetchEventsForScenario = useCallback(
    async (scenarioId: string): Promise<ProjectionEvent[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("projection_events")
        .select("*")
        .eq("user_id", user.id)
        .eq("scenario_id", scenarioId)
        .order("event_date", { ascending: true });
      return (data ?? []) as ProjectionEvent[];
    },
    [user]
  );

  // ── Fetch live net worth from assets/liabilities ─────────────────────────────
  const fetchNetWorth = useCallback(async () => {
    if (!user) return;
    const [{ data: assets }, { data: liabilities }, { data: holdings }] =
      await Promise.all([
        supabase.from("assets").select("value").eq("user_id", user.id),
        supabase
          .from("liabilities")
          .select("outstanding_amount, status")
          .eq("user_id", user.id),
        supabase
          .from("broker_holdings")
          .select("quantity, last_price")
          .eq("user_id", user.id),
      ]);
    const totalAssets =
      (assets ?? []).reduce((s, a) => s + Number(a.value ?? 0), 0) +
      (holdings ?? []).reduce(
        (s: number, h: { quantity: number; last_price: number }) =>
          s + h.quantity * h.last_price,
        0
      );
    const totalLiabilities = (liabilities ?? [])
      .filter((l: { status: string }) => l.status === "active")
      .reduce(
        (s: number, l: { outstanding_amount: number }) =>
          s + Number(l.outstanding_amount ?? 0),
        0
      );
    setCurrentNetWorth(totalAssets - totalLiabilities);
  }, [user]);

  useEffect(() => {
    if (user) fetchScenarios(true);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) fetchNetWorth();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    supabase
      .from("networth_snapshots")
      .select("snapshot_date, net_worth")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true })
      .then(({ data }) => {
        setSnapshots((data ?? []) as { snapshot_date: string; net_worth: number }[]);
      });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    supabase
      .from("expenses")
      .select("amount, month_key, notes")
      .eq("user_id", user.id)
      .gte("month_key", months[0])
      .then(({ data }) => {
        const byMonth: Record<string, number> = {};
        for (const e of (data ?? []) as { amount: number; month_key: string; notes: string | null }[]) {
          let amt = Number(e.amount ?? 0);
          try { const n = e.notes ? JSON.parse(e.notes) : {}; if (n.sar && n.rate) amt = Number(n.sar) * Number(n.rate); } catch { /* */ }
          byMonth[e.month_key] = (byMonth[e.month_key] ?? 0) + amt;
        }
        const vals = months.map((mk) => byMonth[mk] ?? 0).filter((v) => v > 0);
        setAvgMonthlyExpenses(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
        setExpensesLoaded(true);
      });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEvents([]);
    if (selectedId) fetchEvents();
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch events for all compared scenarios whenever compareIds changes
  useEffect(() => {
    if (!compareMode || !user || compareIds.size === 0) return;
    const ids = Array.from(compareIds);
    Promise.all(ids.map((id) => fetchEventsForScenario(id))).then((results) => {
      const map: Record<string, ProjectionEvent[]> = {};
      ids.forEach((id, i) => { map[id] = results[i]; });
      setAllEventsMap(map);
    });
  }, [compareMode, compareIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ────────────────────────────────────────────────────────────
  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedId) ?? null,
    [scenarios, selectedId]
  );

  // Resolve the effective net worth for auto-linked scenarios
  const effectiveScenario = useMemo(() => {
    if (!selectedScenario) return null;
    if (selectedScenario.is_auto_net_worth)
      return { ...selectedScenario, current_net_worth: currentNetWorth };
    return selectedScenario;
  }, [selectedScenario, currentNetWorth]);

  const chartData = useMemo(() => {
    if (!effectiveScenario) return [];
    return calculateProjection(effectiveScenario, events);
  }, [effectiveScenario, events]);

  const chartDataWithActual = useMemo(() => {
    if (!effectiveScenario || !chartData.length) return chartData;
    const start = new Date(effectiveScenario.start_date);
    // Build month-keyed map from snapshots, keeping the last snapshot per month
    const snapMap: Record<string, number> = {};
    for (const s of snapshots) {
      const d = new Date(s.snapshot_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      snapMap[key] = s.net_worth;
    }
    return chartData.map((pt) => {
      const d = new Date(start.getFullYear(), start.getMonth() + pt.monthIndex, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const actual = snapMap[key];
      return actual !== undefined ? { ...pt, actualNetWorth: actual } : pt;
    });
  }, [chartData, snapshots, effectiveScenario]);

  const metrics = useMemo(() => {
    if (!effectiveScenario || !chartData.length) return null;
    const final = chartData[chartData.length - 1].netWorth;
    const totalContributions =
      effectiveScenario.monthly_investment * effectiveScenario.months;
    const totalExpenses = events
      .filter((e) => e.event_type === "expense")
      .reduce((s, e) => s + e.amount, 0);
    const totalIncome = events
      .filter((e) => e.event_type === "income")
      .reduce((s, e) => s + e.amount, 0);
    const netEventImpact = totalIncome - totalExpenses;
    const growthFromReturns =
      final -
      effectiveScenario.current_net_worth -
      totalContributions -
      netEventImpact;
    return {
      final,
      totalContributions,
      totalExpenses,
      totalIncome,
      growthFromReturns,
    };
  }, [effectiveScenario, events, chartData]);

  const nextMilestone = useMemo(() => {
    if (!effectiveScenario || !chartData.length) return null;
    const milestone = MILESTONES.find(
      (m) => m > effectiveScenario.current_net_worth
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

  // ── Compare-mode derived data ────────────────────────────────────────────────
  // Stable color map: each scenario gets a color by its position in the list
  const compareColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    scenarios.forEach((s, i) => { map[s.id] = COMPARE_COLORS[i % COMPARE_COLORS.length]; });
    return map;
  }, [scenarios]);

  const compareScenarios = useMemo(
    () => scenarios.filter((s) => compareIds.has(s.id)),
    [scenarios, compareIds]
  );

  const compareMaxMonths = useMemo(() => {
    if (!compareMode || compareScenarios.length === 0) return 0;
    return Math.max(...compareScenarios.map((s) => s.months));
  }, [compareMode, compareScenarios]);

  const compareXTicks = useMemo(() => {
    const ticks: number[] = [0];
    for (let i = 12; i <= compareMaxMonths; i += 12) ticks.push(i);
    return ticks;
  }, [compareMaxMonths]);

  const compareChartData = useMemo(() => {
    if (!compareMode || compareScenarios.length < 2) return [];
    const projections = compareScenarios.map((s) => {
      const evs = allEventsMap[s.id] ?? [];
      const eff = s.is_auto_net_worth ? { ...s, current_net_worth: currentNetWorth } : s;
      return { id: s.id, points: calculateProjection(eff, evs) };
    });
    const data: Record<string, number | string>[] = [];
    for (let i = 0; i <= compareMaxMonths; i++) {
      const label =
        i === 0
          ? "Start"
          : Number.isInteger(i / 12)
          ? `Year ${i / 12}`
          : `Mo ${i}`;
      const pt: Record<string, number | string> = { monthIndex: i, label };
      for (const proj of projections) {
        const val = proj.points[i]?.netWorth;
        if (val !== undefined) pt[proj.id] = val;
      }
      data.push(pt);
    }
    return data;
  }, [compareMode, compareScenarios, allEventsMap, currentNetWorth, compareMaxMonths]);

  const compareMetrics = useMemo(() => {
    if (!compareMode || compareScenarios.length < 2) return null;
    return compareScenarios.map((s) => {
      const evs = allEventsMap[s.id] ?? [];
      const eff = s.is_auto_net_worth ? { ...s, current_net_worth: currentNetWorth } : s;
      const points = calculateProjection(eff, evs);
      return {
        scenario: s,
        color: compareColorMap[s.id] ?? "#007aff",
        finalNW: points[points.length - 1]?.netWorth ?? 0,
      };
    });
  }, [compareMode, compareScenarios, allEventsMap, currentNetWorth, compareColorMap]);

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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
            {goalTab === "fire" ? "FIRE Calculator" : "Wealth Projection"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, margin: "4px 0 16px" }}>
            {goalTab === "fire" ? "Financial Independence · Retire Early" : "See where you could be in 3, 5, or 10 years."}
          </p>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(120,120,128,0.10)", border: "1px solid var(--separator)" }}>
            {(["scenarios", "fire"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setGoalTab(tab)}
                style={{
                  padding: "7px 18px", borderRadius: 9, border: "none",
                  background: goalTab === tab ? "var(--surface)" : "transparent",
                  color: goalTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: goalTab === tab ? 700 : 500,
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: goalTab === tab ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  transition: "all 200ms ease",
                }}
              >
                {tab === "scenarios" ? "Projections" : "FIRE"}
              </button>
            ))}
          </div>
        </div>

        {goalTab === "fire" && (
          <FIREView
            currentNetWorth={currentNetWorth}
            avgMonthlyExpenses={avgMonthlyExpenses}
            expensesLoaded={expensesLoaded}
          />
        )}

        {goalTab === "scenarios" && (
        <>
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
          {scenarios.map((s, idx) => {
            const color = compareColorMap[s.id] ?? COMPARE_COLORS[idx % COMPARE_COLORS.length];
            const inCompare = compareIds.has(s.id);
            const active = !compareMode && s.id === selectedId;
            return (
              <div
                key={s.id}
                onClick={() => {
                  if (compareMode) {
                    setCompareIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(s.id)) {
                        // Keep at least 1 selected
                        if (next.size > 1) next.delete(s.id);
                      } else {
                        if (next.size < MAX_COMPARE) next.add(s.id);
                        else showToast(`Max ${MAX_COMPARE} scenarios in compare mode.`, "error");
                      }
                      return next;
                    });
                  } else {
                    setSelectedId(s.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 20,
                  background: compareMode
                    ? inCompare
                      ? `${color}22`
                      : "var(--surface)"
                    : active
                    ? "#007aff"
                    : "var(--surface)",
                  color: compareMode
                    ? inCompare
                      ? color
                      : "var(--text-secondary)"
                    : active
                    ? "#fff"
                    : "var(--text-primary)",
                  border: `1.5px solid ${
                    compareMode
                      ? inCompare
                        ? color
                        : "var(--separator)"
                      : active
                      ? "#007aff"
                      : "var(--separator)"
                  }`,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  transition: "all 160ms ease",
                  userSelect: "none",
                }}
              >
                {compareMode && inCompare && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span>{s.name}</span>
                {!compareMode && (
                  <>
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
                  </>
                )}
              </div>
            );
          })}
          {!compareMode && (
            <button
              onClick={() => {
                const limits = getLimits(profile?.plan_type);
                if (scenarios.length >= limits.scenarios) {
                  if (!isPremium(profile?.plan_type)) {
                    setUpgradeModalOpen(true);
                  } else {
                    showToast(`You've reached the premium limit of ${limits.scenarios} scenarios.`, "error");
                  }
                  return;
                }
                setScenarioModal({ open: true });
              }}
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
          )}
          {scenarios.length >= 2 && (
            <button
              onClick={() => {
                if (compareMode) {
                  setCompareMode(false);
                  setCompareIds(new Set());
                } else {
                  const preselect = new Set(
                    scenarios.slice(0, MAX_COMPARE).map((s) => s.id)
                  );
                  setCompareMode(true);
                  setCompareIds(preselect);
                }
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                background: compareMode ? "rgba(174,221,0,0.12)" : "transparent",
                border: `1.5px solid ${compareMode ? "#AEDD00" : "var(--separator)"}`,
                color: compareMode ? "#AEDD00" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: "nowrap",
                transition: "all 160ms ease",
                flexShrink: 0,
              }}
            >
              {compareMode
                ? `✕ Exit Compare (${compareIds.size})`
                : "⊕ Compare"}
            </button>
          )}
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

        {/* ── Compare mode ─────────────────────────────────────────────────── */}
        {compareMode && compareMetrics && compareChartData.length > 0 && (
          <>
            {/* Compare summary header */}
            <div style={{ marginBottom: 14 }}>
              {(() => {
                const sorted = [...compareMetrics].sort((a, b) => b.finalNW - a.finalNW);
                const best = sorted[0];
                const second = sorted[1];
                const delta = best.finalNW - second.finalNW;
                const bestHorizon = best.scenario.months;
                return (
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(174,221,0,0.08), rgba(0,122,255,0.06))",
                      border: "1px solid rgba(174,221,0,0.2)",
                      borderRadius: 16,
                      padding: "13px 18px",
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
                        background: "rgba(174,221,0,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconTrendingUp size={16} stroke="#AEDD00" />
                    </div>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        fontSize: 14,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: best.color }}>{best.scenario.name}</span>{" "}
                      could end{" "}
                      <span style={{ color: "#AEDD00", fontWeight: 700 }}>
                        {fmtINR(delta)}
                      </span>{" "}
                      higher than{" "}
                      <span style={{ color: second.color }}>
                        {second.scenario.name}
                      </span>{" "}
                      over{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {horizonLabel(bestHorizon)}
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Per-scenario projected NW cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(compareMetrics.length, 3)}, 1fr)`,
                gap: 10,
                marginBottom: 14,
              }}
            >
              {compareMetrics.map((cm) => (
                <div
                  key={cm.scenario.id}
                  style={{
                    background: "var(--surface)",
                    borderRadius: 18,
                    border: `1.5px solid ${cm.color}33`,
                    padding: "14px 16px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: cm.color,
                      borderRadius: "18px 18px 0 0",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cm.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cm.scenario.name}
                    </span>
                  </div>
                  <div
                    style={{
                      color: cm.color,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "-0.5px",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {fmtINR(cm.finalNW)}
                  </div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                    in {horizonLabel(cm.scenario.months)} ·{" "}
                    {fmtINR(cm.scenario.monthly_investment)}/mo
                  </div>
                </div>
              ))}
            </div>

            {/* Compare chart */}
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
                    Scenario Comparison
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {compareScenarios.length} scenarios · up to{" "}
                    {horizonLabel(compareMaxMonths)} horizon
                  </div>
                </div>
                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    alignItems: "center",
                  }}
                >
                  {compareScenarios.map((s) => (
                    <span
                      key={s.id}
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 3,
                          borderRadius: 2,
                          background: compareColorMap[s.id],
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={compareChartData}
                    margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {compareScenarios.map((s) => (
                        <linearGradient
                          key={s.id}
                          id={`cmpGrad-${s.id}`}
                          x1="0" y1="0" x2="0" y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={compareColorMap[s.id]}
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor={compareColorMap[s.id]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      stroke="var(--separator)"
                      vertical={false}
                      strokeDasharray="0"
                    />
                    <XAxis
                      dataKey="monthIndex"
                      type="number"
                      domain={[0, compareMaxMonths]}
                      ticks={compareXTicks}
                      tickFormatter={(v) =>
                        v === 0
                          ? "Start"
                          : Number.isInteger(v / 12)
                          ? `Y${v / 12}`
                          : `M${v}`
                      }
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${fmtShort(v)}`}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={68}
                    />
                    <Tooltip
                      content={(props) => (
                        <CompareTooltip
                          active={props.active}
                          payload={
                            props.payload as unknown as {
                              payload: Record<string, number | string>;
                            }[]
                          }
                          compareScenarios={compareScenarios}
                          colorMap={compareColorMap}
                        />
                      )}
                      cursor={{
                        stroke: "var(--separator)",
                        strokeWidth: 1,
                      }}
                    />
                    {compareScenarios.map((s) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stroke={compareColorMap[s.id]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: compareColorMap[s.id],
                          stroke: "var(--surface)",
                          strokeWidth: 2,
                        }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Compare detail table */}
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
                  fontWeight: 700,
                  fontSize: 17,
                  color: "var(--text-primary)",
                  marginBottom: 16,
                }}
              >
                Scenario Details
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Scenario",
                        "Starting NW",
                        "Monthly Investment",
                        "Return",
                        "Horizon",
                        "Projected NW",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: "var(--text-tertiary)",
                            fontWeight: 600,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            textAlign: "left",
                            paddingBottom: 10,
                            paddingRight: 16,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareMetrics.map((cm) => (
                      <tr
                        key={cm.scenario.id}
                        style={{ borderTop: "1px solid var(--separator)" }}
                      >
                        <td style={{ padding: "12px 16px 12px 0" }}>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: cm.color,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {cm.scenario.name}
                            </span>
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px 12px 0",
                            color: "var(--text-primary)",
                          }}
                        >
                          {cm.scenario.is_auto_net_worth
                            ? fmtINR(currentNetWorth)
                            : fmtINR(cm.scenario.current_net_worth)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px 12px 0",
                            color: "var(--text-primary)",
                          }}
                        >
                          {fmtINR(cm.scenario.monthly_investment)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px 12px 0",
                            color: "var(--text-primary)",
                          }}
                        >
                          {cm.scenario.annual_return_pct}%
                        </td>
                        <td
                          style={{
                            padding: "12px 16px 12px 0",
                            color: "var(--text-primary)",
                          }}
                        >
                          {horizonLabel(cm.scenario.months)}
                        </td>
                        <td
                          style={{
                            padding: "12px 0 12px 0",
                            fontWeight: 700,
                            color: cm.color,
                          }}
                        >
                          {fmtINR(cm.finalNW)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {!compareMode && selectedScenario && metrics && (
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

            {/* Summary metric cards — 2×2 on mobile, 4-col on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              {(
                [
                  {
                    icon: <IconTrendingUp size={16} stroke="#007aff" />,
                    iconBg: "rgba(0,122,255,0.10)",
                    label: "Projected NW",
                    value: fmtINR(metrics.final),
                    sub: `in ${horizonLabel(selectedScenario.months)}`,
                    color: "#007aff",
                  },
                  {
                    icon: <IconPlusCircle size={16} stroke="#34c759" />,
                    iconBg: "rgba(52,199,89,0.10)",
                    label: "Contributions",
                    value: fmtINR(metrics.totalContributions),
                    sub: `₹${fmtShort(selectedScenario.monthly_investment)}/mo`,
                    color: "#34c759",
                  },
                  {
                    icon: <IconStar size={16} stroke="#AEDD00" />,
                    iconBg: "rgba(174,221,0,0.10)",
                    label: "Return Growth",
                    value: fmtINR(Math.max(0, metrics.growthFromReturns)),
                    sub: `${selectedScenario.annual_return_pct}% p.a.`,
                    color: "#AEDD00",
                  },
                  {
                    icon: <IconTag size={16} stroke={metrics.totalExpenses > 0 ? "#ff3b30" : "var(--text-tertiary)"} />,
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
                    borderRadius: 18,
                    border: "1px solid var(--separator)",
                    padding: "14px 16px 13px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                  }}
                >
                  {/* Icon + label row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: card.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        lineHeight: 1.2,
                      }}
                    >
                      {card.label}
                    </div>
                  </div>
                  {/* Value */}
                  <div
                    style={{
                      color: card.color,
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "-0.4px",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {card.value}
                  </div>
                  {/* Sub */}
                  <div style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
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
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Planned / Actual legend */}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 14, height: 3, borderRadius: 2, background: "#007aff", display: "inline-block", flexShrink: 0 }} />
                      Planned
                    </span>
                    {showActual && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 14, height: 3, borderRadius: 2, background: "#34c759", display: "inline-block", flexShrink: 0 }} />
                        Actual
                      </span>
                    )}
                    {!showActual && (
                      <>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", display: "inline-block", flexShrink: 0 }} />
                          Expense
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34c759", display: "inline-block", flexShrink: 0 }} />
                          Income
                        </span>
                      </>
                    )}
                  </div>
                  {/* vs Actual toggle */}
                  <button
                    onClick={() => setShowActual((v) => !v)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1px solid ${showActual ? "#34c759" : "var(--separator)"}`,
                      background: showActual ? "rgba(52,199,89,0.12)" : "none",
                      color: showActual ? "#34c759" : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 180ms ease",
                    }}
                  >
                    vs Actual
                  </button>
                </div>
              </div>

              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartDataWithActual}
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
                        if (showActual || (!payload?.hasExpense && !payload?.hasIncome)) {
                          return <circle key={key} cx={cx} cy={cy} r={0} fill="none" />;
                        }
                        const color = payload.hasExpense ? "#ff3b30" : "#34c759";
                        return (
                          <circle key={key} cx={cx} cy={cy} r={6} fill={color}
                            stroke="var(--surface)" strokeWidth={2.5} />
                        );
                      }}
                      activeDot={{ r: 5, fill: "#007aff", stroke: "var(--surface)", strokeWidth: 2 }}
                    />
                    {showActual && (
                      <Line
                        type="monotone"
                        dataKey="actualNetWorth"
                        stroke="#34c759"
                        strokeWidth={2.5}
                        dot={(props: any) => {
                          const { cx, cy, key, value } = props;
                          if (value === undefined || value === null) return <circle key={key} r={0} cx={cx} cy={cy} fill="none" />;
                          return <circle key={key} cx={cx} cy={cy} r={5} fill="#34c759" stroke="var(--surface)" strokeWidth={2} />;
                        }}
                        activeDot={{ r: 5, fill: "#34c759", stroke: "var(--surface)", strokeWidth: 2 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    )}
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
                      value: selectedScenario.is_auto_net_worth
                        ? fmtINR(currentNetWorth)
                        : fmtINR(selectedScenario.current_net_worth),
                      badge: selectedScenario.is_auto_net_worth ? "Live" : undefined,
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
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {"badge" in row && row.badge && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#34c759",
                              background: "rgba(52,199,89,0.12)",
                              padding: "2px 6px",
                              borderRadius: 8,
                              letterSpacing: "0.3px",
                            }}
                          >
                            {row.badge}
                          </span>
                        )}
                        <span
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {row.value}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        </> )}
      </main>

      <Footer />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <PremiumUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        limitContext={`You've reached the free limit of ${getLimits(profile?.plan_type).scenarios} scenario${getLimits(profile?.plan_type).scenarios === 1 ? "" : "s"}. Upgrade to add up to ${15} scenarios.`}
      />

      {scenarioModal.open && (
        <ScenarioModal
          open={scenarioModal.open}
          editData={scenarioModal.editData}
          userId={user!.id}
          currentNetWorth={currentNetWorth}
          onClose={() => setScenarioModal({ open: false })}
          onSave={async (scenario) => {
            await fetchScenarios();
            setSelectedId(scenario.id);
            // In compare mode, add the saved scenario to the comparison set
            if (compareMode) {
              setCompareIds((prev) => {
                const next = new Set(prev);
                if (next.size < MAX_COMPARE) next.add(scenario.id);
                return next;
              });
            }
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
