"use client";

// Color palette for account badges — index matches order accounts were added
const ACCOUNT_BADGE_COLORS = [
  { bg: "rgba(174,221,0,0.12)", color: "#5a7a00", border: "rgba(174,221,0,0.26)" }, // green — primary
  { bg: "rgba(0,122,255,0.10)", color: "#007aff", border: "rgba(0,122,255,0.22)" }, // blue
  { bg: "rgba(175,82,222,0.10)", color: "#af52de", border: "rgba(175,82,222,0.22)" }, // purple
  { bg: "rgba(255,149,0,0.10)", color: "#ff9500", border: "rgba(255,149,0,0.22)" }, // orange
];

export default function PortfolioActions({ accounts }: { accounts: string[] }) {
  return (
    <div className="flex flex-col items-end gap-2">
      {accounts.map((label, i) => {
        const palette = ACCOUNT_BADGE_COLORS[i % ACCOUNT_BADGE_COLORS.length];
        return (
          <div key={label} className="flex items-center gap-2">
            {/* Account label badge */}
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
            >
              {label}
            </span>

            {/* Sync */}
            <form method="POST" action="/api/kite/sync">
              <input type="hidden" name="label" value={label} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(180deg, #d8f36d 0%, #aedd00 100%)",
                  color: "#111111",
                  boxShadow: "0 8px 20px rgba(174,221,0,0.20)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Sync
              </button>
            </form>

            {/* Disconnect */}
            <form method="POST" action="/api/kite/disconnect">
              <input type="hidden" name="label" value={label} />
              <button
                type="submit"
                className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                style={{
                  background: "var(--surface-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--separator-subtle)",
                }}
              >
                Disconnect
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
