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
];

function PortfolioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}

function StocksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function GoalsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}



function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
      className="absolute right-0 top-full mt-2 w-52 rounded-[16px] overflow-hidden z-[60]"
      style={{
        background: isDark ? "rgba(28,28,30,0.98)" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark
          ? "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--separator)" }}
      >
        {name && (
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {name}
          </p>
        )}
        <p
          className="text-[11px] truncate"
          style={{ color: "var(--text-tertiary)", marginTop: name ? 2 : 0 }}
        >
          {user.email}
        </p>
      </div>
      <Link
        href="/settings"
        onClick={onClose}
        className="w-full text-left px-4 py-3 text-[13px] font-medium transition-opacity active:opacity-60 flex items-center gap-2"
        style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--separator)", display: "flex" }}
      >
        <SettingsIcon />
        Settings
      </Link>
      <button
        onClick={onDonate}
        className="w-full text-left px-4 py-3 text-[13px] font-medium transition-opacity active:opacity-60 flex items-center gap-2"
        style={{ color: "#ff2d55", borderBottom: "1px solid var(--separator)" }}
      >
        <HeartIcon />
        Donate
      </button>
      <button
        onClick={onSignOut}
        className="w-full text-left px-4 py-3 text-[13px] font-medium transition-opacity active:opacity-60"
        style={{ color: "#ff3b30" }}
      >
        Sign out
      </button>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  portfolio: <PortfolioIcon />,
  stocks:    <StocksIcon />,
  goals:     <GoalsIcon />,
};

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  const activeTab =
    pathname === "/stocks" ? "stocks" :
    pathname === "/goals"  ? "goals"  :
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
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu on outside click
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

  // Two-letter initials: first letter of first + last word (e.g. "Deesh R" → "DR")
  const initials = (() => {
    if (displayName) {
      const parts = displayName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    return (user?.email?.[0] ?? "?").toUpperCase();
  })();


  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b flex items-center px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(50px + env(safe-area-inset-top))",
          background: isDark
            ? "rgba(18,18,20,0.92)"
            : scrolled ? "rgba(28,28,32,0.78)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : scrolled ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
          transition: "background 350ms ease, border-color 350ms ease",
        }}
      >
        {/* ── Mobile top bar ── */}
        <div className="md:hidden flex items-center w-full">
          {/* Left: theme toggle */}
          <div className="flex-1 flex items-center">
            <button
              onClick={toggle}
              className="icon-btn w-8 h-8 flex items-center justify-center rounded-full"
              style={{
                color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)",
                background: scrolled ? "rgba(255,255,255,0.12)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(60,60,67,0.06)"),
                transition: "color 400ms ease, background 400ms ease",
              }}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* Center: wordmark */}
          <span
            className="text-[21.5px] font-extrabold tracking-tight"
            style={{ color: scrolled ? "#ffffff" : "var(--text-primary)", transition: "color 400ms ease" }}
          >
            my<span style={{ color: "#AEDD00" }}>Finance</span>
          </span>

          {/* Right: donate + avatar / login */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowDonate(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold active:scale-95"
              style={{
                color: "#ff2d55",
                background: scrolled ? "rgba(255,45,85,0.22)" : "rgba(255,45,85,0.10)",
                border: "1px solid rgba(255,45,85,0.22)",
                transition: "background 300ms ease",
              }}
            >
              <HeartIcon />
              Donate
            </button>
            <div ref={mobileMenuRef} className="relative">
              <button
                onClick={handleAvatarClick}
                className="shrink-0 flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : user ? (
                  <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #636366 0%, #48484A 100%)", color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                    {initials}
                  </span>
                ) : (
                  <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(60,60,67,0.08)", color: "var(--text-tertiary)" }}>
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
        {/* Logo — left */}
        <div className="hidden md:flex flex-1">
          <span
            className="text-[21.5px] font-extrabold tracking-tight"
            style={{ color: scrolled ? "#ffffff" : "var(--text-primary)", transition: "color 400ms ease" }}
          >
            my<span style={{ color: "#AEDD00" }}>Finance</span>
          </span>
        </div>

        {/* Nav items — center (desktop only) */}
        <div
          ref={desktopNavRef}
          className="hidden lg:flex items-center gap-0.5 p-1 rounded-[14px] relative"
          style={{
            background: scrolled
              ? "rgba(255,255,255,0.08)"
              : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: scrolled
              ? "1px solid rgba(255,255,255,0.1)"
              : (isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"),
            transition: "background 350ms ease, border-color 350ms ease",
          }}
        >
          {/* Sliding pill */}
          {desktopPill && (
            <span
              aria-hidden
              className="absolute rounded-[10px] pointer-events-none"
              style={{
                left: desktopPill.left,
                top: desktopPill.top,
                width: desktopPill.width,
                height: desktopPill.height,
                background: scrolled
                  ? "rgba(255,255,255,0.15)"
                  : (isDark ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.92)"),
                boxShadow: isDark || scrolled
                  ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 6px rgba(0,0,0,0.28)"
                  : "0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
                transition: desktopPillReady
                  ? "left 360ms cubic-bezier(0.34,1.2,0.64,1), width 360ms cubic-bezier(0.34,1.2,0.64,1), background 300ms ease"
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
                className="relative z-10 px-4 py-1.5 rounded-[10px] text-[14px]"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: isActive ? "-0.01em" : "0",
                  color: isActive
                    ? (scrolled ? "#ffffff" : "var(--text-primary)")
                    : (scrolled ? "rgba(255,255,255,0.45)" : "var(--text-tertiary)"),
                  transition: "color 280ms ease, font-weight 0ms",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right icons (desktop) */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-2 sm:gap-2.5">
          <button
            onClick={toggle}
            className="icon-btn w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)",
              background: scrolled ? "rgba(255,255,255,0.12)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(60,60,67,0.06)"),
              transition: "color 400ms ease, background 400ms ease",
            }}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            className="icon-btn w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)", transition: "color 400ms ease" }}
          >
            <SearchIcon />
          </button>

          <button
            className="icon-btn w-8 h-8 hidden sm:flex items-center justify-center rounded-full"
            style={{ color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)", transition: "color 400ms ease" }}
          >
            <BellIcon />
          </button>

          {/* Donate button (desktop) */}
          <button
            onClick={() => setShowDonate(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95"
            style={{
              color: "#ff2d55",
              background: scrolled ? "rgba(255,45,85,0.18)" : "rgba(255,45,85,0.10)",
              border: "1px solid rgba(255,45,85,0.22)",
              transition: "background 300ms ease, border-color 300ms ease",
            }}
          >
            <HeartIcon />
            Donate
          </button>

          <div ref={desktopMenuRef} className="relative ml-0.5">
            <button
              onClick={handleAvatarClick}
              className="shrink-0 flex items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : user ? (
                <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #636366 0%, #48484A 100%)", color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
                  {initials}
                </span>
              ) : (
                <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(255,255,255,0.1)" : "rgba(60,60,67,0.08)", color: "var(--text-tertiary)" }}>
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
        {/* Nav pill */}
        <div
          ref={bottomNavRef}
          className="flex items-center gap-0.5 p-[2px] pointer-events-auto relative"
          style={{
            borderRadius: 32,
            background: isDark
              ? "rgba(22, 22, 26, 0.44)"
              : "rgba(255, 255, 255, 0.46)",
            backdropFilter: "blur(52px) saturate(200%) brightness(1.06)",
            WebkitBackdropFilter: "blur(52px) saturate(200%) brightness(1.06)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.11)"
              : "1px solid rgba(255,255,255,0.78)",
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.45), 0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.14)"
              : "0 12px 40px rgba(0,0,0,0.12), 0 3px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          {/* Sliding active pill */}
          {bottomPill && (
            <span
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                borderRadius: 28,
                left: bottomPill.left,
                top: bottomPill.top,
                width: bottomPill.width,
                height: bottomPill.height,
                background: isDark
                  ? "rgba(255,255,255,0.13)"
                  : "rgba(0,0,0,0.08)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 10px rgba(0,0,0,0.25)"
                  : "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.1)",
                transition: bottomPillReady
                  ? "left 380ms cubic-bezier(0.34,1.2,0.64,1), width 380ms cubic-bezier(0.34,1.2,0.64,1)"
                  : "none",
              }}
            />
          )}

          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeTab === item.id;
            const activeColor   = isDark ? "#ffffff" : "#1d1d1f";
            const inactiveColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(60,60,67,0.4)";
            return (
              <button
                key={item.id}
                ref={(el) => { bottomBtnRefs.current[idx] = el; }}
                onClick={() => router.push(item.id === "portfolio" ? "/" : `/${item.id}`)}
                className="relative z-10 flex flex-col items-center gap-[3px] px-[22px] py-[4px] active:scale-95"
                style={{
                  borderRadius: 28,
                  transition: "transform 140ms cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                <span style={{ color: isActive ? activeColor : inactiveColor, transition: "color 260ms ease" }}>
                  {NAV_ICONS[item.id]}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? activeColor : inactiveColor, transition: "color 260ms ease", letterSpacing: "-0.01em" }}
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
