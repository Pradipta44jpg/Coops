"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Download,
  Filter,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { DemandForecast, DemandLevel } from "@/lib/domain/demand-forecast";

// ─── Config ──────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  DemandLevel,
  { label: string; bg: string; text: string; border: string; bar: string; dot: string }
> = {
  CRITICAL: { label: "CRITICAL", bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",    bar: "bg-red-500",    dot: "bg-red-500"    },
  HIGH:     { label: "HIGH",     bg: "bg-orange-50",   text: "text-[#ef4d23]",    border: "border-orange-200", bar: "bg-[#ef4d23]",  dot: "bg-[#ef4d23]"  },
  MEDIUM:   { label: "MEDIUM",   bg: "bg-yellow-50",   text: "text-yellow-700",   border: "border-yellow-200", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  STABLE:   { label: "STABLE",   bg: "bg-neutral-50",  text: "text-neutral-600",  border: "border-neutral-200",bar: "bg-neutral-300",dot: "bg-neutral-400"},
  LOW:      { label: "LOW",      bg: "bg-blue-50",     text: "text-blue-600",     border: "border-blue-200",   bar: "bg-blue-400",   dot: "bg-blue-400"   },
};

const LEVEL_ORDER: DemandLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "STABLE", "LOW"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendIcon({ pct }: { pct: number }) {
  if (pct > 5)  return <ArrowUpRight size={13} className="text-[#ef4d23]" />;
  if (pct < -5) return <ArrowDownRight size={13} className="text-blue-500" />;
  return <Minus size={13} className="text-neutral-400" />;
}

function exportCsv(forecasts: DemandForecast[]) {
  const header = ["City", "Category", "Level", "Projected Change %", "Current Count", "Urgency Score", "Recommendation"];
  const rows = forecasts.map((f) => [
    f.city, f.category, f.demandLevel,
    f.projectedChangePct, f.currentCount, f.urgencyScore,
    `"${f.recommendation.replace(/"/g, '""')}"`,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `demand-forecast-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? "bg-[#ef4d23] text-white" : "bg-[#0b0f1a] text-white"}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
    </article>
  );
}

function ForecastCard({ forecast }: { forecast: DemandForecast }) {
  const cfg = LEVEL_CONFIG[forecast.demandLevel];
  const isUp = forecast.projectedChangePct > 5;
  const isDown = forecast.projectedChangePct < -5;
  const urgencyWidth = Math.min(100, Math.max(4, forecast.urgencyScore));

  return (
    <article className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-800 flex-wrap">
          <MapPin size={13} className="text-[#ef4d23] shrink-0" />
          <span>{forecast.city}</span>
          <ArrowRight size={11} className="text-neutral-400" />
          <span>{forecast.category}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-widest uppercase ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {cfg.label}
        </span>
      </div>

      {/* Trend row */}
      <div className="flex items-center gap-2">
        <TrendIcon pct={forecast.projectedChangePct} />
        <span className={`text-sm font-bold ${isUp ? "text-[#ef4d23]" : isDown ? "text-blue-500" : "text-neutral-500"}`}>
          {forecast.projectedChangePct > 0 ? "+" : ""}{forecast.projectedChangePct}%
        </span>
        <span className="text-xs text-neutral-400">projected next week</span>
        <span className="ml-auto text-xs text-neutral-400">{forecast.currentCount} bookings</span>
      </div>

      {/* Urgency bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-medium text-neutral-400">
          <span>Urgency score</span>
          <span className={cfg.text}>{forecast.urgencyScore}/100</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
          <div
            style={{ width: `${urgencyWidth}%` }}
            className={`h-full rounded-full ${cfg.bar} transition-all`}
          />
        </div>
      </div>

      {/* Recommendation */}
      <p className="text-xs leading-5 text-neutral-600 border-t border-white/50 pt-2">
        {forecast.recommendation}
      </p>
    </article>
  );
}

/** Mini heatmap — cities as rows, categories as columns, cell colour = demand level */
function UrgencyHeatmap({ forecasts }: { forecasts: DemandForecast[] }) {
  const cities = [...new Set(forecasts.map((f) => f.city))].slice(0, 12);
  const categories = [...new Set(forecasts.map((f) => f.category))].slice(0, 8);

  if (cities.length === 0) return null;

  const lookup = new Map(forecasts.map((f) => [`${f.city}||${f.category}`, f]));

  const cellColor: Record<DemandLevel, string> = {
    CRITICAL: "bg-red-500 text-white",
    HIGH:     "bg-[#ef4d23] text-white",
    MEDIUM:   "bg-yellow-400 text-yellow-900",
    STABLE:   "bg-neutral-200 text-neutral-500",
    LOW:      "bg-blue-200 text-blue-700",
  };

  return (
    <section className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm overflow-auto">
      <div className="flex items-center gap-2 mb-5">
        <Zap size={18} className="text-[#ef4d23]" />
        <div>
          <h3 className="font-semibold text-neutral-900 text-sm">Demand Heatmap</h3>
          <p className="text-xs text-neutral-500">City × Service category urgency overview</p>
        </div>
      </div>

      <div className="min-w-[480px]">
        {/* Header row */}
        <div
          className="grid text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1"
          style={{ gridTemplateColumns: `140px repeat(${categories.length}, minmax(80px, 1fr))` }}
        >
          <span />
          {categories.map((c) => (
            <span key={c} className="px-1 truncate">{c}</span>
          ))}
        </div>

        {/* Data rows */}
        {cities.map((city) => (
          <div
            key={city}
            className="grid items-center gap-0.5 mb-0.5"
            style={{ gridTemplateColumns: `140px repeat(${categories.length}, minmax(80px, 1fr))` }}
          >
            <span className="text-xs font-medium text-neutral-700 pr-2 truncate">{city}</span>
            {categories.map((cat) => {
              const f = lookup.get(`${city}||${cat}`);
              return (
                <div
                  key={cat}
                  title={f ? `${f.projectedChangePct > 0 ? "+" : ""}${f.projectedChangePct}% — ${f.recommendation}` : "No data"}
                  className={`h-8 rounded flex items-center justify-center text-[10px] font-bold cursor-default transition-opacity hover:opacity-80 ${f ? cellColor[f.demandLevel] : "bg-neutral-50 text-neutral-300"}`}
                >
                  {f ? `${f.projectedChangePct > 0 ? "+" : ""}${f.projectedChangePct}%` : "—"}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-neutral-100">
        {LEVEL_ORDER.map((level) => {
          const cfg = LEVEL_CONFIG[level];
          return (
            <span key={level} className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
              <span className={`h-3 w-3 rounded ${cfg.bar}`} />
              {level}
            </span>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function ForecastDashboard({
  forecasts,
  isDemo,
}: {
  forecasts: DemandForecast[];
  isDemo: boolean;
}) {
  const [filterLevel, setFilterLevel] = useState<DemandLevel | "ALL">("ALL");
  const [filterCity, setFilterCity] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const cities = useMemo(
    () => [...new Set(forecasts.map((f) => f.city))].sort(),
    [forecasts]
  );
  const categories = useMemo(
    () => [...new Set(forecasts.map((f) => f.category))].sort(),
    [forecasts]
  );

  const filtered = useMemo(() => {
    return forecasts.filter((f) => {
      if (filterLevel !== "ALL" && f.demandLevel !== filterLevel) return false;
      if (filterCity !== "ALL" && f.city !== filterCity) return false;
      if (filterCategory !== "ALL" && f.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!f.city.toLowerCase().includes(q) && !f.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [forecasts, filterLevel, filterCity, filterCategory, search]);

  // Stats
  const totalSignals  = forecasts.length;
  const urgentCount   = forecasts.filter((f) => f.demandLevel === "CRITICAL" || f.demandLevel === "HIGH").length;
  const avgUrgency    = forecasts.length ? Math.round(forecasts.reduce((s, f) => s + f.urgencyScore, 0) / forecasts.length) : 0;
  const totalBookings = forecasts.reduce((s, f) => s + f.currentCount, 0);

  // Group filtered results by priority bucket
  const critical = filtered.filter((f) => f.demandLevel === "CRITICAL" || f.demandLevel === "HIGH");
  const medium   = filtered.filter((f) => f.demandLevel === "MEDIUM");
  const other    = filtered.filter((f) => f.demandLevel === "STABLE" || f.demandLevel === "LOW");

  return (
    <div className="space-y-6">
      {/* ── Demo badge ─────────────────────────────────────────────────────── */}
      {isDemo && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            <strong>Demo data</strong> — connect Supabase with booking history to see live AI forecasts.
          </span>
        </div>
      )}

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-[var(--line)] bg-[#0b0f1a] p-6 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={20} className="text-[#ef4d23]" />
          <h2 className="font-semibold text-base">How the AI Engine Works</h2>
        </div>
        <p className="text-sm leading-7 text-neutral-300 max-w-3xl">
          The engine analyses <strong className="text-white">8 weeks</strong> of booking history, splitting it into two 4-week windows.
          It computes week-over-week demand change per <span className="text-[#ef4d23] font-medium">city × service category</span> bucket,
          then classifies each signal as{" "}
          <span className="font-bold text-red-400">CRITICAL</span>,{" "}
          <span className="font-bold text-[#ef4d23]">HIGH</span>,{" "}
          <span className="font-bold text-yellow-300">MEDIUM</span>,{" "}
          <span className="font-bold text-neutral-400">STABLE</span>, or{" "}
          <span className="font-bold text-blue-400">LOW</span>{" "}
          — giving cooperatives advance notice to deploy or reallocate workers before demand peaks.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 text-xs">
          {[
            { step: "01", title: "Ingest", body: "Last 8 weeks of booking data grouped by city and service category." },
            { step: "02", title: "Compare", body: "Recent 4-week window vs prior 4-week window — % change per bucket." },
            { step: "03", title: "Classify & Alert", body: "Urgency scored 0–100. CRITICAL/HIGH signals surface first for action." },
          ].map(({ step, title, body }) => (
            <div key={step} className="rounded-xl bg-white/[0.06] p-4 border border-white/10">
              <span className="text-[10px] font-bold text-[#ef4d23] tracking-widest">{step}</span>
              <p className="mt-1 font-semibold text-white">{title}</p>
              <p className="mt-1 text-neutral-400 leading-5">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── KPI stats ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Brain}       label="Total signals"          value={totalSignals}  sub="city × category combinations" />
        <StatCard icon={Zap}         label="Urgent signals"         value={urgentCount}   sub="CRITICAL or HIGH" accent />
        <StatCard icon={TrendingUp}  label="Avg urgency score"      value={`${avgUrgency}/100`} />
        <StatCard icon={TrendingDown} label="Bookings analysed"     value={totalBookings} sub="last 4 weeks" />
      </div>

      {/* ── Heatmap ─────────────────────────────────────────────────────────── */}
      <UrgencyHeatmap forecasts={forecasts} />

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-neutral-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city or category…"
            className="min-h-8 rounded-lg border border-neutral-200 px-2.5 text-xs outline-none focus:border-[#ef4d23] w-44"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as DemandLevel | "ALL")}
            className="min-h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs outline-none focus:border-[#ef4d23]"
          >
            <option value="ALL">All levels</option>
            {LEVEL_ORDER.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="min-h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs outline-none focus:border-[#ef4d23]"
          >
            <option value="ALL">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="min-h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs outline-none focus:border-[#ef4d23]"
          >
            <option value="ALL">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <span className="ml-auto text-xs text-neutral-400">
            {filtered.length} of {forecasts.length} signals
          </span>

          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Signal cards ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-10 text-center">
          <p className="text-sm text-neutral-400">No signals match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {critical.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                🔴 Urgent — Immediate Action Required ({critical.length})
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {critical.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
              </div>
            </div>
          )}
          {medium.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                🟡 Watch — Monitor Closely ({medium.length})
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {medium.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
              </div>
            </div>
          )}
          {other.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-300" />
                🟢 Normal — No Immediate Action ({other.length})
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {other.map((f) => <ForecastCard key={`${f.city}-${f.category}`} forecast={f} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
