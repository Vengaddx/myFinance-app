type PortfolioStatCardProps = {
  label: string;
  value: string;
  detail?: string | null;
  tone?: "neutral" | "positive" | "negative";
};

export default function PortfolioStatCard({
  label,
  value,
  detail,
  tone = "neutral",
}: PortfolioStatCardProps) {
  const toneColor =
    tone === "positive"
      ? "#1f9d55"
      : tone === "negative"
        ? "#d9473f"
        : "var(--text-primary)";

  const detailColor =
    tone === "positive"
      ? "rgba(31,157,85,0.72)"
      : tone === "negative"
        ? "rgba(217,71,63,0.72)"
        : "var(--text-tertiary)";

  return (
    <div
      className="rounded-[24px] p-5"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,248,250,0.9) 100%)",
        border: "1px solid rgba(120,120,128,0.12)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[22px] font-semibold tracking-[-0.03em] leading-none"
        style={{ color: toneColor }}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-[12px] font-medium" style={{ color: detailColor }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}
