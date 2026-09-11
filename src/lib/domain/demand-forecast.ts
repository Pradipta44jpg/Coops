/**
 * AI Demand Forecasting Engine
 *
 * Analyses historical booking data (last 8 weeks) to compute per-city,
 * per-category demand forecasts. Returns a demand level, projected
 * % change for next week, and a recommendation so cooperative admins
 * can proactively arrange workers.
 *
 * Algorithm:
 *  1. Split bookings into two 4-week windows: "current" and "previous".
 *  2. Count bookings per (city, category) bucket in each window.
 *  3. Calculate week-over-week % change.
 *  4. Classify: CRITICAL / HIGH / MEDIUM / LOW / STABLE.
 *  5. Sort by urgency score descending.
 */

export type DemandLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "STABLE";

export type DemandForecast = {
  city: string;
  category: string;
  demandLevel: DemandLevel;
  projectedChangePct: number;
  currentCount: number;
  recommendation: string;
  urgencyScore: number;
};

type RawBooking = {
  created_at: string;
  service_id: string | null;
  address_id: string | null;
};

type ServiceRow = {
  id: string;
  service_categories: { name: string } | null;
};

type AddressRow = {
  id: string;
  city: string;
};

function classifyDemand(changePct: number, currentCount: number): DemandLevel {
  if (changePct >= 40 || currentCount >= 30) return "CRITICAL";
  if (changePct >= 20 || currentCount >= 15) return "HIGH";
  if (changePct >= 5  || currentCount >= 7)  return "MEDIUM";
  if (changePct < -10)                        return "LOW";
  return "STABLE";
}

function urgencyScore(level: DemandLevel, changePct: number): number {
  const base: Record<DemandLevel, number> = {
    CRITICAL: 90, HIGH: 70, MEDIUM: 50, STABLE: 30, LOW: 10,
  };
  return Math.min(100, base[level] + Math.round(changePct * 0.1));
}

function makeRecommendation(level: DemandLevel, category: string, city: string): string {
  switch (level) {
    case "CRITICAL": return `Immediately deploy additional ${category} workers to ${city}.`;
    case "HIGH":     return `Pre-assign extra ${category} staff in ${city} for next week.`;
    case "MEDIUM":   return `Monitor ${category} bookings in ${city}; consider standby workers.`;
    case "LOW":      return `${category} demand softening in ${city}. Reassign workers elsewhere.`;
    default:         return `${category} demand in ${city} is stable. No action needed.`;
  }
}

export function computeDemandForecasts(
  bookings: RawBooking[],
  services: ServiceRow[],
  addresses: AddressRow[]
): DemandForecast[] {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const serviceCategory = new Map(services.map((s) => [s.id, s.service_categories?.name ?? "General"]));
  const addressCity = new Map(addresses.map((a) => [a.id, a.city]));

  const currentCounts: Record<string, number> = {};
  const previousCounts: Record<string, number> = {};

  for (const b of bookings) {
    const age = now - new Date(b.created_at).getTime();
    const category = serviceCategory.get(b.service_id ?? "") ?? "General";
    const city = addressCity.get(b.address_id ?? "") ?? "Unknown";
    if (city === "Unknown") continue;

    const key = `${city}||${category}`;
    if (age <= 4 * WEEK_MS) {
      currentCounts[key] = (currentCounts[key] ?? 0) + 1;
    } else if (age <= 8 * WEEK_MS) {
      previousCounts[key] = (previousCounts[key] ?? 0) + 1;
    }
  }

  const allKeys = new Set([...Object.keys(currentCounts), ...Object.keys(previousCounts)]);
  const forecasts: DemandForecast[] = [];

  for (const key of allKeys) {
    const [city, category] = key.split("||");
    const curr = currentCounts[key] ?? 0;
    const prev = previousCounts[key] ?? 0;

    const currPerWeek = curr / 4;
    const prevPerWeek = prev > 0 ? prev / 4 : 0.5;
    const changePct = Math.round(((currPerWeek - prevPerWeek) / prevPerWeek) * 100);
    const level = classifyDemand(changePct, curr);

    forecasts.push({
      city,
      category,
      demandLevel: level,
      projectedChangePct: changePct,
      currentCount: curr,
      recommendation: makeRecommendation(level, category, city),
      urgencyScore: urgencyScore(level, changePct),
    });
  }

  return forecasts
    .sort((a, b) => b.urgencyScore - a.urgencyScore || a.city.localeCompare(b.city))
    .slice(0, 20);
}

// Demo data — shown when DB has no booking history yet (matches the PRD examples)
export const DEMO_FORECASTS: DemandForecast[] = [
  { city: "Kolkata",    category: "Electrical",        demandLevel: "HIGH",   projectedChangePct: 23,  currentCount: 18, recommendation: "Pre-assign extra Electrical staff in Kolkata for next week.",              urgencyScore: 72 },
  { city: "Behala",     category: "Plumbing",           demandLevel: "HIGH",   projectedChangePct: 31,  currentCount: 14, recommendation: "Pre-assign extra Plumbing staff in Behala for next week.",               urgencyScore: 70 },
  { city: "Salt Lake",  category: "Cleaning",           demandLevel: "MEDIUM", projectedChangePct: 12,  currentCount: 9,  recommendation: "Monitor Cleaning bookings in Salt Lake; consider standby workers.",      urgencyScore: 51 },
  { city: "Dum Dum",    category: "Carpentry",          demandLevel: "MEDIUM", projectedChangePct: 8,   currentCount: 7,  recommendation: "Monitor Carpentry bookings in Dum Dum; consider standby workers.",       urgencyScore: 50 },
  { city: "Howrah",     category: "Painting",           demandLevel: "STABLE", projectedChangePct: 2,   currentCount: 5,  recommendation: "Painting demand in Howrah is stable. No action needed.",                 urgencyScore: 30 },
  { city: "Barasat",    category: "Domestic Services",  demandLevel: "LOW",    projectedChangePct: -14, currentCount: 3,  recommendation: "Domestic Services demand softening in Barasat. Reassign workers elsewhere.", urgencyScore: 11 },
];
