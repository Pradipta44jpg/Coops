import Link from "next/link";
import type { Route } from "next";
import { MapPin, Scale, Star } from "lucide-react";
import { StatusBadge } from "@/components/ui/status";
import type { RankedWorker } from "@/lib/domain/matching";

const WORKLOAD_CONFIG = {
  "Underutilised": { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Active":        { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500"    },
  "Busy":          { bg: "bg-yellow-50",   text: "text-yellow-700",  border: "border-yellow-200",  dot: "bg-yellow-500"  },
  "High Load":     { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500"     },
} as const;

export function WorkerResults({ workers }: { workers: RankedWorker[] }) {
  return (
    <div className="grid gap-3">
      {/* Fair-Work Allocation legend */}
      <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
          <Scale size={13} className="text-[#ef4d23]" />
          Fair-Work Allocation
        </span>
        <span className="text-xs text-neutral-400">Workers are ranked by fair score (75% merit + 25% workload balance)</span>
        <div className="flex flex-wrap gap-3 ml-auto">
          {(Object.keys(WORKLOAD_CONFIG) as Array<keyof typeof WORKLOAD_CONFIG>).map((label) => {
            const cfg = WORKLOAD_CONFIG[label];
            return (
              <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {workers.map((worker) => {
        const wl = worker.workloadLabel ?? "Active";
        const cfg = WORKLOAD_CONFIG[wl];
        return (
          <article key={`${worker.workerId}-${worker.serviceName}`} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{worker.fullName}</h2>
                  <StatusBadge tone={worker.isAvailable ? "success" : "warning"}>
                    {worker.isAvailable ? "Availability listed" : "Availability not listed"}
                  </StatusBadge>
                  {/* Workload badge */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {wl}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{worker.serviceName}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Star size={15} aria-hidden="true" />
                    {worker.averageRating ? worker.averageRating.toFixed(1) : "No reviews"}
                  </span>
                  <span>{worker.yearsExperience} yrs experience</span>
                  <span>{worker.completedJobs} completed jobs</span>
                  <span className="text-neutral-400">{worker.recentJobs} jobs last 30 days</span>
                  {worker.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={15} aria-hidden="true" />
                      {worker.city}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-40 flex-col items-start gap-2 sm:items-end">
                {/* Fair score — primary */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-[11px] text-neutral-400 font-medium">Fair Score</p>
                    <p className="text-xl font-bold text-neutral-900">{worker.fairScore}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-neutral-400 font-medium">Match</p>
                    <p className="text-xl font-bold text-neutral-400">{worker.score}</p>
                  </div>
                </div>
                <Link
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--accent-dark)] sm:w-auto"
                  href={`/workers/${worker.workerId}` as Route}
                >
                  View worker
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
