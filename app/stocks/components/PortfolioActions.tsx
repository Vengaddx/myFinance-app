"use client";

import { useRef } from "react";

function readSupabaseAccessToken() {
  const jar: Record<string, string> = {};

  document.cookie.split(";").forEach((cookie) => {
    const index = cookie.indexOf("=");
    if (index > -1) {
      jar[cookie.slice(0, index).trim()] = cookie.slice(index + 1).trim();
    }
  });

  for (const name in jar) {
    if (name.includes("-auth-token") && !name.includes("code-verifier")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(jar[name]));
        if (parsed.access_token) return parsed.access_token as string;
      } catch {
        // Ignore malformed auth cookies and continue checking fallbacks.
      }
    }
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.includes("auth-token")) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "{}");
        if (parsed.access_token) return parsed.access_token as string;
      } catch {
        // Ignore malformed localStorage entries and continue.
      }
    }
  }

  return "";
}

export default function PortfolioActions() {
  const syncFormRef = useRef<HTMLFormElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const handleSync = () => {
    if (tokenInputRef.current) {
      tokenInputRef.current.value = readSupabaseAccessToken();
    }
    syncFormRef.current?.requestSubmit();
  };

  return (
    <div className="flex items-center gap-2">
      <form ref={syncFormRef} method="POST" action="/api/kite/sync">
        <input ref={tokenInputRef} type="hidden" name="sb_token" />
        <button
          type="button"
          onClick={handleSync}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(180deg, #d8f36d 0%, #aedd00 100%)",
            color: "#111111",
            boxShadow: "0 10px 24px rgba(174,221,0,0.22)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Sync
        </button>
      </form>

      <form method="POST" action="/api/kite/disconnect">
        <button
          type="submit"
          className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200 hover:text-[var(--text-primary)]"
          style={{
            background: "rgba(255,255,255,0.72)",
            color: "var(--text-secondary)",
            border: "1px solid rgba(120,120,128,0.16)",
            boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            backdropFilter: "blur(14px)",
          }}
        >
          Disconnect
        </button>
      </form>
    </div>
  );
}
