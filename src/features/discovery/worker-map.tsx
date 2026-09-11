"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type WorkerMapPin = {
  workerId: string;
  fullName: string;
  serviceName: string;
  city: string | null;
  latitude: number;
  longitude: number;
  fairScore: number;
  averageRating: number;
};

// Extend the Window type to hold the async Maps SDK callback
declare global {
  interface Window {
    __googleMapsLoaded?: () => void;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    // Avoid loading twice
    if (document.querySelector("#google-maps-script")) {
      window.__googleMapsLoaded = resolve;
      return;
    }
    window.__googleMapsLoaded = resolve;
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__googleMapsLoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
}

/** Coops brand orange */
const ACCENT = "#ef4d23";
const DARK = "#0b0f1a";

/** SVG pin encoded as a data URL for use as a map marker icon */
function buildPinSvg(color: string, size = 36) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function WorkerMap({
  pins,
  centerLatitude,
  centerLongitude,
}: {
  pins: WorkerMapPin[];
  centerLatitude?: number;
  centerLongitude?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
      setLoading(false);
      return;
    }
    if (!containerRef.current) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!containerRef.current) return;

        // Determine map center: prefer search origin, fall back to first pin, then India centroid
        const defaultCenter =
          centerLatitude && centerLongitude
            ? { lat: centerLatitude, lng: centerLongitude }
            : pins[0]
            ? { lat: pins[0].latitude, lng: pins[0].longitude }
            : { lat: 20.5937, lng: 78.9629 }; // India centre

        const map = new google.maps.Map(containerRef.current!, {
          center: defaultCenter,
          zoom: centerLatitude ? 11 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });

        mapRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();

        // Drop a "you are here" marker if we have a search centre
        if (centerLatitude && centerLongitude) {
          new google.maps.Marker({
            position: { lat: centerLatitude, lng: centerLongitude },
            map,
            title: "Your search location",
            icon: {
              url: buildPinSvg(DARK, 32),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32),
            },
            zIndex: 999,
          });
        }

        // Worker markers
        const bounds = new google.maps.LatLngBounds();
        if (centerLatitude && centerLongitude) {
          bounds.extend({ lat: centerLatitude, lng: centerLongitude });
        }

        markersRef.current = pins.map((pin) => {
          const position = { lat: pin.latitude, lng: pin.longitude };
          bounds.extend(position);

          const marker = new google.maps.Marker({
            position,
            map,
            title: pin.fullName,
            icon: {
              url: buildPinSvg(ACCENT, 36),
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 36),
            },
            animation: google.maps.Animation.DROP,
          });

          // Info window content
          const content = `
            <div style="font-family:system-ui,sans-serif;min-width:200px;padding:4px 0">
              <p style="margin:0;font-weight:600;font-size:14px;color:${DARK}">${pin.fullName}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280">${pin.serviceName}</p>
              <div style="margin:8px 0 0;display:flex;gap:12px;font-size:12px;color:#6b7280">
                <span>⭐ ${pin.averageRating ? pin.averageRating.toFixed(1) : "No reviews"}</span>
                <span>Fair score: <strong style="color:${DARK}">${pin.fairScore}</strong></span>
              </div>
              ${pin.city ? `<p style="margin:6px 0 0;font-size:11px;color:#9ca3af">📍 ${pin.city}</p>` : ""}
              <a
                href="/workers/${pin.workerId}"
                style="margin:10px 0 0;display:inline-block;background:${ACCENT};color:white;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:600;text-decoration:none"
              >View worker →</a>
            </div>`;

          marker.addListener("click", () => {
            infoWindowRef.current?.setContent(content);
            infoWindowRef.current?.open(map, marker);
          });

          return marker;
        });

        // Fit bounds only if we have multiple pins
        if (pins.length > 1) {
          map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 });
        }

        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Map failed to load.");
        setLoading(false);
      });
  }, [apiKey, pins, centerLatitude, centerLongitude]);

  if (!apiKey) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--line)] bg-[#f5f2ee]">
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <MapPin size={28} className="text-neutral-400" />
          <p className="text-sm font-medium text-neutral-600">Map not configured</p>
          <p className="text-xs text-neutral-400">
            Add <code className="rounded bg-neutral-200 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your{" "}
            <code className="rounded bg-neutral-200 px-1">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--line)] shadow-sm">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f5f2ee]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#ef4d23] border-t-transparent" />
            <p className="text-xs text-neutral-500">Loading map…</p>
          </div>
        </div>
      )}
      {/* Map legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white/90 px-3 py-2 backdrop-blur-sm shadow-sm text-xs text-neutral-600">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#ef4d23]" />
          Worker
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#0b0f1a]" />
          Your location
        </span>
        <span className="text-neutral-400">{pins.length} worker{pins.length !== 1 ? "s" : ""} shown</span>
      </div>
      <div ref={containerRef} className="h-[480px] w-full" />
    </div>
  );
}
