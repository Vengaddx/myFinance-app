type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  subColor?: "green" | "red" | "blue" | "muted";
  className?: string;
};

const subColorMap = {
  green: "#34c759",
  red:   "#ff3b30",
  blue:  "#007aff",
  muted: "#86868b",
};

export default function MetricCard({
  label,
  value,
  sub,
  subColor = "muted",
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`card-lift card-shadow-light rounded-[14px] px-4 py-3 ${className}`}
      style={{
        background: "#fff",
        border: "1px solid rgba(60,60,67,0.07)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase mb-1"
        style={{ color: "#aeaeb2", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <p
        className="text-[20px] font-bold leading-none"
        style={{ color: "#1d1d1f", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[11.5px] font-medium mt-1"
          style={{ color: subColorMap[subColor] }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
