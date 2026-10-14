import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { autocomplete, placesEnabled } from "@/lib/google/places";

const TOKEN = /^[A-Za-z0-9-]{8,64}$/;

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!placesEnabled()) return NextResponse.json({ enabled: false, suggestions: [] }, { status: 503 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (q.length < 3 || q.length > 200 || !TOKEN.test(session)) {
    return NextResponse.json({ enabled: true, suggestions: [] });
  }

  try {
    return NextResponse.json({ enabled: true, suggestions: await autocomplete(q, session) });
  } catch (err) {
    console.error("Places autocomplete failed:", err);
    return NextResponse.json({ enabled: true, suggestions: [] }, { status: 502 });
  }
}
