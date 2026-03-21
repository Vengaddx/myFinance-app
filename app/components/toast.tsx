"use client";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
};

export default function Toast({
  message,
  type = "info",
  visible,
}: ToastProps) {
  if (!visible) return null;

  const styles = {
    success: {
      background: "#ecfdf3",
      color: "#067647",
      border: "1px solid #abefc6",
    },
    error: {
      background: "#fef3f2",
      color: "#b42318",
      border: "1px solid #fecdca",
    },
    info: {
      background: "#eff8ff",
      color: "#175cd3",
      border: "1px solid #b2ddff",
    },
  };

  return (
    <div
      className="fixed top-5 right-5 z-[1000] px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{
        ...styles[type],
        minWidth: 220,
      }}
    >
      {message}
    </div>
  );
}