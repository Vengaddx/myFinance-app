"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
          <span style={{ fontSize: 13, fontWeight: 600, color: atLimit ? "#DC2626" : nearLimit ? "#D97706" : "var(--text-secondary)" }}>
            {used} / {limit}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: atLimit ? "#DC2626" : nearLimit ? "#D97706" : "var(--text-tertiary)",
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
          background: atLimit ? "#DC2626" : nearLimit ? "#D97706" : accent,
          transition: "width 500ms cubic-bezier(0.34,1.15,0.64,1)",
        }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, profile, loading: authLoading, profileLoading } = useAuth();

  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  type KiteStatus = { connected: boolean; labels: string[]; lastSyncedAt: string | null };
  const [kiteStatus, setKiteStatus] = useState<KiteStatus | null>(null);
  const [kiteLoading, setKiteLoading] = useState(true);

  const syncResult = searchParams.get("sync");
  const kiteResult = searchParams.get("kite");

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

  useEffect(() => {
    if (!session) return;
    fetch("/api/kite/status")
      .then((r) => r.json())
      .then((data: KiteStatus) => { setKiteStatus(data); setKiteLoading(false); })
      .catch(() => { setKiteStatus({ connected: false, labels: [], lastSyncedAt: null }); setKiteLoading(false); });
  }, [session]);

  if (authLoading || !session) {
    return <div className="min-h-screen" />;
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
    <div className="min-h-screen" style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
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
              color: "#2563EB", fontSize: 14, fontWeight: 500,
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
              Upgrade to Premium · <span style={{ textDecoration: "line-through", opacity: 0.6 }}>₹299</span> ₹99
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
                accent="#2563EB"
              />
              <UsageRow
                label="Liabilities"
                used={usage?.liabilities ?? 0}
                limit={limits.liabilities}
                accent="#DC2626"
              />
              <UsageRow
                label="Expenses this month"
                used={usage?.expensesThisMonth ?? 0}
                limit={limits.expensesPerMonth}
                accent="#D97706"
              />
              <UsageRow
                label="Goal scenarios"
                used={usage?.scenarios ?? 0}
                limit={limits.scenarios}
                accent="#16A34A"
              />
            </div>
          )}
        </div>

        {/* ── Broker connections ─────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <SectionLabel>Broker Connection</SectionLabel>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(174,221,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#759800" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Zerodha Kite</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {kiteLoading ? "Checking connection…" : kiteStatus?.connected
                  ? `${kiteStatus.labels.length} account${kiteStatus.labels.length !== 1 ? "s" : ""} connected`
                  : "Not connected"}
              </p>
            </div>
          </div>

          {(syncResult === "done" || kiteResult === "connected") && (
            <div style={{ background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.16)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#16A34A" }}>
                {kiteResult === "connected" ? "Kite account connected" : "Portfolio synced successfully"}
              </span>
            </div>
          )}
          {syncResult === "error" && (
            <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.14)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#DC2626" }}>Sync failed — try reconnecting</span>
            </div>
          )}

          {!kiteLoading && kiteStatus?.connected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kiteStatus.labels.map((label) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--surface-secondary)", border: "1px solid var(--separator)" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <form method="POST" action="/api/kite/sync" style={{ margin: 0 }}>
                      <input type="hidden" name="label" value={label} />
                      <button type="submit" style={{ background: "#AEDD00", color: "#111", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                        Sync
                      </button>
                    </form>
                    <form method="POST" action="/api/kite/disconnect" style={{ margin: 0 }}>
                      <input type="hidden" name="label" value={label} />
                      <button type="submit" style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--separator)", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        Disconnect
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {kiteStatus.lastSyncedAt && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
                  Last synced: {new Date(kiteStatus.lastSyncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <a href="/api/kite/login" style={{ color: "#2563EB", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", marginTop: 2 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                Connect another account
              </a>
            </div>
          ) : !kiteLoading && (
            <a href="/api/kite/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", borderRadius: 14, background: "#AEDD00", color: "#111", fontWeight: 700, fontSize: 14, textDecoration: "none", boxSizing: "border-box" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              Connect Zerodha Kite
            </a>
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
