"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? "/login?error=auth_failed" : "/");
      });
    } else {
      // No code — maybe a hash-based flow, just go home and let onAuthStateChange handle it
      router.replace("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: "#007aff", borderTopColor: "transparent" }}
      />
      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
        Signing you in…
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ background: "var(--bg)" }} />
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
