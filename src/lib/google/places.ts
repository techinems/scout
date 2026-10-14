import "server-only";
import { appConfig } from "@/lib/app-config";

export type PlaceSuggestion = {
  placeId: string;
  main: string;
  secondary: string;
};

export function placesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/**
 * Address/place suggestions from the Places API (New). Biased toward the
 * configured map center when it's zoomed in enough to mean a region rather
 * than a whole country. The session token groups keystrokes with the final
 * details lookup so Google bills them as one session.
 */
export async function autocomplete(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const body: Record<string, unknown> = {
    input,
    sessionToken,
    includedRegionCodes: appConfig.addressRegionCodes,
  };
  const { lat, lng, zoom } = appConfig.mapCenter;
  if (zoom >= 8) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Places autocomplete HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text?: { text: string };
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      };
    }[];
  };

  return (data.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        placeId: p.placeId,
        main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      },
    ];
  });
}

/** Resolve a picked suggestion to its full formatted address. Ends the session. */
export async function placeAddress(placeId: string, sessionToken: string): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("sessionToken", sessionToken);
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "formattedAddress" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Place details HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { formattedAddress?: string };
  return data.formattedAddress ?? null;
}
