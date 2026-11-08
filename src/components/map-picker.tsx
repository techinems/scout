"use client";

import { useEffect, useRef, useState } from "react";
import { toDDM } from "@/lib/geo";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loader: Promise<void> | null = null;

function loadMapsJs(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=__scoutMapsReady`;
    (window as unknown as Record<string, unknown>).__scoutMapsReady = () => resolve();
    script.onerror = () => reject(new Error("Maps JS failed to load"));
    document.head.appendChild(script);
  });
  return loader;
}

// App palette (globals.css) — the styled map sits flush with the dark UI.
const C = {
  bg: "#0b0e13",
  surface: "#11151c",
  surface2: "#171d27",
  surface3: "#1e2530",
  edge: "#242b38",
  edgeStrong: "#323b4b",
  ink: "#e9ecf1",
  inkMuted: "#96a0b0",
  inkFaint: "#5f6979",
  accent: "#ff5d38",
  danger: "#e5484d",
  water: "#0d1a2b",
  park: "#122019",
};

/** Dark road-map style. Applies to the road layer; imagery stays as-is. */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: C.surface }] },
  { elementType: "labels.text.fill", stylers: [{ color: C.inkMuted }] },
  { elementType: "labels.text.stroke", stylers: [{ color: C.bg }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: C.edgeStrong }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: C.ink }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: C.surface2 }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: C.surface2 }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: C.inkFaint }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: C.park }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: C.surface3 }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: C.bg }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: C.inkMuted }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: C.edge }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: C.edgeStrong }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: C.bg }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: C.ink }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: C.surface2 }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: C.water }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: C.inkFaint }] },
];

// Teardrop pin, tip at (0,0).
const PIN_PATH = "M0 0C-1.5-6-9-11-9-18a9 9 0 1 1 18 0c0 7-7.5 12-9 18z";

export type MapAnchor = { lat: number; lng: number; label: string };

/**
 * Tap-to-drop point picker. Opens on a dark road map around the anchor (the
 * mission target, marked with a ring) and reports the picked point via
 * onChange; DDM coordinates show live so the crew can read them back over
 * the radio. A toggle switches to imagery for checking the ground.
 */
export function MapPicker({
  apiKey,
  initialView,
  anchor,
  value,
  onChange,
  pinLabel,
  hint,
}: {
  apiKey: string;
  /** Fallback view when there's no anchor or picked point. `type` is the imagery layer the toggle offers. */
  initialView: { lat: number; lng: number; zoom: number; type: string };
  /** Reference point shown for context — usually the mission target. */
  anchor?: MapAnchor | null;
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
  /** Short text inside the picked pin, e.g. "LZ". */
  pinLabel: string;
  /** Prompt shown before a point is picked. */
  hint: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    loadMapsJs(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const g = window.google!.maps;
        const imagery = initialView.type === "roadmap" ? "hybrid" : initialView.type;
        const start = value ?? anchor ?? null;
        const map = new g.Map(containerRef.current, {
          center: start ?? { lat: initialView.lat, lng: initialView.lng },
          zoom: start ? 16 : initialView.zoom,
          mapTypeId: "roadmap",
          styles: DARK_STYLE,
          backgroundColor: C.bg,
          mapTypeControl: true,
          mapTypeControlOptions: {
            mapTypeIds: ["roadmap", imagery],
            style: g.MapTypeControlStyle.HORIZONTAL_BAR,
            position: g.ControlPosition.TOP_LEFT,
          },
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        // Both points in view when editing a pin away from the target.
        if (value && anchor) {
          const bounds = new g.LatLngBounds();
          bounds.extend(value);
          bounds.extend(anchor);
          if (!bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.fitBounds(bounds, 48);
            g.event.addListenerOnce(map, "idle", () => {
              if ((map.getZoom() ?? 0) > 17) map.setZoom(17);
            });
          }
        }

        if (anchor) {
          new g.Marker({
            position: anchor,
            map,
            clickable: false,
            zIndex: 1,
            title: anchor.label,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: C.danger,
              fillOpacity: 0.35,
              strokeColor: C.danger,
              strokeWeight: 2,
              labelOrigin: new g.Point(0, 3.2),
            },
            label: { text: anchor.label, color: C.ink, fontSize: "10px", fontWeight: "700" },
          });
        }

        const setMarker = (pos: google.maps.LatLngLiteral) => {
          if (markerRef.current) {
            markerRef.current.setPosition(pos);
            return;
          }
          markerRef.current = new g.Marker({
            position: pos,
            map,
            clickable: false,
            zIndex: 2,
            icon: {
              path: PIN_PATH,
              scale: 1.6,
              fillColor: C.accent,
              fillOpacity: 1,
              strokeColor: C.bg,
              strokeWeight: 1.5,
              anchor: new g.Point(0, 0),
              labelOrigin: new g.Point(0, -18),
            },
            label: { text: pinLabel, color: "#ffffff", fontSize: "10px", fontWeight: "700" },
          });
        };

        if (value) setMarker(value);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setMarker(point);
          onChangeRef.current(point);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  if (failed) {
    return (
      <p className="rounded-(--radius-control) border border-warn/40 bg-warn-soft px-3 py-2 text-[12px] text-warn">
        Map failed to load — enter coordinates manually below.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div ref={containerRef} className="h-72 w-full rounded-(--radius-control) border border-edge bg-bg" />
      <p className="data text-[11px] text-ink-muted">{value ? toDDM(value.lat, value.lng) : hint}</p>
    </div>
  );
}
