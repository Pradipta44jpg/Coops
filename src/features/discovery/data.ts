import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rankWorkers, type RankedWorker, type WorkerCandidate } from "@/lib/domain/matching";
import { applyFairAllocation } from "@/lib/domain/fair-allocation";

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type DiscoveryFilters = {
  query?: string;
  category?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  scheduledAt?: string;
  requirement?: string;
  minRating?: number;
  maxDistance?: number;
  minExperience?: number;
};

function databaseError(message: string) {
  if (message.includes("schema cache") || message.includes("does not exist")) {
    return "Supabase is connected, but the database schema is not installed. Run the SQL files in supabase/migrations and supabase/seed.sql in your Supabase project, then reload this page.";
  }

  return message;
}

type WorkerServiceRow = {
  worker_id: string;
  service_id: string;
  base_price_cents: number | null;
  services: {
    id: string;
    name: string;
    slug: string;
    category_id: string;
    service_categories: {
      name: string;
      slug: string;
    } | null;
  } | null;
  workers: {
    profile_id: string;
    years_experience: number;
    completed_jobs: number;
    active: boolean;
    verification_status: string;
    profiles: {
      full_name: string;
    } | null;
  } | null;
};

type AddressRow = {
  profile_id: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

type ReviewRow = {
  worker_id: string;
  rating: number;
};

type AvailabilityRow = {
  worker_id: string;
  day_of_week: number;
  is_active: boolean;
};

type SkillRow = { worker_id: string; name: string };

function distanceInKm(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const earthRadius = 6371;
  const latitudeDelta = (targetLatitude - latitude) * Math.PI / 180;
  const longitudeDelta = (targetLongitude - longitude) * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(targetLatitude * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function getServiceCategories() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { data: [] as ServiceCategory[], error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase
    .from("service_categories")
    .select("id,name,slug,description")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return { data: [] as ServiceCategory[], error: databaseError(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function discoverWorkers(filters: DiscoveryFilters) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { data: [] as RankedWorker[], error: "Supabase is not configured yet." };
  }

  let query = supabase
    .from("worker_services")
    .select(`
      worker_id,
      service_id,
      base_price_cents,
      services!inner(id,name,slug,category_id,service_categories(name,slug)),
      workers!inner(profile_id,years_experience,completed_jobs,active,verification_status,profiles(full_name))
    `)
    .eq("workers.active", true)
    .eq("workers.verification_status", "verified")
    .limit(24);

  if (filters.category) {
    query = query.eq("services.service_categories.slug", filters.category);
  }

  if (filters.query) {
    query = query.ilike("services.name", `%${filters.query}%`);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [] as RankedWorker[], error: databaseError(error.message) };
  }

  const rows = (data ?? []) as unknown as WorkerServiceRow[];
  const workerIds = rows.map((row) => row.worker_id);

  const [{ data: locations }, { data: reviews }, { data: availability }, { data: skills }, { data: recentBookings }] = await Promise.all([
    supabase.rpc("get_public_worker_locations"),
    supabase.from("reviews").select("worker_id,rating").in("worker_id", workerIds),
    supabase.from("worker_availability").select("worker_id,day_of_week,is_active").in("worker_id", workerIds).eq("is_active", true),
    supabase.from("worker_skills").select("worker_id,name").in("worker_id", workerIds),
    supabase.from("bookings")
      .select("worker_id,created_at")
      .in("worker_id", workerIds)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  const addressRows = (locations ?? []) as unknown as AddressRow[];
  const reviewRows = (reviews ?? []) as unknown as ReviewRow[];
  const availabilityRows = (availability ?? []) as unknown as AvailabilityRow[];
  const skillRows = (skills ?? []) as unknown as SkillRow[];

  const addressByWorker = new Map(addressRows.map((address) => [address.profile_id, address]));
  const ratingsByWorker = new Map<string, number[]>();
  for (const review of reviewRows) {
    const ratings = ratingsByWorker.get(review.worker_id) ?? [];
    ratings.push(review.rating);
    ratingsByWorker.set(review.worker_id, ratings);
  }
  const availableWorkers = new Set(availabilityRows.map((item) => item.worker_id));
  const skillsByWorker = new Map<string, string[]>();
  for (const skill of skillRows) skillsByWorker.set(skill.worker_id, [...(skillsByWorker.get(skill.worker_id) ?? []), skill.name]);

  // Recent jobs count per worker (last 30 days) for fair allocation
  const recentJobsCount = new Map<string, number>();
  for (const booking of (recentBookings ?? [])) {
    recentJobsCount.set(booking.worker_id, (recentJobsCount.get(booking.worker_id) ?? 0) + 1);
  }
  const requestedDay = filters.scheduledAt ? new Date(filters.scheduledAt).getDay() : null;
  const requestedTokens = (filters.requirement ?? filters.query ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);

  const candidates: WorkerCandidate[] = rows
    .map((row): WorkerCandidate | null => {
      const worker = row.workers;
      const service = row.services;
      if (!worker || !service) {
        return null;
      }

      const address = addressByWorker.get(row.worker_id);
      if (filters.city && address?.city?.toLowerCase() !== filters.city.toLowerCase()) {
        return null;
      }

      const ratings = ratingsByWorker.get(row.worker_id) ?? [];
      const averageRating = ratings.length
        ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
        : 0;

      if (filters.minRating !== undefined && averageRating > 0 && averageRating < filters.minRating) {
        return null;
      }

      if (filters.minExperience !== undefined && worker.years_experience < filters.minExperience) {
        return null;
      }

      const workerSkills = skillsByWorker.get(row.worker_id) ?? [];
      const searchableText = [service.name, ...workerSkills].join(" ").toLowerCase();
      const skillMatch = requestedTokens.length === 0 || requestedTokens.some((token) => searchableText.includes(token));
      const serviceRequirementMatch = requestedTokens.length === 0 || requestedTokens.some((token) => service.name.toLowerCase().includes(token));
      const workerAvailableOnRequestedDay = requestedDay === null || availabilityRows.some((item) => item.worker_id === row.worker_id && item.day_of_week === requestedDay);
      const distanceKm = filters.latitude !== undefined && filters.longitude !== undefined && address?.latitude !== null && address?.longitude !== null && address?.latitude !== undefined && address?.longitude !== undefined
        ? distanceInKm(address.latitude, address.longitude, filters.latitude, filters.longitude)
        : null;

      if (filters.maxDistance !== undefined && distanceKm !== null && distanceKm > filters.maxDistance) {
        return null;
      }

      return {
        workerId: row.worker_id,
        fullName: worker.profiles?.full_name ?? "Unnamed worker",
        serviceName: service.name,
        city: address?.city ?? null,
        distanceKm,
        yearsExperience: worker.years_experience,
        averageRating,
        completedJobs: worker.completed_jobs,
        isAvailable: availableWorkers.has(row.worker_id) && workerAvailableOnRequestedDay,
        skillMatch,
        serviceRequirementMatch
      };
    })
    .filter((candidate): candidate is WorkerCandidate => candidate !== null);

  const ranked = rankWorkers(candidates);

  // Apply fair-work allocation — boosts underutilised workers by 25%
  const fairResults = applyFairAllocation(
    ranked.map((w) => ({
      workerId: w.workerId,
      matchScore: w.score,
      recentJobs: recentJobsCount.get(w.workerId) ?? 0,
    }))
  );

  const fairMap = new Map(fairResults.map((r) => [r.workerId, r]));

  const finalWorkers: RankedWorker[] = ranked
    .map((w) => {
      const fair = fairMap.get(w.workerId);
      return {
        ...w,
        recentJobs: fair?.recentJobs ?? 0,
        fairScore: fair?.fairScore ?? w.score,
        workloadLabel: fair?.workloadLabel ?? "Active",
      };
    })
    .sort((a, b) => b.fairScore - a.fairScore);

  return { data: finalWorkers, error: null };
}
