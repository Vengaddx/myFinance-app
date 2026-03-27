"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Module-level flag prevents React StrictMode double-execution.
// PKCE codes are single-use — the second call consumes an already-cleared verifier.
let exchanging = false;

export default function AuthCallbackPage() {
  useEffect(() => {
    if (exchanging) return;
    exchanging = true;

    // Read directly from window.location — avoids useSearchParams() Suspense issues
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    const status = document.getElementById("cb-status");
    const show = (msg: string) => { if (status) status.textContent = msg; };

    if (code) {
      show(`code: ${code.slice(0, 8)}… — exchanging`);

      const timeout = setTimeout(() => {
        show("TIMEOUT — Supabase did not respond after 15s");
      }, 15000);

      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          clearTimeout(timeout);
          if (error) {
            show(`ERROR: ${error.message}`);
            setTimeout(() => window.location.replace("/login?error=auth_failed"), 3000);
          } else {
            show("Success — redirecting…");
            try { sessionStorage.setItem("mf_fresh_login", "1"); } catch { /* */ }
            window.location.replace("/");
          }
        })
        .catch((e: unknown) => {
          clearTimeout(timeout);
          show(`CATCH: ${String(e)}`);
        });
    } else {
      // No code in URL — might be hash-based implicit flow
      show("no code in URL — checking session…");
      supabase.auth.getSession().then(({ data: { session } }) => {
        try { if (session) sessionStorage.setItem("mf_fresh_login", "1"); } catch { /* */ }
        window.location.replace(session ? "/" : "/login");
      });
    }
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
      <p id="cb-status" style={{ fontSize: 12, color: "#888", marginTop: 8, fontFamily: "monospace" }} />
    </div>
  );
}
