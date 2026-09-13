import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/cooperatives/:id/services
 *
 * Returns active services available for the given cooperative:
 * 1. First tries to find services already offered by workers in that cooperative.
 * 2. Falls back to all active platform services when the cooperative has no workers yet.
 */
export async function GET(_request: Request, { params }: Context) {
  const { id: cooperativeId } = await params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  // Step 1: Get worker IDs that belong to this cooperative
  const { data: workerRows } = await supabase
    .from("workers")
    .select("profile_id")
    .eq("cooperative_id", cooperativeId)
    .eq("verification_status", "verified")
    .limit(100);

  const workerIds = (workerRows ?? []).map((w) => w.profile_id);

  if (workerIds.length > 0) {
    // Step 2: Get distinct services those workers offer
    const { data: wsRows } = await supabase
      .from("worker_services")
      .select("services(id, name)")
      .in("worker_id", workerIds)
      .limit(100);

    const seen = new Set<string>();
    const services: { id: string; name: string }[] = [];

    for (const row of wsRows ?? []) {
      const svc = (row as any).services as { id: string; name: string } | null;
      if (svc && !seen.has(svc.id)) {
        seen.add(svc.id);
        services.push(svc);
      }
    }

    if (services.length > 0) {
      services.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ services });
    }
  }

  // Fallback: no workers (or no worker_services) — return all active platform services
  const { data: allServices } = await supabase
    .from("services")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .limit(60);

  return NextResponse.json({ services: allServices ?? [] });
}
