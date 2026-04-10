"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (!loading && session) {
      router.replace("/");
    }
  }, [session, loading, router]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // NEXT_PUBLIC_SITE_URL is baked in at build time from VERCEL_URL (on Vercel)
        // or NEXT_PUBLIC_SITE_URL in .env.local (local dev). See next.config.ts.
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
  };

  // Show blank while checking session to avoid login page flash
  if (loading) {
    return <div className="min-h-screen" />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
    >
      <div
        className="w-full max-w-sm rounded-[28px] p-8 flex flex-col items-center gap-6"
        style={{
          background: isDark ? "rgba(28,28,30,1)" : "#ffffff",
          border: isDark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(0,0,0,0.06)",
          boxShadow: isDark
            ? "0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.5)"
            : "0 2px 12px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.08)",
        }}
      >
        {/* Wordmark */}
        <div className="text-center">
          <h1
            className="text-[34px] font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            my<span style={{ color: "#AEDD00" }}>Finance</span>
          </h1>
          <p
            className="text-[14px] mt-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Personal Finance Tracker
          </p>
        </div>

        <div
          className="w-full h-px"
          style={{ background: "var(--separator)" }}
        />

        <div className="w-full flex flex-col gap-3">
          <p
            className="text-[13px] text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sign in to continue
          </p>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-[14px] text-[15px] font-semibold transition-opacity active:opacity-70"
            style={{
              background: isDark ? "rgba(255,255,255,0.07)" : "#ffffff",
              border: isDark
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid rgba(0,0,0,0.1)",
              color: "var(--text-primary)",
              boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.07)",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p
          className="text-[11.5px] text-center leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          Your financial data stays private to you.
        </p>
      </div>
    </div>
  );
}
