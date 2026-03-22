"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const iconColor = (active: boolean, forTopNav = false) => {
    if (forTopNav) {
      return active
        ? (scrolled ? "#ffffff" : "var(--text-primary)")
        : (scrolled ? "rgba(255,255,255,0.55)" : "var(--text-secondary)");
    }
    return active
      ? (isDark ? "#ffffff" : "#1d1d1f")
      : (isDark ? "rgba(255,255,255,0.4)" : "rgba(60,60,67,0.45)");
  };

  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b flex items-center px-4 sm:px-6 lg:px-8 h-[50px]"
        style={{
          background: scrolled ? "rgba(30,30,32,0.82)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          borderColor: scrolled ? "rgba(255,255,255,0.08)" : "transparent",
          transition: "background 350ms ease, border-color 350ms ease",
        }}
      >
        {/* Logo — left */}
        <div className="flex-1">
          <span
            className="text-[21.5px] font-extrabold tracking-tight"
            style={{ color: scrolled ? "#ffffff" : "var(--text-primary)", transition: "color 400ms ease" }}
          >
            Mah<span style={{ color: "#AEDD00" }}>fin</span>
          </span>
        </div>

        {/* Nav items — center (desktop only) */}
        <div className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative px-3.5 py-1.5 text-[14px] rounded-md"
                style={{
                  color: iconColor(isActive, true),
                  fontWeight: isActive ? 500 : 400,
                  transition: "color 300ms ease",
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3.5 right-3.5 h-[1.5px] rounded-full"
                    style={{
                      background: scrolled ? "#ffffff" : "var(--text-primary)",
                      transition: "background 400ms ease",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right icons */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-2.5">
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

      {/* ── Floating bottom nav (mobile + tablet) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 lg:hidden pointer-events-none">
        <div
          className="flex items-center gap-0.5 p-1 pointer-events-auto"
          style={{
            borderRadius: 28,
            background: isDark
              ? "rgba(20,20,22,0.55)"
              : "rgba(255,255,255,0.52)",
            backdropFilter: "blur(60px) saturate(240%) brightness(1.08)",
            WebkitBackdropFilter: "blur(60px) saturate(240%) brightness(1.08)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(255,255,255,0.85)",
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.07) inset, 0 -1px 0 rgba(0,0,0,0.2) inset"
              : "0 8px 32px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,1) inset",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center gap-[2px] px-5 py-1.5 rounded-[20px] transition-all duration-200"
                style={{
                  background: isActive
                    ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
                    : "transparent",
                  boxShadow: isActive
                    ? (isDark
                        ? "inset 0 1px 0 rgba(255,255,255,0.12)"
                        : "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.06)")
                    : "none",
                }}
              >
                <span style={{ color: iconColor(isActive), transition: "color 200ms ease" }}>
                  {NAV_ICONS[item.id]}
                </span>
                <span
                  className="text-[10.5px] font-semibold"
                  style={{ color: iconColor(isActive), transition: "color 200ms ease", letterSpacing: "-0.01em" }}
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
