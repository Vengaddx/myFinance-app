"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

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

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");

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


  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b flex items-center px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(50px + env(safe-area-inset-top))",
          background: scrolled ? "rgba(30,30,32,0.82)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          borderColor: scrolled ? "rgba(255,255,255,0.08)" : "transparent",
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
            Mah<span style={{ color: "#AEDD00" }}>fin</span>
          </span>

          {/* Right: avatar */}
          <div className="flex-1 flex items-center justify-end">
            <div
              className="cursor-pointer shrink-0"
              style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
            >
              <img
                src="/avatar.jpg"
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
              />
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
            Mah<span style={{ color: "#AEDD00" }}>fin</span>
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
                onClick={() => setActiveTab(item.id)}
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

          <div
            className="ml-0.5 cursor-pointer shrink-0"
            style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
          >
            <img
              src="/avatar.jpg"
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
          </div>
        </div>
      </nav>

      {/* ── Floating bottom nav (mobile only) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center items-end gap-3 lg:hidden pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        {/* Glass style shared between nav pill and add button */}

        {/* Nav pill */}
        <div
          ref={bottomNavRef}
          className="flex items-center gap-0.5 p-[5px] pointer-events-auto relative"
          style={{
            borderRadius: 36,
            background: isDark
              ? "rgba(22, 22, 26, 0.62)"
              : "rgba(255, 255, 255, 0.58)",
            backdropFilter: "blur(48px) saturate(220%) brightness(1.08)",
            WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(1.08)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.13)"
              : "1px solid rgba(255,255,255,0.78)",
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.45), 0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.16)"
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
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(0,0,0,0.09)",
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 10px rgba(0,0,0,0.25)"
                  : "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.1)",
                transition: bottomPillReady
                  ? "left 380ms cubic-bezier(0.34,1.2,0.64,1), width 380ms cubic-bezier(0.34,1.2,0.64,1)"
                  : "none",
              }}
            />
          )}

          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeTab === item.id;
            const activeColor  = isDark ? "#ffffff" : "#1d1d1f";
            const inactiveColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(60,60,67,0.4)";
            return (
              <button
                key={item.id}
                ref={(el) => { bottomBtnRefs.current[idx] = el; }}
                onClick={() => setActiveTab(item.id)}
                className="relative z-10 flex flex-col items-center gap-[3px] px-[18px] py-2 active:scale-95"
                style={{
                  borderRadius: 28,
                  transition: "transform 140ms cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                <span style={{
                  color: isActive ? activeColor : inactiveColor,
                  transition: "color 260ms ease",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition2: "transform 260ms cubic-bezier(0.34,1.3,0.64,1)",
                } as React.CSSProperties}>
                  {NAV_ICONS[item.id]}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    color: isActive ? activeColor : inactiveColor,
                    transition: "color 260ms ease",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add button — same glass material, blue accent */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("mahfin:open-add"))}
          className="pointer-events-auto flex flex-col items-center gap-[3px] px-[18px] py-2 active:scale-95"
          style={{
            borderRadius: 36,
            background: isDark
              ? "rgba(22, 22, 26, 0.62)"
              : "rgba(255, 255, 255, 0.58)",
            backdropFilter: "blur(48px) saturate(220%) brightness(1.08)",
            WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(1.08)",
            border: isDark
              ? "1px solid rgba(0,122,255,0.28)"
              : "1px solid rgba(0,122,255,0.2)",
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.45), 0 3px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.16)"
              : "0 12px 40px rgba(0,0,0,0.12), 0 3px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
            transition: "transform 140ms cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 140ms ease",
          }}
        >
          <span style={{ color: "#007aff" }}><PlusIcon /></span>
          <span className="text-[10px] font-semibold" style={{ color: "#007aff", letterSpacing: "-0.01em" }}>Add</span>
        </button>

      </div>
    </>
  );
}
