"use client";

const NAV_ITEMS = [
  { label: "Dashboard" },
  { label: "Investments", active: true },
  { label: "Holdings" },
  { label: "Markets" },
  { label: "Transfers" },
];

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[50px]"
      style={{
        background: "rgba(242,242,247,0.85)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderColor: "rgba(60,60,67,0.09)",
      }}
    >
      {/* Left: logo + nav (nav hidden on mobile) */}
      <div className="flex items-center gap-6 lg:gap-8">
        <span className="text-[16.5px] font-bold tracking-tight" style={{ color: "#1d1d1f" }}>
          myFinance
        </span>

        {/* Nav links: hidden below md */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              data-active={item.active ? "true" : undefined}
              className="nav-link relative px-3 lg:px-3.5 py-1.5 text-[13px] rounded-md"
              style={{
                color:      item.active ? "#1d1d1f" : "#86868b",
                fontWeight: item.active ? 500 : 400,
              }}
            >
              {item.label}
              {item.active && (
                <span
                  className="absolute bottom-0 left-3 lg:left-3.5 right-3 lg:right-3.5 h-[1.5px] rounded-full"
                  style={{ background: "#1d1d1f" }}
                />
              )}
            </a>
          ))}
        </div>
      </div>

      {/* Right: icons + avatar */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button className="icon-btn w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "#aeaeb2" }}>
          <SearchIcon />
        </button>
        <button className="icon-btn w-8 h-8 hidden sm:flex items-center justify-center rounded-full" style={{ color: "#aeaeb2" }}>
          <BellIcon />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-semibold ml-0.5 cursor-pointer"
          style={{ background: "#f59e0b" }}
        >
          D
        </div>
      </div>
    </nav>
  );
}
