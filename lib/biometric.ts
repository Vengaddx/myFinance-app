// WebAuthn-based biometric authentication utilities
// Works with Face ID (iOS), Touch ID (iPad/Mac), and Fingerprint (Android)

// ─── Storage keys ─────────────────────────────────────────────────────────────

const K = {
  ENABLED:  "mf_bio_on",
  CRED_ID:  "mf_bio_cred",
  USER:     "mf_bio_user",
  PROMPTED: "mf_bio_prompted",
} as const;

const S = {
  FRESH:    "mf_fresh_login",
  UNLOCKED: "mf_unlocked",
} as const;

function ls(fn: () => void) { try { fn(); } catch { /* SSR / private mode */ } }
function lsg(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function ssg(key: string): string | null { try { return sessionStorage.getItem(key); } catch { return null; } }

// ─── Capability ───────────────────────────────────────────────────────────────

export async function bioAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ─── State helpers ────────────────────────────────────────────────────────────

export const bioEnabled   = () => lsg(K.ENABLED)  === "1";
export const bioPrompted  = () => lsg(K.PROMPTED) === "1";
export const isFreshLogin = () => ssg(S.FRESH)    === "1";
export const isUnlocked   = () => ssg(S.UNLOCKED) === "1";

export function clearFreshLogin() { try { sessionStorage.removeItem(S.FRESH); } catch { /* */ } }
export function markUnlocked()    { try { sessionStorage.setItem(S.UNLOCKED, "1"); } catch { /* */ } }
export function markLocked()      { try { sessionStorage.removeItem(S.UNLOCKED);      } catch { /* */ } }
export function markPrompted()    { ls(() => localStorage.setItem(K.PROMPTED, "1")); }

export function storedBioUser(): { email: string; name: string } | null {
  const raw = lsg(K.USER);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function disableBio() {
  ls(() => {
    localStorage.removeItem(K.ENABLED);
    localStorage.removeItem(K.CRED_ID);
    localStorage.removeItem(K.USER);
  });
}

// ─── Device type ──────────────────────────────────────────────────────────────

export type BioType = "faceid" | "touchid" | "fingerprint" | "biometric";

export function getBioType(): BioType {
  if (typeof navigator === "undefined") return "biometric";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "faceid";
  if (/iPad/i.test(ua)) return "touchid";
  if (/Android/i.test(ua)) return "fingerprint";
  return "biometric";
}

export const getBioLabel = (t: BioType) =>
  ({ faceid: "Face ID", touchid: "Touch ID", fingerprint: "Fingerprint", biometric: "Biometric" }[t]);

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""));
}
function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerBio(
  userId: string,
  email: string,
  name: string
): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "myFinance", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: name || email,
        },
        pubKeyCredParams: [
          { alg: -7,   type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;

    if (!cred) return false;

    ls(() => {
      localStorage.setItem(K.ENABLED, "1");
      localStorage.setItem(K.CRED_ID, bufToB64(cred.rawId));
      localStorage.setItem(K.USER, JSON.stringify({ email, name }));
    });
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateBio(): Promise<boolean> {
  const credId = lsg(K.CRED_ID);
  if (!credId) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        userVerification: "required",
        timeout: 60_000,
        allowCredentials: [
          { type: "public-key", id: b64ToBuf(credId), transports: ["internal"] },
        ],
      },
    });
    if (assertion) { markUnlocked(); return true; }
    return false;
  } catch {
    return false;
  }
}
