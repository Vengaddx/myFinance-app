import type { CSSProperties } from "react";

function LoadingBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-[24px] ${className ?? ""}`}
      style={{
        backgroundColor: "var(--surface-secondary)",
        border: "1px solid var(--separator-subtle)",
        ...style,
      }}
    />
  );
}

export default function Loading() {
  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{
        background: "var(--bg)",
        paddingTop: "calc(68px + env(safe-area-inset-top))",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        {/* Hero */}
        <LoadingBlock className="w-full" style={{ height: 260 }} />
        {/* Holdings section label */}
        <div className="flex flex-col gap-1.5 px-1 pt-2">
          <LoadingBlock className="w-28 h-5 rounded-[8px]" />
          <LoadingBlock className="w-44 h-3.5 rounded-[6px]" style={{ opacity: 0.6 }} />
        </div>
        {/* Table rows */}
        <LoadingBlock style={{ height: 64 }} className="rounded-[20px]" />
        <LoadingBlock style={{ height: 64 }} className="rounded-[20px]" />
        <LoadingBlock style={{ height: 64 }} className="rounded-[20px]" />
        <LoadingBlock style={{ height: 64 }} className="rounded-[20px]" />
        <LoadingBlock style={{ height: 64 }} className="rounded-[20px]" />
      </div>
    </div>
  );
}
