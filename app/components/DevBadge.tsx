// Server component — reads env vars at build/request time, never sent to client bundle.
// Renders null in production so it is completely absent from the DOM.

const isProd =
  process.env.VERCEL_ENV === "production" ||
  (process.env.VERCEL_ENV === undefined && process.env.NODE_ENV === "production");

export default function DevBadge() {
  if (isProd) return null;

  const label = process.env.VERCEL_ENV === "preview" ? "PREVIEW" : "DEV";

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 6,
        background: "rgba(10, 10, 12, 0.72)",
        border: "1px solid rgba(174, 221, 0, 0.28)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.30)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#AEDD00",
          flexShrink: 0,
          boxShadow: "0 0 4px rgba(174,221,0,0.6)",
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#AEDD00",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}
