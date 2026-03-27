import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/stocks", req.url));
  response.cookies.set("kite_access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
