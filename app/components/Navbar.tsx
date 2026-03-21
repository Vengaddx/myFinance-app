"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

const NAV_ITEMS = [
  { label: "Dashboard" },
  { label: "Investments", active: true },
  { label: "Holdings" },
  { label: "Markets" },
  { label: "Transfers" },
];

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

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[50px]"
      style={{
        background: scrolled ? "rgba(30,30,32,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
        borderColor: scrolled ? "rgba(255,255,255,0.08)" : "transparent",
        transition: "background 350ms ease, border-color 350ms ease, backdrop-filter 350ms ease",
      }}
    >
      {/* Left: logo + nav */}
      <div className="flex items-center gap-6 lg:gap-8">
        <span className="text-[20.5px] font-extrabold tracking-tight" style={{ color: scrolled ? "#ffffff" : "var(--text-primary)", transition: "color 400ms ease" }}>
          Mah<span style={{ color: "#AEDD00" }}>fin</span>
        </span>

        <div className="hidden md:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              data-active={item.active ? "true" : undefined}
              className="nav-link relative px-3 lg:px-3.5 py-1.5 text-[13px] rounded-md"
              style={{
                color: item.active
                  ? (scrolled ? "#ffffff" : "var(--text-primary)")
                  : (scrolled ? "rgba(255,255,255,0.6)" : "var(--text-secondary)"),
                fontWeight: item.active ? 500 : 400,
                transition: "color 400ms ease",
              }}
            >
              {item.label}
              {item.active && (
                <span
                  className="absolute bottom-0 left-3 lg:left-3.5 right-3 lg:right-3.5 h-[1.5px] rounded-full"
                  style={{ background: scrolled ? "#ffffff" : "var(--text-primary)", transition: "background 400ms ease" }}
                />
              )}
            </a>
          ))}
        </div>
      </div>

      {/* Right: theme toggle + icons + avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Theme toggle */}
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

        <button className="icon-btn w-8 h-8 flex items-center justify-center rounded-full" style={{ color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)", transition: "color 400ms ease" }}>
          <SearchIcon />
        </button>
        <button className="icon-btn w-8 h-8 hidden sm:flex items-center justify-center rounded-full" style={{ color: scrolled ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)", transition: "color 400ms ease" }}>
          <BellIcon />
        </button>
        <div
          className="ml-0.5 cursor-pointer shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          <img
            src="/avatar.jpg"
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
          />
        </div>
      </div>
    </nav>
  );
}
