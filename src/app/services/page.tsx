import { PageShell } from "@/components/layout/page-shell";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { getServiceCategories, discoverWorkers } from "@/features/discovery/data";
import { SearchForm } from "@/features/discovery/search-form";
import { WorkerResults } from "@/features/discovery/worker-results";
import { WorkerMapToggle } from "@/features/discovery/worker-map-toggle";
import type { WorkerMapPin } from "@/features/discovery/worker-map";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    latitude?: string;
    longitude?: string;
    minRating?: string;
    maxDistance?: string;
    minExperience?: string;
  }>;
};

export default async function ServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const latitude = params.latitude ? Number(params.latitude) : undefined;
  const longitude = params.longitude ? Number(params.longitude) : undefined;
  const minRating = params.minRating ? Number(params.minRating) : undefined;
  const maxDistance = params.maxDistance ? Number(params.maxDistance) : undefined;
  const minExperience = params.minExperience ? Number(params.minExperience) : undefined;

  const [categories, workers] = await Promise.all([
    getServiceCategories(),
    discoverWorkers({
      query: params.q,
      category: params.category,
      city: params.city,
      latitude,
      longitude,
      minRating,
      maxDistance,
      minExperience
    })
  ]);

  // Build map pins from workers that have geocoded coordinates
  const mapPins: WorkerMapPin[] = workers.data
    .filter((w) => w.latitude !== null && w.longitude !== null)
    .map((w) => ({
      workerId: w.workerId,
      fullName: w.fullName,
      serviceName: w.serviceName,
      city: w.city,
      latitude: w.latitude as number,
      longitude: w.longitude as number,
      fairScore: w.fairScore,
      averageRating: w.averageRating,
    }));

  return (
    <PageShell title="Service Discovery" description="Search and rank verified workers using service, availability, rating, experience, and location signals.">
      <div className="space-y-5">
        <SearchForm
          categories={categories.data}
          defaultQuery={params.q}
          defaultCategory={params.category}
          defaultCity={params.city}
          defaultLatitude={latitude}
          defaultLongitude={longitude}
          defaultMinRating={params.minRating}
          defaultMaxDistance={params.maxDistance}
          defaultMinExperience={params.minExperience}
        />
        {categories.error ? <ErrorState message={categories.error} /> : null}
        {workers.error ? <ErrorState message={workers.error} /> : null}
        {!workers.error && workers.data.length === 0 ? (
          <EmptyState
            title="No workers found"
            body="Try a different category, service name, or city. Once workers are verified and linked to services in Supabase, they will appear here."
          />
        ) : (
          <WorkerMapToggle
            pins={mapPins}
            centerLatitude={latitude}
            centerLongitude={longitude}
          >
            <WorkerResults workers={workers.data} />
          </WorkerMapToggle>
        )}
      </div>
    </PageShell>
  );
}
