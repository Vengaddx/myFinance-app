"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import type { User } from "@supabase/supabase-js";
import DonateModal from "@/app/components/DonateModal";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Portfolio", id: "portfolio" },
  { label: "Stocks",    id: "stocks" },
  { label: "Goals",     id: "goals" },
  { label: "Cash Flow", id: "cashflow" },
];

function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}

function StocksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function GoalsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CashFlowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function UserDropdown({
  user,
  isDark,
  onSignOut,
  onDonate,
  onClose,
}: {
  user: User;
  isDark: boolean;
  onSignOut: () => void;
  onDonate: () => void;
  onClose: () => void;
}) {
  const name = user.user_metadata?.name as string | undefined;
  return (
    <div
      className="absolute right-0 top-full mt-2 w-52 rounded-lg overflow-hidden z-[60]"
      style={{
        background: isDark ? "#18181B" : "#ffffff",
        border: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.5)"
          : "0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div className="px-3.5 py-3" style={{ borderBottom: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}` }}>
        {name && (
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {name}
          </p>
        )}
        <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)", marginTop: name ? 2 : 0 }}>
          {user.email}
        </p>
      </div>
      <Link
        href="/settings"
        onClick={onClose}
        className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium flex items-center gap-2.5"
        style={{ color: "var(--text-primary)", borderBottom: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`, display: "flex", transition: "background 120ms ease" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-secondary)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        <SettingsIcon />
        Settings
      </Link>
      <button
        onClick={onDonate}
        className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium flex items-center gap-2.5"
        style={{ color: "#E11D48", borderBottom: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`, transition: "background 120ms ease" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(225,29,72,0.06)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        <HeartIcon />
        Donate
      </button>
      <button
        onClick={onSignOut}
        className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium"
        style={{ color: "#DC2626", transition: "background 120ms ease" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.06)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        Sign out
      </button>
    </div>
  );
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  portfolio: <PortfolioIcon />,
  stocks:    <StocksIcon />,
  goals:     <GoalsIcon />,
  cashflow:  <CashFlowIcon />,
};

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const [showDonate, setShowDonate] = useState(false);

  const activeTab =
    pathname === "/stocks"   ? "stocks"   :
    pathname === "/goals"    ? "goals"    :
    pathname === "/cashflow" ? "cashflow" :
    "portfolio";

  const [showUserMenu, setShowUserMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  type PillRect = { left: number; top: number; width: number; height: number };
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const desktopBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [desktopPill, setDesktopPill] = useState<PillRect | null>(null);
  const [desktopPillReady, setDesktopPillReady] = useState(false);

  const bottomNavRef = useRef<HTMLDivElement>(null);
  const bottomBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bottomPill, setBottomPill] = useState<PillRect | null>(null);
  const [bottomPillReady, setBottomPillReady] = useState(false);

  const measurePills = () => {
    requestAnimationFrame(() => {
      const idx = NAV_ITEMS.findIndex((i) => i.id === activeTab);

      const dBtn = desktopBtnRefs.current[idx];
      const dNav = desktopNavRef.current;
      if (dBtn && dNav) {
        const nr = dNav.getBoundingClientRect();
        const br = dBtn.getBoundingClientRect();
        if (br.width > 0) {
          setDesktopPill({ left: br.left - nr.left, top: br.top - nr.top, width: br.width, height: br.height });
          setDesktopPillReady(true);
        }
      }

      const bBtn = bottomBtnRefs.current[idx];
      const bNav = bottomNavRef.current;
      if (bBtn && bNav) {
        const nr = bNav.getBoundingClientRect();
        const br = bBtn.getBoundingClientRect();
        if (br.width > 0) {
          setBottomPill({ left: br.left - nr.left, top: br.top - nr.top, width: br.width, height: br.height });
          setBottomPillReady(true);
        }
      }
    });
  };

  useEffect(() => { measurePills(); }, [activeTab]);
  useEffect(() => {
    window.addEventListener("resize", measurePills);
    return () => window.removeEventListener("resize", measurePills);
  }, [activeTab]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handle = (e: MouseEvent) => {
      const inMobile = mobileMenuRef.current?.contains(e.target as Node);
      const inDesktop = desktopMenuRef.current?.contains(e.target as Node);
      if (!inMobile && !inDesktop) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showUserMenu]);

  const handleAvatarClick = () => {
    if (!user && !authLoading) { router.push("/login"); return; }
    if (user) setShowUserMenu((v) => !v);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    router.push("/login");
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = user?.user_metadata?.name as string | undefined;

  const initials = (() => {
    if (displayName) {
      const parts = displayName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    return (user?.email?.[0] ?? "?").toUpperCase();
  })();

  const navBg = isDark ? "rgba(9, 9, 11, 0.97)" : "rgba(255, 255, 255, 0.97)";
  const navBorder = isDark ? "#27272A" : "#E2E8F0";

  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(50px + env(safe-area-inset-top))",
          background: navBg,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: `1px solid ${navBorder}`,
          transition: "background 250ms ease, border-color 250ms ease",
        }}
      >
        {/* ── Mobile top bar ── */}
        <div className="md:hidden flex items-center w-full">
          <div className="flex-1 flex items-center">
            <button
              onClick={toggle}
              className="icon-btn w-8 h-8 flex items-center justify-center rounded-md"
              style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <span className="text-[19px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            my<span style={{ color: "#AEDD00" }}>Finance</span>
          </span>

          <div className="flex-1 flex items-center justify-end gap-2">
            <div ref={mobileMenuRef} className="relative">
              <button
                onClick={handleAvatarClick}
                className="shrink-0 flex items-center justify-center rounded-full overflow-hidden"
                style={{ width: 30, height: 30, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : user ? (
                  <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3F3F46", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                    {initials}
                  </span>
                ) : (
                  <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
                    <PersonIcon />
                  </span>
                )}
              </button>
              {showUserMenu && user && (
                <UserDropdown user={user} isDark={isDark} onSignOut={handleSignOut} onDonate={() => { setShowUserMenu(false); setShowDonate(true); }} onClose={() => setShowUserMenu(false)} />
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop top bar ── */}
        <div className="hidden md:flex flex-1">
          <span className="text-[19px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            my<span style={{ color: "#AEDD00" }}>Finance</span>
          </span>
        </div>

        {/* Nav — center */}
        <div
          ref={desktopNavRef}
          className="hidden lg:flex items-center gap-0.5 p-[3px] rounded-lg relative"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
            border: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`,
          }}
        >
          {desktopPill && (
            <span
              aria-hidden
              className="absolute rounded-md pointer-events-none"
              style={{
                left: desktopPill.left,
                top: desktopPill.top,
                width: desktopPill.width,
                height: desktopPill.height,
                background: isDark ? "rgba(255,255,255,0.12)" : "#ffffff",
                boxShadow: isDark
                  ? "0 1px 4px rgba(0,0,0,0.4)"
                  : "0 1px 3px rgba(0,0,0,0.10), 0 1px 1px rgba(0,0,0,0.04)",
                transition: desktopPillReady
                  ? "left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)"
                  : "none",
              }}
            />
          )}

          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => { desktopBtnRefs.current[idx] = el; }}
                onClick={() => router.push(item.id === "portfolio" ? "/" : `/${item.id}`)}
                className="relative z-10 px-3 py-1.5 rounded-md text-[13px] font-medium"
                style={{
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  transition: "color 200ms ease",
                  letterSpacing: "-0.005em",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right icons (desktop) */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={toggle}
            className="icon-btn w-8 h-8 flex items-center justify-center rounded-md"
            style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            onClick={() => setShowDonate(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold"
            style={{
              color: "#E11D48",
              background: "rgba(225,29,72,0.07)",
              border: "1px solid rgba(225,29,72,0.18)",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(225,29,72,0.12)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(225,29,72,0.07)")}
          >
            <HeartIcon />
            Donate
          </button>

          <div ref={desktopMenuRef} className="relative ml-0.5">
            <button
              onClick={handleAvatarClick}
              className="shrink-0 flex items-center justify-center rounded-full overflow-hidden"
              style={{ width: 30, height: 30, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : user ? (
                <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3F3F46", color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
                  {initials}
                </span>
              ) : (
                <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
                  <PersonIcon />
                </span>
              )}
            </button>
            {showUserMenu && user && (
              <UserDropdown user={user} isDark={isDark} onSignOut={handleSignOut} onDonate={() => { setShowUserMenu(false); setShowDonate(true); }} onClose={() => setShowUserMenu(false)} />
            )}
          </div>
        </div>
      </nav>

      <DonateModal open={showDonate} onClose={() => setShowDonate(false)} />

      {/* ── Floating bottom nav (mobile only) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end lg:hidden pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        <div
          ref={bottomNavRef}
          className="flex items-center gap-0.5 p-[3px] pointer-events-auto relative"
          style={{
            borderRadius: 28,
            background: isDark ? "rgba(18,18,20,0.94)" : "rgba(255,255,255,0.94)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${isDark ? "#27272A" : "#E2E8F0"}`,
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)"
              : "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          {bottomPill && (
            <span
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                borderRadius: 24,
                left: bottomPill.left,
                top: bottomPill.top,
                width: bottomPill.width,
                height: bottomPill.height,
                background: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.12)"
                  : "inset 0 1px 0 rgba(255,255,255,0.8)",
                transition: bottomPillReady
                  ? "left 300ms cubic-bezier(0.4,0,0.2,1), width 300ms cubic-bezier(0.4,0,0.2,1)"
                  : "none",
              }}
            />
          )}

          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeTab === item.id;
            const activeColor   = isDark ? "#FAFAFA" : "#0F172A";
            const inactiveColor = isDark ? "#71717A" : "#94A3B8";
            return (
              <button
                key={item.id}
                ref={(el) => { bottomBtnRefs.current[idx] = el; }}
                onClick={() => router.push(item.id === "portfolio" ? "/" : `/${item.id}`)}
                className={`relative z-10 flex flex-col items-center gap-[3px] px-[18px] py-[5px] active:scale-95${item.id === "stocks" ? " hidden" : ""}`}
                style={{
                  borderRadius: 24,
                  transition: "transform 120ms ease",
                }}
              >
                <span style={{ color: isActive ? activeColor : inactiveColor, transition: "color 200ms ease" }}>
                  {NAV_ICONS[item.id]}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? activeColor : inactiveColor, transition: "color 200ms ease", letterSpacing: "-0.01em" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
