import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { placeAddress, placesEnabled } from "@/lib/google/places";

const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;
const TOKEN = /^[A-Za-z0-9-]{8,64}$/;

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!placesEnabled()) return NextResponse.json({ error: "Places not configured" }, { status: 503 });

  const id = request.nextUrl.searchParams.get("id") ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (!PLACE_ID.test(id) || !TOKEN.test(session)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json({ address: await placeAddress(id, session) });
  } catch (err) {
    console.error("Place details failed:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
