"use client";

import type { DemandForecast, DemandLevel } from "@/lib/domain/demand-forecast";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Brain, MapPin, Minus } from "lucide-react";

const LEVEL_CONFIG: Record<DemandLevel, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: "CRITICAL",  bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200" },
  HIGH:     { label: "HIGH",      bg: "bg-orange-50",   text: "text-[#ef4d23]",    border: "border-orange-200" },
  MEDIUM:   { label: "MEDIUM",    bg: "bg-yellow-50",   text: "text-yellow-700",   border: "border-yellow-200" },
  STABLE:   { label: "STABLE",    bg: "bg-neutral-100", text: "text-neutral-600",  border: "border-neutral-200" },
  LOW:      { label: "LOW",       bg: "bg-blue-50",     text: "text-blue-600",     border: "border-blue-200" },
};

function TrendIcon({ pct }: { pct: number }) {
  if (pct > 5)  return <ArrowUpRight size={14} className="text-[#ef4d23]" />;
  if (pct < -5) return <ArrowDownRight size={14} className="text-blue-500" />;
  return <Minus size={14} className="text-neutral-400" />;
}

function ForecastCard({ forecast }: { forecast: DemandForecast }) {
  const cfg = LEVEL_CONFIG[forecast.demandLevel];
  const isUp = forecast.projectedChangePct > 5;
  const isDown = forecast.projectedChangePct < -5;

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
          <MapPin size={14} className="text-[#ef4d23] shrink-0" />
          <span>{forecast.city}</span>
          <ArrowRight size={12} className="text-neutral-400" />
          <span>{forecast.category}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2">
        <TrendIcon pct={forecast.projectedChangePct} />
        <span className={`text-sm font-semibold ${isUp ? "text-[#ef4d23]" : isDown ? "text-blue-500" : "text-neutral-500"}`}>
          {forecast.projectedChangePct > 0 ? "+" : ""}{forecast.projectedChangePct}%
        </span>
        <span className="text-xs text-neutral-400">projected demand next week</span>
      </div>

      {/* Recommendation */}
      <p className="text-xs leading-5 text-neutral-500 border-t border-neutral-100 pt-2">
        {forecast.recommendation}
      </p>
    </article>
  );
}

export function DemandForecastPanel({ forecasts, isDemo }: { forecasts: DemandForecast[]; isDemo: boolean }) {
  const critical = forecasts.filter((f) => f.demandLevel === "CRITICAL" || f.demandLevel === "HIGH");
  const medium   = forecasts.filter((f) => f.demandLevel === "MEDIUM");
  const other    = forecasts.filter((f) => f.demandLevel === "STABLE" || f.demandLevel === "LOW");

  return (
    <section className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm">
      {/* Section header */}
      <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-neutral-900 flex items-center gap-2 text-base">
            <Brain size={20} className="text-[#ef4d23]" />
            AI Demand Forecasting
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Predicted service demand by region &amp; category for the next 7 days
          </p>
        </div>
        {isDemo && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-[11px] font-medium text-yellow-700">
            <AlertTriangle size={11} />
            Demo data — connect Supabase to see live forecasts
          </span>
        )}
      </div>

      {/* How it works callout */}
      <div className="mb-6 rounded-2xl bg-[#f5f2ee] border border-[var(--line)] p-4">
        <p className="text-xs leading-6 text-neutral-600">
          <span className="font-semibold text-neutral-800">How it works: </span>
          The engine analyses 8 weeks of booking history, comparing the last 4 weeks against the prior 4 weeks
          per city and service category. It calculates week-over-week demand change and classifies each signal as{" "}
          <span className="font-medium text-red-600">CRITICAL</span>,{" "}
          <span className="font-medium text-[#ef4d23]">HIGH</span>,{" "}
          <span className="font-medium text-yellow-600">MEDIUM</span>,{" "}
          <span className="font-medium text-neutral-500">STABLE</span>, or{" "}
          <span className="font-medium text-blue-500">LOW</span> — so cooperatives can proactively arrange workers before demand peaks.
        </p>
      </div>

      {/* CRITICAL / HIGH signals */}
      {critical.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            🔴 Urgent — Action Required
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {critical.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
          </div>
        </div>
      )}

      {/* MEDIUM signals */}
      {medium.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            🟡 Watch — Monitor Closely
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {medium.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
          </div>
        </div>
      )}

      {/* STABLE / LOW */}
      {other.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            🟢 Normal — No Immediate Action
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {other.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
          </div>
        </div>
      )}
    </section>
  );
}
