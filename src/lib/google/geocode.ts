import "server-only";

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export function hasMapsKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/**
 * Geocode a free-text address via the Google Geocoding API.
 * Returns null when the address can't be resolved.
 * Throws when no API key is configured — callers decide the fallback.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "us");
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Geocoding API HTTP ${res.status}`);
  const body = (await res.json()) as {
    status: string;
    error_message?: string;
    results: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[];
  };

  if (body.status === "ZERO_RESULTS") return null;
  if (body.status !== "OK") {
    throw new Error(`Geocoding failed: ${body.status}${body.error_message ? ` — ${body.error_message}` : ""}`);
  }

  const top = body.results[0];
  return {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    formattedAddress: top.formatted_address,
  };
}

/**
 * Resolve coordinates for a form submission: prefer explicit manual coords,
 * else geocode. Produces a user-facing error string on failure.
 */
export async function resolveLocation(input: {
  address: string;
  manualLat?: string;
  manualLng?: string;
}): Promise<{ ok: true; lat: number; lng: number; address: string } | { ok: false; error: string }> {
  const manualLat = input.manualLat?.trim();
  const manualLng = input.manualLng?.trim();
  if (manualLat && manualLng) {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { ok: false, error: "Manual coordinates are not valid lat/lng values." };
    }
    return { ok: true, lat, lng, address: input.address };
  }

  if (!hasMapsKey()) {
    return {
      ok: false,
      error: "No Google Maps API key is configured — enter coordinates manually.",
    };
  }

  try {
    const result = await geocodeAddress(input.address);
    if (!result) return { ok: false, error: "Address could not be found. Check it or enter coordinates manually." };
    return { ok: true, lat: result.lat, lng: result.lng, address: result.formattedAddress };
  } catch (err) {
    console.error("Geocoding error:", err);
    return { ok: false, error: "Geocoding service failed. Try again or enter coordinates manually." };
  }
}
