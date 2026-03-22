export default function Footer() {
  return (
    <footer
      className="mt-auto px-4 sm:px-6 lg:px-8 py-5"
      style={{ borderTop: "1px solid var(--separator-subtle)" }}
    >
      <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            © 2026 Mahfin.
          </span>
          {["Privacy Policy", "Terms of Service", "Design Credits"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-[13px] transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.color = "var(--text-tertiary)")
              }
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right */}
        <p className="text-[13px] italic" style={{ color: "var(--text-tertiary)" }}>
          This app is dedicated to Maha Lakshmi ❤️
        </p>
      </div>
    </footer>
  );
}
