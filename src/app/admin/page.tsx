import Link from "next/link";
import type { Route } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/state";
import { requireRole } from "@/lib/auth/server";

export default async function AdminPage() {
  const session = await requireRole("platform_admin");
  if (!session.supabase) return <PageShell title="Platform administration"><EmptyState title="Connect Supabase" body="Platform administration requires a configured Supabase connection." /></PageShell>;

  const supabase = session.supabase;
  const [users, workers, cooperatives, bookings, payments, complaints] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("workers").select("profile_id", { count: "exact", head: true }),
    supabase.from("cooperatives").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("id", { count: "exact", head: true }),
    supabase.from("complaints").select("id", { count: "exact", head: true }).in("status", ["open", "under_review", "escalated"])
  ]);
  const metrics = [["Users", users.count], ["Workers", workers.count], ["Cooperatives", cooperatives.count], ["Bookings", bookings.count], ["Payments", payments.count], ["Open complaints", complaints.count]];
  return <PageShell title="Platform administration" description="Live platform records available to authorized administrators."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <article key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-3xl font-medium">{value ?? 0}</p></article>)}</div><div className="mt-6 flex flex-wrap gap-3"><Link href={"/admin/users" as Route} className="rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-medium text-white">Users & Roles</Link><Link href={"/admin/analytics" as Route} className="rounded-xl bg-[#ef4d23] px-4 py-3 text-sm font-medium text-white flex items-center gap-2">Analytics & Reports</Link><Link href={"/admin/analytics/ai-forecasting" as Route} className="rounded-xl border border-[#ef4d23] bg-[#fff5f2] px-4 py-3 text-sm font-medium text-[#ef4d23] flex items-center gap-2">🧠 AI Demand Forecasting</Link><Link href={"/admin/services" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Services</Link><Link href={"/admin/bookings" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Bookings</Link><Link href={"/admin/payments" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Payments</Link><Link href={"/admin/complaints" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Complaints</Link><Link href={"/operations/verification" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Worker Verification</Link></div>{[users, workers, cooperatives, bookings, payments, complaints].some((result) => result.error) ? <EmptyState title="Some admin data is unavailable" body="One or more platform aggregates could not be loaded. Check the database permissions and try again." /> : null}</PageShell>;
}
