import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/state";
import { requireRole } from "@/lib/auth/server";
import { getAnalyticsData } from "@/features/dashboard/analytics-data";
import { AnalyticsCharts } from "@/features/dashboard/analytics-charts";
import { AdminAnalyticsNav } from "./admin-analytics-nav";
import { Calendar, CheckCircle2, DollarSign, Star, Users, Wrench } from "lucide-react";

export const metadata = { title: "Analytics & Reports — Admin" };

export default async function AdminAnalyticsPage() {
  const session = await requireRole(["platform_admin", "cooperative_admin"]);

  if (!session.supabase) {
    return (
      <PageShell title="Analytics & Reports">
        <EmptyState
          title="Connect Supabase"
          body="Analytics dashboard requires a configured Supabase connection."
        />
      </PageShell>
    );
  }

  const { kpis, trends, categories, regions, topWorkers } = await getAnalyticsData();

  return (
    <PageShell
      title="Analytics & Reports"
      description="Real-time demand trends, revenue summaries, and cooperative performance metrics."
    >
      <AdminAnalyticsNav active="/admin/analytics" />

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Total Bookings</p>
              <p className="text-2xl font-bold text-neutral-900">{kpis.totalBookings}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Completion Rate</p>
              <p className="text-2xl font-bold text-neutral-900">{kpis.completionRate}%</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Total Platform Earnings</p>
              <p className="text-2xl font-bold text-neutral-900">
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
                  kpis.totalEarningsCents / 100
                )}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <Star size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Customer Satisfaction</p>
              <p className="text-2xl font-bold text-neutral-900">{kpis.avgRating} / 5.0</p>
            </div>
          </div>
        </article>
      </div>

      {/* Active workers KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Active Workers</p>
              <p className="text-2xl font-bold text-neutral-900">{kpis.activeWorkers}</p>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b0f1a] text-white">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Completed Bookings</p>
              <p className="text-2xl font-bold text-neutral-900">{kpis.completedBookings}</p>
            </div>
          </div>
        </article>
      </div>

      {/* Charts */}
      <AnalyticsCharts
        trends={trends}
        categories={categories}
        regions={regions}
        topWorkers={topWorkers}
      />
    </PageShell>
  );
}
