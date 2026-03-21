export type AssetCategory =
  | "stocks"
  | "gold"
  | "lended"
  | "fd"
  | "realestate"
  | "cash"
  | "crypto"
  | "other";

export type Asset = {
  id: string;
  name: string;
  ticker: string;
  category: AssetCategory;
  quantity: number;
  allocation: number;
  iconBg: string;
  iconColor: string;
  iconSymbol: string;
};

export const assets: Asset[] = [
  {
    id: "1",
    name: "Premium Land Plot #42",
    ticker: "LAND-42",
    category: "realestate",
    quantity: 1,
    allocation: 36.1,
    iconBg: "#fff0e6",
    iconColor: "#c0501a",
    iconSymbol: "⌂",
  },
  {
    id: "2",
    name: "Kite — D Equities",
    ticker: "KITE-D",
    category: "stocks",
    quantity: 250,
    allocation: 25.9,
    iconBg: "#e8eeff",
    iconColor: "#2c5ae9",
    iconSymbol: "↗",
  },
  {
    id: "3",
    name: "Gold Physical Reserve",
    ticker: "GOLD-PHY",
    category: "gold",
    quantity: 74.44,
    allocation: 12.3,
    iconBg: "#fff8e0",
    iconColor: "#a67c00",
    iconSymbol: "◉",
  },
  {
    id: "4",
    name: "HDFC Nifty 50 Index",
    ticker: "HDFC-N50",
    category: "stocks",
    quantity: 500,
    allocation: 8.2,
    iconBg: "#e8eeff",
    iconColor: "#2c5ae9",
    iconSymbol: "↗",
  },
  {
    id: "5",
    name: "Sovereign Gold Bond 2028",
    ticker: "SGB-28",
    category: "gold",
    quantity: 10,
    allocation: 4.9,
    iconBg: "#fff8e0",
    iconColor: "#a67c00",
    iconSymbol: "◉",
  },
  {
    id: "6",
    name: "ICICI Liquid Fund",
    ticker: "ICICI-LIQ",
    category: "cash",
    quantity: 2400,
    allocation: 4.8,
    iconBg: "#f0f0f0",
    iconColor: "#636366",
    iconSymbol: "≈",
  },
  {
    id: "7",
    name: "SBI Fixed Deposit",
    ticker: "SBI-FD",
    category: "fd",
    quantity: 1,
    allocation: 4.5,
    iconBg: "#e8f5ed",
    iconColor: "#1e7a3e",
    iconSymbol: "⊕",
  },
  {
    id: "8",
    name: "Bitcoin",
    ticker: "BTC",
    category: "crypto",
    quantity: 0.08,
    allocation: 3.0,
    iconBg: "#fff3e0",
    iconColor: "#e65100",
    iconSymbol: "₿",
  },
  {
    id: "9",
    name: "Ethereum",
    ticker: "ETH",
    category: "crypto",
    quantity: 0.5,
    allocation: 1.0,
    iconBg: "#ede8ff",
    iconColor: "#5b30c0",
    iconSymbol: "Ξ",
  },
];

export type AllocationSegment = {
  label: string;
  pct: number;
  amount: number;
  color: string;
};

export const allocationData: AllocationSegment[] = [
  { label: "Equity",      pct: 72, amount: 1728000, color: "#1c1c1e" },
  { label: "Debt/Fixed",  pct: 18, amount: 432000,  color: "#8e8e93" },
  { label: "Cash",        pct: 10, amount: 240000,  color: "#d1d1d6" },
];

export const summaryData = {
  netWorth:    2142850,
  liabilities: 257150,
  invested:    1450000,   // current market value
  costBasis:   1120000,   // original buy price
  totalPnl:    330000,
  totalPnlPct: 29.46,
  netWorthChange: 12.4,
  liabilitiesChangePct: -2.1,
  investedPctOfNetWorth: 68,
};
