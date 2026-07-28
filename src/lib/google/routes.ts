import "server-only";

export type LatLng = { lat: number; lng: number };

export type RouteLeg = {
  destinationIndex: number;
  /** Drive time in minutes. Null when only straight-line fallback was possible. */
  durationMin: number | null;
  distanceMeters: number;
  /** True when values are straight-line estimates, not routed. */
  estimate: boolean;
};

/**
 * Traffic-aware drive matrix from one origin to many destinations using the
 * Routes API. Falls back to haversine straight-line distances when no key is
 * configured, flagged so the UI and note can say so.
 */
export async function driveMatrix(
  origin: LatLng,
  destinations: LatLng[],
  departureTime: Date | null,
): Promise<{ legs: RouteLeg[]; trafficAware: boolean }> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return {
      trafficAware: false,
      legs: destinations.map((d, i) => ({
        destinationIndex: i,
        durationMin: null,
        distanceMeters: haversineMeters(origin, d),
        estimate: true,
      })),
    };
  }

  // Routes API requires a future departureTime for TRAFFIC_AWARE routing.
  const now = Date.now();
  const departure =
    departureTime && departureTime.getTime() > now + 60_000 ? departureTime : new Date(now + 120_000);

  const res = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify({
      origins: [{ waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } }],
      destinations: destinations.map((d) => ({
        waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: departure.toISOString(),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const rows = (await res.json()) as {
    originIndex?: number;
    destinationIndex?: number;
    duration?: string;
    distanceMeters?: number;
    condition?: string;
  }[];

  const legs: RouteLeg[] = [];
  for (const row of rows) {
    if (row.condition !== "ROUTE_EXISTS" || row.destinationIndex === undefined) continue;
    const seconds = row.duration ? Number(row.duration.replace(/s$/, "")) : NaN;
    legs.push({
      destinationIndex: row.destinationIndex,
      durationMin: Number.isFinite(seconds) ? seconds / 60 : null,
      distanceMeters: row.distanceMeters ?? 0,
      estimate: false,
    });
  }
  return { legs, trafficAware: true };
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
