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

/**
 * Click-to-drop point picker on a Google Map. Reports the picked point via
 * onChange; shows DDM coordinates live so the crew can read them back over
 * the radio.
 */
export function MapPicker({
  apiKey,
  initialView,
  value,
  onChange,
}: {
  apiKey: string;
  /** Where the map opens before a point has been picked. */
  initialView: { lat: number; lng: number; zoom: number; type: string };
  value: { lat: number; lng: number } | null;
  onChange: (point: { lat: number; lng: number }) => void;
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
        const center = value ?? { lat: initialView.lat, lng: initialView.lng };
        const map = new window.google!.maps.Map(containerRef.current, {
          center,
          zoom: value ? 15 : initialView.zoom,
          mapTypeId: initialView.type,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;

        const setMarker = (pos: google.maps.LatLngLiteral) => {
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }
          markerRef.current = new window.google!.maps.Marker({ position: pos, map });
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
      <div ref={containerRef} className="h-64 w-full rounded-(--radius-control) border border-edge bg-surface-2" />
      <p className="data text-[11px] text-ink-muted">
        {value ? toDDM(value.lat, value.lng) : "Click the map to drop the LZ point"}
      </p>
    </div>
  );
}
