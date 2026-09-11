"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

type ServiceOption = { serviceId: string; name: string };

type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type PlaceDetails = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

// ─── Address autocomplete field ───────────────────────────────────────────────

function AddressAutocomplete({
  onSelect,
  onClear,
}: {
  onSelect: (details: PlaceDetails) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions with 300 ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3 || selected) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/location/places?input=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { suggestions?: PlaceSuggestion[] };
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, selected]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(suggestion: PlaceSuggestion) {
    setOpen(false);
    setSuggestions([]);
    setQuery(suggestion.description);
    setSelected(suggestion.placeId);

    // Resolve placeId → structured address + lat/lng
    const res = await fetch(
      `/api/location/place-details?placeId=${encodeURIComponent(suggestion.placeId)}`
    );
    if (res.ok) {
      const details = (await res.json()) as PlaceDetails;
      onSelect(details);
    }
  }

  function handleClear() {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setOpen(false);
    onClear();
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs text-neutral-600 mb-1">
        Service address
      </label>
      <div className="relative flex items-center">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 text-neutral-400"
        />
        <input
          value={query}
          onChange={(e) => {
            setSelected(null);
            setQuery(e.target.value);
          }}
          placeholder="Search address…"
          className="min-h-11 w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-9 text-sm outline-none focus:border-[#ef4d23] transition-colors"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 animate-spin text-neutral-400"
          />
        )}
        {!loading && selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-neutral-400 hover:text-neutral-700"
            aria-label="Clear address"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={s.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[#f5f2ee] transition-colors"
              >
                <MapPin
                  size={14}
                  className="mt-0.5 shrink-0 text-[#ef4d23]"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-800 truncate">
                    {s.mainText}
                  </span>
                  <span className="block text-xs text-neutral-500 truncate">
                    {s.secondaryText}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main BookingForm ─────────────────────────────────────────────────────────

export function BookingForm({
  workerId,
  services,
}: {
  workerId: string;
  services: ServiceOption[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.serviceId ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Address — structured fields auto-filled by Places selection
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  // Geocoded coords stored so the booking API can persist them
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const [requirement, setRequirement] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [pending, setPending] = useState(false);

  function handlePlaceSelect(details: PlaceDetails) {
    setLine1(details.line1 || details.formattedAddress.split(",")[0]);
    setCity(details.city);
    setState(details.state);
    setLatitude(details.latitude);
    setLongitude(details.longitude);
    setAddressConfirmed(true);
  }

  function handleAddressClear() {
    setLine1("");
    setCity("");
    setState("");
    setLatitude(null);
    setLongitude(null);
    setAddressConfirmed(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!line1 || !city || !state) {
      setMessage("Please search for and select a valid address above.");
      setMessageType("error");
      return;
    }
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId,
        serviceId,
        scheduledStart: `${date}T${time}:00`,
        address: { line1, city, state, latitude, longitude },
        requirement,
      }),
    });
    const result = (await response.json()) as { error?: string; bookingId?: string };

    if (response.ok) {
      setMessage("Booking request sent to the worker.");
      setMessageType("success");
    } else {
      setMessage(result.error ?? "Booking request could not be sent.");
      setMessageType("error");
    }
    setPending(false);
  }

  if (!services.length) {
    return (
      <p className="mt-2 text-sm text-neutral-500">
        This worker has no bookable services yet.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      {/* Service */}
      <label className="block text-xs text-neutral-600">
        Service
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
        >
          {services.map((s) => (
            <option key={s.serviceId} value={s.serviceId}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {/* Date / Time */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-neutral-600">
          Date
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
          />
        </label>
        <label className="block text-xs text-neutral-600">
          Time
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
          />
        </label>
      </div>

      {/* Address autocomplete */}
      <AddressAutocomplete onSelect={handlePlaceSelect} onClear={handleAddressClear} />

      {/* Confirmed address preview */}
      {addressConfirmed && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <MapPin size={13} className="mt-0.5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-medium">{line1}</p>
            <p className="text-emerald-600">
              {city}, {state}
              {latitude !== null && (
                <span className="ml-2 text-emerald-400">
                  ({latitude.toFixed(4)}, {longitude?.toFixed(4)})
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Manual override fields (collapsed by default, shown when no place selected) */}
      {!addressConfirmed && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 select-none">
            Enter address manually instead
          </summary>
          <div className="mt-2 space-y-2">
            <label className="block text-xs text-neutral-600">
              Street address
              <input
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-neutral-600">
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
                />
              </label>
              <label className="block text-xs text-neutral-600">
                State
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
                />
              </label>
            </div>
          </div>
        </details>
      )}

      {/* Work description */}
      <label className="block text-xs text-neutral-600">
        Describe the work
        <textarea
          required
          minLength={10}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#ef4d23]"
        />
      </label>

      {message && (
        <p
          role="status"
          className={`rounded-xl px-3 py-2 text-xs ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[#f5f2ee] text-neutral-600"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#ef4d23] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 hover:bg-[#d94420] transition-colors"
      >
        {pending ? "Sending…" : "Request booking"}
      </button>
    </form>
  );
}
