"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getLimits, isPremium, FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/planLimits";
import Navbar from "@/app/components/Navbar";
import PremiumUpgradeModal from "@/app/components/PremiumUpgradeModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Usage {
  assets: number;
  liabilities: number;
  expensesThisMonth: number;
  scenarios: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CrownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M2 19h20v2H2zM2 17l4-10 6 5 6-5 4 10H2z" />
    </svg>
  );
}

function ChevronLeft({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

// ─── Usage Row ────────────────────────────────────────────────────────────────

function UsageRow({
  label,
  used,
  limit,
  accent,
}: {
  label: string;
  used: number;
  limit: number;
  accent: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  const nearLimit = pct >= 80;
  const atLimit = used >= limit;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: atLimit ? "#ff3b30" : nearLimit ? "#ff9500" : "var(--text-secondary)" }}>
            {used} / {limit}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: atLimit ? "#ff3b30" : nearLimit ? "#ff9500" : "var(--text-tertiary)",
            background: atLimit ? "rgba(255,59,48,0.10)" : nearLimit ? "rgba(255,149,0,0.10)" : "var(--surface-secondary)",
            padding: "2px 8px", borderRadius: 6,
          }}>
            {remaining} left
          </span>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--surface-secondary)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 3,
          background: atLimit ? "#ff3b30" : nearLimit ? "#ff9500" : accent,
          transition: "width 500ms cubic-bezier(0.34,1.15,0.64,1)",
        }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, profile, loading: authLoading, profileLoading } = useAuth();

  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const planType = profile?.plan_type ?? "free";
  const limits = getLimits(planType);
  const premium = isPremium(planType);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !session) router.replace("/login");
  }, [authLoading, session, router]);

  // Fetch counts
  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;

    async function fetchUsage() {
      setUsageLoading(true);
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [assets, liabilities, expenses, scenarios] = await Promise.all([
        supabase.from("assets").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("liabilities").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("expenses").select("*", { count: "exact", head: true }).eq("user_id", uid).eq("month_key", monthKey),
        supabase.from("projection_scenarios").select("*", { count: "exact", head: true }).eq("user_id", uid),
      ]);

      setUsage({
        assets: assets.count ?? 0,
        liabilities: liabilities.count ?? 0,
        expensesThisMonth: expenses.count ?? 0,
        scenarios: scenarios.count ?? 0,
      });
      setUsageLoading(false);
    }

    fetchUsage();
  }, [session?.user?.id]);

  if (authLoading || !session) {
    return <div className="min-h-screen" style={{ background: "var(--bg)" }} />;
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderRadius: 20,
    border: "1px solid var(--separator)",
    padding: "20px 20px",
    boxShadow: isDark
      ? "0 1px 0 rgba(255,255,255,0.04)"
      : "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
      <Navbar />

      <main
        className="max-w-[640px] mx-auto px-4 sm:px-5 py-5 flex flex-col gap-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        {/* Back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: "#007aff", fontSize: 14, fontWeight: 500,
              padding: "4px 0", fontFamily: "inherit",
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Settings
        </h1>

        {/* ── Plan card ──────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <SectionLabel>Your Plan</SectionLabel>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {premium ? (
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", flexShrink: 0,
                  boxShadow: "0 3px 12px rgba(255,149,0,0.35)",
                }}>
                  <CrownIcon size={17} />
                </div>
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: "var(--surface-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-tertiary)", flexShrink: 0,
                  border: "1px solid var(--separator)",
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {premium ? "Premium" : "Free"}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>
                  {premium
                    ? profile?.premium_since
                      ? `Active since ${new Date(profile.premium_since).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                      : "Active"
                    : "Limited usage"}
                </p>
              </div>
            </div>

            {premium ? (
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: "#FF9500",
                background: "rgba(255,149,0,0.12)",
                padding: "4px 12px", borderRadius: 20,
                border: "1px solid rgba(255,149,0,0.22)",
              }}>
                PREMIUM
              </span>
            ) : (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--text-tertiary)",
                background: "var(--surface-secondary)",
                padding: "4px 12px", borderRadius: 20,
                border: "1px solid var(--separator)",
              }}>
                FREE
              </span>
            )}
          </div>

          {!premium && (
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(255,149,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                transition: "opacity 150ms ease, transform 150ms ease",
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              <CrownIcon size={15} />
              Upgrade to Premium · ₹499
            </button>
          )}
        </div>

        {/* ── Usage card ─────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <SectionLabel>Usage</SectionLabel>
          <p style={{ margin: "4px 0 16px", fontSize: 12, color: "var(--text-tertiary)" }}>
            {premium ? "Premium plan" : "Free plan"} limits
          </p>

          {usageLoading || profileLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ height: 14, width: `${40 + i * 12}%`, borderRadius: 6, background: "var(--surface-secondary)" }} />
                  <div style={{ height: 5, borderRadius: 3, background: "var(--surface-secondary)" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <UsageRow
                label="Assets"
                used={usage?.assets ?? 0}
                limit={limits.assets}
                accent="#007aff"
              />
              <UsageRow
                label="Liabilities"
                used={usage?.liabilities ?? 0}
                limit={limits.liabilities}
                accent="#ff3b30"
              />
              <UsageRow
                label="Expenses this month"
                used={usage?.expensesThisMonth ?? 0}
                limit={limits.expensesPerMonth}
                accent="#ff9500"
              />
              <UsageRow
                label="Goal scenarios"
                used={usage?.scenarios ?? 0}
                limit={limits.scenarios}
                accent="#34c759"
              />
            </div>
          )}
        </div>

        {/* ── Plan limits reference ───────────────────────────────────────────── */}
        <div style={cardStyle}>
          <SectionLabel>Plan Limits</SectionLabel>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "Assets",           free: FREE_LIMITS.assets,            premium: PREMIUM_LIMITS.assets },
              { label: "Liabilities",      free: FREE_LIMITS.liabilities,        premium: PREMIUM_LIMITS.liabilities },
              { label: "Expenses / month", free: FREE_LIMITS.expensesPerMonth,   premium: PREMIUM_LIMITS.expensesPerMonth },
              { label: "Goal scenarios",   free: FREE_LIMITS.scenarios,          premium: PREMIUM_LIMITS.scenarios },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 64px 80px",
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--separator)" : "none",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>
                  {row.free} free
                </span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: "#FF9500",
                    background: "rgba(255,149,0,0.10)",
                    padding: "2px 9px", borderRadius: 6,
                  }}>
                    {row.premium} premium
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <PremiumUpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: 0,
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      color: "var(--text-tertiary)",
    }}>
      {children}
    </p>
  );
}
