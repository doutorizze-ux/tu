import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = new URL("/api/toolost/oauth/callback", url.origin);
  targetUrl.search = url.search;
  return NextResponse.redirect(targetUrl);
}