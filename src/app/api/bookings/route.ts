import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";

const bookingSchema = z.object({
  workerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledStart: z.coerce.date(),
  requirement: z.string().trim().min(10).max(2000),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    // Optional — sent by the Places-autocomplete path in BookingForm.
    // When absent we fall back to geocoding the text address server-side.
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  }),
});

/**
 * Attempt to geocode a plain-text address using the server-side Google Maps
 * Geocoding API.  Returns null if the API key is missing or the call fails —
 * the booking still succeeds without coordinates.
 */
async function geocodeFallback(
  line1: string,
  city: string,
  state: string
): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(`${line1}, ${city}, ${state}`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: string;
      results?: { geometry: { location: { lat: number; lng: number } } }[];
    };

    if (data.status !== "OK" || !data.results?.[0]) return null;
    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session.user || !session.supabase) {
    return NextResponse.json(
      { error: "Sign in before requesting a booking." },
      { status: 401 }
    );
  }

  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.scheduledStart <= new Date()) {
    return NextResponse.json(
      {
        error:
          "Choose a valid future date, time, service, address, and work description.",
      },
      { status: 400 }
    );
  }

  const { workerId, serviceId, scheduledStart, requirement, address } =
    parsed.data;
  const end = new Date(scheduledStart.getTime() + 60 * 60 * 1000);

  // ── Step 1: Create the booking (and the bare address row) via the RPC ──────
  const { data: bookingId, error } = await session.supabase.rpc(
    "create_booking_request",
    {
      target_worker_id: workerId,
      target_service_id: serviceId,
      target_scheduled_start: scheduledStart.toISOString(),
      target_scheduled_end: end.toISOString(),
      target_line1: address.line1,
      target_city: address.city,
      target_state: address.state,
      target_requirement: requirement,
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("booking") ? 409 : 400 }
    );
  }

  // ── Step 2: Resolve coordinates ───────────────────────────────────────────
  // Prefer client-supplied coords (from Places autocomplete); fall back to
  // server-side geocoding for the manual-entry path.
  let latitude = address.latitude ?? null;
  let longitude = address.longitude ?? null;

  if (latitude === null || longitude === null) {
    const geocoded = await geocodeFallback(
      address.line1,
      address.city,
      address.state
    );
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  // ── Step 3: Patch the address row with the resolved coordinates ───────────
  // The RPC inserted the address row owned by the current user — we update it
  // using the service role client so the SECURITY DEFINER RLS policies don't
  // block us. We do this best-effort: a patch failure does NOT fail the booking.
  if (latitude !== null && longitude !== null) {
    // The address row was just inserted by the RPC for this user; fetch its id
    // by matching profile_id + line1 + city in a single lightweight query.
    const { data: addressRow } = await session.supabase
      .from("addresses")
      .select("id")
      .eq("profile_id", session.user.id)
      .eq("line1", address.line1)
      .eq("city", address.city)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (addressRow?.id) {
      // Best-effort — ignore errors so the booking response is never blocked.
      await session.supabase
        .from("addresses")
        .update({ latitude, longitude })
        .eq("id", addressRow.id);
    }
  }

  return NextResponse.json({ bookingId, geocoded: latitude !== null });
}
