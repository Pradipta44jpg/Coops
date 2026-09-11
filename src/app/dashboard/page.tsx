import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/state";
import { requireUser } from "@/lib/auth/server";
import { CalendarCheck, CheckCircle2, CircleAlert, Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

type Metric = { label: string; value: number | string; icon: typeof Users };

function Metrics({ metrics }: { metrics: Metric[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-[var(--line)] bg-white p-5"><Icon size={19} className="text-[#ef4d23]" /><p className="mt-6 text-sm text-neutral-500">{label}</p><p className="mt-1 text-3xl font-medium tracking-tight">{value}</p></article>)}</div>;
}

async function countBookingsByOwner(query: NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>, column: "customer_id" | "worker_id", userId: string) {
  const result = await query.from("bookings").select("id", { count: "exact", head: true }).eq(column, userId);
  return result.count ?? 0;
}

export default async function DashboardPage() {
    const session = await requireUser();
    if (!session.supabase) return <PageShell title="Dashboard"><EmptyState title="Connect Supabase" body="The dashboard needs a configured Supabase connection." /></PageShell>;

    const isPlatformAdmin = session.roles.includes("platform_admin");
    const isCooperativeAdmin = session.roles.includes("cooperative_admin");
    const isWorker = session.roles.includes("worker");
    const isCustomer = session.roles.includes("customer");

    if (isPlatformAdmin || isCooperativeAdmin) {
      const cooperativeIds = isPlatformAdmin
        ? null
        : ((await session.supabase.from("cooperative_members").select("cooperative_id").eq("profile_id", session.user.id)).data ?? []).map((item) => item.cooperative_id);
      const cooperativeWorkerIds = cooperativeIds
        ? ((await session.supabase.from("workers").select("profile_id").in("cooperative_id", cooperativeIds)).data ?? []).map((item) => item.profile_id)
        : null;
      const [workers, activeWorkers, bookings, completedJobs] = await Promise.all([
        cooperativeIds ? session.supabase.from("workers").select("profile_id", { count: "exact", head: true }).in("cooperative_id", cooperativeIds) : session.supabase.from("workers").select("profile_id", { count: "exact", head: true }),
        cooperativeIds ? session.supabase.from("workers").select("profile_id", { count: "exact", head: true }).in("cooperative_id", cooperativeIds).eq("active", true) : session.supabase.from("workers").select("profile_id", { count: "exact", head: true }).eq("active", true),
        cooperativeWorkerIds?.length ? session.supabase.from("bookings").select("id", { count: "exact", head: true }).in("worker_id", cooperativeWorkerIds) : cooperativeIds ? Promise.resolve({ count: 0, error: null }) : session.supabase.from("bookings").select("id", { count: "exact", head: true }),
        cooperativeWorkerIds?.length ? session.supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").in("worker_id", cooperativeWorkerIds) : cooperativeIds ? Promise.resolve({ count: 0, error: null }) : session.supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed")
      ]);
      return <PageShell title={isPlatformAdmin ? "Platform Dashboard" : "Cooperative Dashboard"} description="Live operational totals from the workers and bookings you are authorized to view."><Metrics metrics={[{ label: "Total workers", value: workers.count ?? 0, icon: Users }, { label: "Active workers", value: activeWorkers.count ?? 0, icon: CheckCircle2 }, { label: "Total bookings", value: bookings.count ?? 0, icon: CalendarCheck }, { label: "Completed jobs", value: completedJobs.count ?? 0, icon: CircleAlert }]} /><div className="mt-6 flex flex-wrap gap-3"><Link href={"/admin/analytics" as Route} className="rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-medium text-white">View Analytics & Reports</Link><Link href={"/admin" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Platform Administration</Link></div>{!isPlatformAdmin && !cooperativeIds?.length ? <p className="mt-5 text-sm text-neutral-500">Your account is not linked to a cooperative yet.</p> : null}</PageShell>;
    }

    const [requests, completed] = await Promise.all([countBookingsByOwner(session.supabase, isWorker ? "worker_id" : "customer_id", session.user.id), session.supabase.from("bookings").select("id", { count: "exact", head: true }).eq(isWorker ? "worker_id" : "customer_id", session.user.id).eq("status", "completed")]);
    const metrics = isWorker ? [{ label: "Assigned requests", value: requests, icon: CalendarCheck }, { label: "Completed jobs", value: completed.count ?? 0, icon: CheckCircle2 }] : isCustomer ? [{ label: "Your requests", value: requests, icon: CalendarCheck }, { label: "Completed services", value: completed.count ?? 0, icon: CheckCircle2 }] : [];
    return <PageShell title="Your Dashboard" description="Your activity across the Coops service network.">{metrics.length ? <><Metrics metrics={metrics} /><div className="mt-6 flex flex-wrap gap-3">{isWorker ? <Link href={"/profile/worker" as Route} className="rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-medium text-white">Edit worker profile</Link> : null}<Link href={"/invoices" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">View Invoices</Link><Link href={"/payments" as Route} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium">Payment History</Link></div></> : <EmptyState title="Choose a platform role" body="Your account is authenticated, but it does not have a customer, worker, cooperative, or administrator role yet." />}</PageShell>;
}
