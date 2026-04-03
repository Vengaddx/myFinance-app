import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KITE_API_KEY not set" }, { status: 500 });
  }

  // Diagnostic: confirm which API key + registered redirect URL is active in this environment.
  // KITE_REDIRECT_URL must match what is set in the Kite developer console for this api_key.
  // This is NOT passed to Zerodha — it's only here to make mismatches visible in Vercel logs.
  console.log(
    "[kite/login] api_key prefix:", apiKey.slice(0, 6),
    "| KITE_REDIRECT_URL:", process.env.KITE_REDIRECT_URL ?? "(not set)",
  );

  const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
  return NextResponse.redirect(loginUrl);
}
