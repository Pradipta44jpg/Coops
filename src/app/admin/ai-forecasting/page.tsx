import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/state";
import { requireRole, getCurrentUser } from "@/lib/auth/server";
import { computeDemandForecasts, DEMO_FORECASTS } from "@/lib/domain/demand-forecast";
import { ForecastDashboard } from "./forecast-dashboard";

export const metadata = { title: "AI Demand Forecasting — Admin" };

export default async function AiForecastingPage() {
  // Platform admins and cooperative admins can access this page
  await requireRole(["platform_admin", "cooperative_admin"]);

  const session = await getCurrentUser();

  if (!session.supabase) {
    return (
      <PageShell title="AI Demand Forecasting">
        <EmptyState
          title="Connect Supabase"
          body="AI Demand Forecasting requires a configured Supabase connection."
        />
      </PageShell>
    );
  }

  const supabase = session.supabase;

  // Fetch the three raw tables the forecast engine needs
  const [bookingsRes, servicesRes, addressesRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("created_at, service_id, address_id")
      .gte(
        "created_at",
        new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("services")
      .select("id, service_categories(name)"),
    supabase
      .from("addresses")
      .select("id, city"),
  ]);

  const bookings  = bookingsRes.data  ?? [];
  const services  = servicesRes.data  ?? [];
  const addresses = addressesRes.data ?? [];

  // Use live data when booking history exists; fall back to demo set
  let forecasts = DEMO_FORECASTS;
  let isDemo    = true;

  if (bookings.length > 0) {
    forecasts = computeDemandForecasts(
      bookings,
      services as Parameters<typeof computeDemandForecasts>[1],
      addresses
    );
    isDemo = false;
  }

  return (
    <PageShell
      title="AI Demand Forecasting"
      description="Predict next-week service demand by region and category so cooperatives can proactively arrange workers."
    >
      <ForecastDashboard forecasts={forecasts} isDemo={isDemo} />
    </PageShell>
  );
}
