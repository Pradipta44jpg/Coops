"use client";

import { useState } from "react";
import { Map, List } from "lucide-react";
import dynamic from "next/dynamic";
import type { WorkerMapPin } from "./worker-map";

// Lazy-load the map so the heavy Google Maps SDK is only fetched when the user
// actually opens map view — not on every services page load.
const WorkerMap = dynamic(
  () => import("./worker-map").then((m) => ({ default: m.WorkerMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-2xl border border-[var(--line)] bg-[#f5f2ee]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#ef4d23] border-t-transparent" />
          <p className="text-xs text-neutral-500">Loading map…</p>
        </div>
      </div>
    ),
  }
);

export function WorkerMapToggle({
  pins,
  centerLatitude,
  centerLongitude,
  children,
}: {
  pins: WorkerMapPin[];
  centerLatitude?: number;
  centerLongitude?: number;
  /** The list view (WorkerResults) rendered by the server */
  children: React.ReactNode;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const mapPins = pins.filter((p) => p.latitude !== 0 && p.longitude !== 0);

  return (
    <div className="space-y-3">
      {/* Toggle bar */}
      <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5">
        <p className="text-xs text-neutral-500">
          {mapPins.length} of {pins.length} worker{pins.length !== 1 ? "s" : ""} have map coordinates
        </p>
        <div className="flex rounded-xl border border-neutral-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              view === "list"
                ? "bg-[#0b0f1a] text-white"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <List size={13} />
            List
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              view === "map"
                ? "bg-[#0b0f1a] text-white"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Map size={13} />
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <>{children}</>
      ) : (
        <WorkerMap
          pins={mapPins}
          centerLatitude={centerLatitude}
          centerLongitude={centerLongitude}
        />
      )}
    </div>
  );
}
