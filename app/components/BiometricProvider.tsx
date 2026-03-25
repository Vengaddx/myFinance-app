"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  bioAvailable,
  bioEnabled,
  bioPrompted,
  isFreshLogin,
  isUnlocked,
  clearFreshLogin,
  markUnlocked,
  markLocked,
  markPrompted,
  registerBio,
  authenticateBio,
  disableBio,
  getBioType,
  getBioLabel,
  storedBioUser,
  type BioType,
} from "@/lib/biometric";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconFaceId({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="36" height="36" rx="9" />
      <line x1="13" y1="2" x2="13" y2="7" />
      <line x1="27" y1="2" x2="27" y2="7" />
      <line x1="13" y1="33" x2="13" y2="38" />
      <line x1="27" y1="33" x2="27" y2="38" />
      <line x1="2" y1="13" x2="7" y2="13" />
      <line x1="2" y1="27" x2="7" y2="27" />
      <line x1="33" y1="13" x2="38" y2="13" />
      <line x1="33" y1="27" x2="38" y2="27" />
      <circle cx="14.5" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="25.5" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M14 24 Q20 28 26 24" strokeWidth="1.8" fill="none" />
      <line x1="20" y1="17" x2="20" y2="22" />
    </svg>
  );
}

function IconFingerprint({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 8.5C15.8 7.5 17.8 7 20 7c6.6 0 12 5.4 12 12" />
      <path d="M7 17.5C7.2 11.4 13 7 20 7" />
      <path d="M20 13c3.9 0 7 3.1 7 7 0 5-2 9-3.5 11" />
      <path d="M13 20c0-3.9 3.1-7 7-7" />
      <path d="M20 17c1.7 0 3 1.3 3 3 0 3.5-1.3 7-2.5 9.5" />
      <path d="M17 20c0-1.7 1.3-3 3-3" />
      <path d="M20 23c0 3-1 6-2 8" />
      <path d="M9 27c.5-2 .8-4.5.8-7" />
      <path d="M10 20c0-5.5 4.5-10 10-10s10 4.5 10 10c0 1-.1 2-.3 3" />
    </svg>
  );
}

function IconTouchId({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="20" cy="20" r="13" />
      <circle cx="20" cy="20" r="8" />
      <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" />
      <path d="M20 7V4M20 36v-3M7 20H4M36 20h-3" />
    </svg>
  );
}

function BioIcon({ type, size = 40 }: { type: BioType; size?: number }) {
  if (type === "faceid") return <IconFaceId size={size} />;
  if (type === "fingerprint") return <IconFingerprint size={size} />;
  return <IconTouchId size={size} />;
}

// ─── Setup Modal (bottom sheet) ───────────────────────────────────────────────

interface SetupProps {
  bioType: BioType;
  onEnable: () => void;
  onSkip: () => void;
}

