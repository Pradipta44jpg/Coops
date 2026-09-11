import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/state";
import { requireRole } from "@/lib/auth/server";
import { getAnalyticsData } from "@/features/dashboard/analytics-data";
import { AnalyticsCharts } from "@/features/dashboard/analytics-charts";
import { DemandForecastPanel } from "@/features/dashboard/demand-forecast-panel";
import { computeDemandForecasts, DEMO_FORECASTS } from "@/lib/domain/demand-forecast";
import { getCurrentUser } from "@/lib/auth/server";
import { Calendar, CheckCircle2, DollarSign, Star, Users, Wrench } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await requireRole(["platform_admin", "cooperative_admin"]);
  if (!session.supabase) {
    return (
      <PageShell title="Platform Analytics">
        <EmptyState title="Connect Supabase" body="Analytics dashboard requires a configured Supabase connection." />
      </PageShell>
    );
  }

  const { kpis, trends, categories, regions, topWorkers } = await getAnalyticsData();

  // Demand forecasting — fetch raw booking + service + address data
  const dbSession = await getCurrentUser();
  let forecasts = DEMO_FORECASTS;
  let isDemo = true;

  if (dbSession.supabase) {
    const supabase = dbSession.supabase;
    const [bookingsRes, servicesRes, addressesRes] = await Promise.all([
      supabase.from("bookings").select("created_at, service_id, address_id"),
      supabase.from("services").select("id, service_categories(name)"),
      supabase.from("addresses").select("id, city"),
    ]);

    const bookings  = bookingsRes.data  ?? [];
    const services  = servicesRes.data  ?? [];
    const addresses = addressesRes.data ?? [];

    if (bookings.length > 0) {
      forecasts = computeDemandForecasts(bookings, services as any, addresses);
      isDemo = false;
    }
  }

  return (
    <PageShell
      title="Platform Analytics & Performance"
      description="Real-time demand trends, revenue summaries, and cooperative performance metrics."
    >
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

      {/* Analytics Charts */}
      <AnalyticsCharts trends={trends} categories={categories} regions={regions} topWorkers={topWorkers} />

      {/* AI Demand Forecasting */}
      <div className="mt-6">
        <DemandForecastPanel forecasts={forecasts} isDemo={isDemo} />
      </div>
    </PageShell>
  );
}
