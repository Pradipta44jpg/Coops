"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Cooperative = { id: string; name: string };
type Service = { id: string; name: string };

export function WorkerApplicationForm({ cooperatives }: { cooperatives: Cooperative[] }) {
  const [cooperative, setCooperative] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [experience, setExperience] = useState("0");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  // Fetch services whenever the selected cooperative changes
  useEffect(() => {
    if (!cooperative) {
      setServices([]);
      setSelectedServices(new Set());
      return;
    }

    let cancelled = false;
    setServicesLoading(true);
    setSelectedServices(new Set());

    fetch(`/api/cooperatives/${cooperative}/services`)
      .then((res) => res.json())
      .then((data: { services?: Service[] }) => {
        if (!cancelled) {
          setServices(data.services ?? []);
          setServicesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServices([]);
          setServicesLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [cooperative]);

  function toggleService(id: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedServices.size === 0) {
      setMessage("Select at least one service you provide.");
      return;
    }

    setPending(true);
    setMessage(null);

    // Send service names (not ids) as serviceInterests so the existing API schema is satisfied
    const selectedNames = services
      .filter((s) => selectedServices.has(s.id))
      .map((s) => s.name);

    const response = await fetch("/api/worker-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cooperativeId: cooperative,
        serviceInterests: selectedNames,
        yearsExperience: experience,
        bio,
      }),
    });

    const result = await response.json() as { error?: string };

    if (response.ok) {
      setSubmitted(true);
    } else {
      setMessage(result.error ?? "Application could not be submitted.");
    }
    setPending(false);
  }

  // ── Post-submission pending state ───────────────────────────────────────────
  if (submitted) {
    return (
      <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f2ee]">
          <span className="text-2xl">⏳</span>
        </div>
        <h2 className="text-xl font-medium tracking-tight">Application submitted</h2>
        <p className="text-sm leading-6 text-neutral-500 max-w-sm mx-auto">
          Your application is under review by the cooperative administrator. You&apos;ll be able to access your worker dashboard as soon as it&apos;s approved.
        </p>
        <p className="text-xs text-neutral-400">
          You can close this page. Sign in again after approval to reach your dashboard.
        </p>
      </div>
    );
  }

  // ── Application form ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">

      {/* Cooperative selector */}
      <label className="block text-sm text-neutral-700">
        Cooperative
        <select
          required
          value={cooperative}
          onChange={(e) => setCooperative(e.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3"
        >
          <option value="">Select a cooperative</option>
          {cooperatives.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>

      {/* Services checkboxes — shown only after a cooperative is chosen */}
      {cooperative && (
        <fieldset>
          <legend className="text-sm text-neutral-700 mb-2">
            Services you provide
            <span className="ml-1 text-xs text-neutral-400">(select all that apply)</span>
          </legend>

          {servicesLoading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400 py-3">
              <Loader2 size={14} className="animate-spin" />
              Loading services…
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-neutral-400 py-3">
              No services found for this cooperative.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors select-none ${
                    selectedServices.has(svc.id)
                      ? "border-[#ef4d23] bg-[#fff6f3] text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedServices.has(svc.id)}
                    onChange={() => toggleService(svc.id)}
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selectedServices.has(svc.id)
                        ? "border-[#ef4d23] bg-[#ef4d23]"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {selectedServices.has(svc.id) && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {svc.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {/* Years of experience */}
      <label className="block text-sm text-neutral-700">
        Years of experience
        <input
          required
          type="number"
          min="0"
          max="60"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3"
        />
      </label>

      {/* Bio */}
      <label className="block text-sm text-neutral-700">
        About your work
        <textarea
          required
          minLength={20}
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Describe your skills, past work, and what makes you a great hire…"
          className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2"
        />
      </label>

      {message && (
        <p role="status" className="rounded-xl bg-[#f5f2ee] px-3 py-2 text-sm text-neutral-600">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (!!cooperative && servicesLoading)}
        className="w-full rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