function BiometricSetupModal({ bioType, onEnable, onSkip }: SetupProps) {
  const label = getBioLabel(bioType);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "none",
        WebkitBackdropFilter: visible ? "blur(8px)" : "none",
        transition: "background 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "28px 28px 0 0",
          padding: "32px 28px calc(env(safe-area-inset-bottom) + 28px)",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 -4px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 420ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--separator)", marginBottom: 28 }} />

        {/* Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: "rgba(0,122,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#007aff",
            marginBottom: 20,
          }}
        >
          <BioIcon type={bioType} size={42} />
        </div>

        {/* Title */}
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
          Enable {label}
        </h2>

        {/* Subtitle */}
        <p style={{ margin: "10px 0 0", fontSize: 15, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.5 }}>
          Use {label} to quickly and securely sign in to myFinance next time you open the app.
        </p>

        {/* Buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 32 }}>
          <button
            onClick={onEnable}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 16,
              background: "#007aff",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(0,122,255,0.35)",
            }}
          >
            Enable {label}
          </button>
          <button
            onClick={onSkip}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 16,
              background: "var(--surface-secondary)",
              border: "1px solid var(--separator)",
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lock Screen ──────────────────────────────────────────────────────────────

interface LockProps {
  bioType: BioType;
  onUnlocked: () => void;
}

function BiometricLockScreen({ bioType, onUnlocked }: LockProps) {
  const label = getBioLabel(bioType);
  const bioUser = storedBioUser();
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasAutoTriggered = useRef(false);

  async function tryAuth() {
    if (authenticating) return;
    setAuthenticating(true);
    setFailed(false);
    const ok = await authenticateBio();
    setAuthenticating(false);
    if (ok) {
      onUnlocked();
    } else {
      setFailed(true);
    }
  }

  // Auto-trigger on mount
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    const t = setTimeout(() => tryAuth(), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initials from stored user
  const initials = bioUser
    ? (bioUser.name || bioUser.email)
        .split(/[\s@]+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  function handleSignOut() {
    disableBio();
    // Reload to go back to login
    window.location.href = "/login";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 0,
        animation: "bio-fade-in 250ms ease both",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #007aff 0%, #5856d6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.5px",
          marginBottom: 16,
          boxShadow: "0 4px 24px rgba(0,122,255,0.3)",
        }}
      >
        {initials}
      </div>

      {/* Name / email */}
      {bioUser && (
        <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
          {bioUser.name || bioUser.email}
        </p>
      )}
      <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
        myFinance
      </p>

      {/* Bio button */}
      <button
        onClick={tryAuth}
        disabled={authenticating}
        style={{
          marginTop: 48,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: authenticating ? "rgba(0,122,255,0.15)" : "rgba(0,122,255,0.12)",
          border: `2px solid ${authenticating ? "rgba(0,122,255,0.4)" : "rgba(0,122,255,0.25)"}`,
          color: "#007aff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: authenticating ? "default" : "pointer",
          transition: "all 200ms ease",
          animation: authenticating ? "bio-pulse 1s ease-in-out infinite" : "none",
        }}
      >
        <BioIcon type={bioType} size={32} />
      </button>

      <p style={{ margin: "14px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
        {authenticating ? `Waiting for ${label}…` : failed ? `${label} not recognized` : `Sign in with ${label}`}
      </p>

      {failed && (
        <button
          onClick={tryAuth}
          style={{
            marginTop: 12,
            padding: "8px 20px",
            borderRadius: 20,
            background: "#007aff",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try Again
        </button>
      )}

      {/* Use different account */}
      <button
        onClick={handleSignOut}
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom) + 32px)",
          background: "none",
          border: "none",
          color: "var(--text-tertiary, var(--text-secondary))",
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
          padding: "8px 16px",
        }}
      >
        Use a different account
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const IDLE_MS = 60_000; // 60 seconds

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export default function BiometricProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [ready, setReady] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [bioType, setBioType] = useState<BioType>("biometric");

  // Idle-lock refs — avoid stale closures in event listeners
  const showLockRef   = useRef(false);
  const showSetupRef  = useRef(false);
  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity  = useRef(Date.now());

  // Keep refs in sync with state
  useEffect(() => { showLockRef.current  = showLock;  }, [showLock]);
  useEffect(() => { showSetupRef.current = showSetup; }, [showSetup]);

  useEffect(() => {
    if (!user) {
      // Not logged in — nothing to do
      setShowSetup(false);
      setShowLock(false);
      setReady(true);
      return;
    }

    async function init() {
      const available = await bioAvailable();

      if (bioEnabled()) {
        // Already enrolled — show lock screen unless already unlocked this session
        if (!isUnlocked()) {
          setBioType(getBioType());
          setShowLock(true);
        }
        setReady(true);
        return;
      }

      // Not enrolled yet
      if (available && isFreshLogin() && !bioPrompted()) {
        // First login after enrolling — ask to enable
        clearFreshLogin();
        setBioType(getBioType());
        setShowSetup(true);
      } else {
        clearFreshLogin();
      }

      setReady(true);
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Idle-lock effect (mobile only) ──────────────────────────────────────────
  useEffect(() => {
    if (!user || !isMobileDevice()) return;

    function lock() {
      if (!bioEnabled() || showLockRef.current || showSetupRef.current) return;
      markLocked();
      setBioType(getBioType());
      setShowLock(true);
    }

    function scheduleIdle() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, IDLE_MS);
    }

    function onActivity() {
      lastActivity.current = Date.now();
      scheduleIdle();
    }

    function onVisibility() {
      if (document.hidden) return;
      // Always lock when app comes to foreground — matches native iOS/Android behaviour
      lock();
    }

    const events = ["touchstart", "touchmove", "mousedown", "keydown", "scroll"] as const;
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    scheduleIdle(); // start the clock

    return () => {
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleEnable() {
    if (!user) return;
    markPrompted();
    const name = (user.user_metadata?.full_name as string | undefined) ?? "";
    const ok = await registerBio(user.id, user.email ?? "", name);
    if (ok) {
      markUnlocked();
    }
    setShowSetup(false);
  }

  function handleSkip() {
    markPrompted();
    setShowSetup(false);
  }

  function handleUnlocked() {
    markUnlocked();
    setShowLock(false);
    // Reset idle clock so the 60s starts fresh after each unlock
    lastActivity.current = Date.now();
  }

  return (
    <>
      <div
        style={{
          filter: showLock ? "blur(20px) brightness(0.7)" : "none",
          transition: "filter 300ms ease",
          minHeight: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>

      {showSetup && ready && (
        <BiometricSetupModal
          bioType={bioType}
          onEnable={handleEnable}
          onSkip={handleSkip}
        />
      )}

      {showLock && ready && (
        <BiometricLockScreen
          bioType={bioType}
          onUnlocked={handleUnlocked}
        />
      )}
    </>
  );
}
