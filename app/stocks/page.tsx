"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

function ComingSoonIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export default function StocksPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6">
        <div
          className="w-full max-w-sm rounded-[28px] p-10 flex flex-col items-center gap-5 text-center"
          style={{
            background: isDark ? "rgba(28,28,30,1)" : "#ffffff",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            boxShadow: isDark
              ? "0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.5)"
              : "0 2px 12px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.08)",
          }}
        >
          <span style={{ color: "#AEDD00" }}>
            <ComingSoonIcon />
          </span>

          <div>
            <h1
              className="text-[22px] font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Stocks
            </h1>
            <p
              className="text-[14px] mt-2 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              This feature is being developed.
              <br />
              Check back soon.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="mt-1 text-[13px] font-semibold transition-opacity active:opacity-60"
            style={{ color: "#007aff" }}
          >
            ← Back to Portfolio
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
