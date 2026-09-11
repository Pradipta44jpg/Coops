export type WorkerCandidate = {
  workerId: string;
  fullName: string;
  serviceName: string;
  city: string | null;
  /** Worker's geocoded latitude — null if address not geocoded yet */
  latitude: number | null;
  /** Worker's geocoded longitude — null if address not geocoded yet */
  longitude: number | null;
  distanceKm: number | null;
  yearsExperience: number;
  averageRating: number;
  completedJobs: number;
  isAvailable: boolean;
  skillMatch: boolean;
  serviceRequirementMatch: boolean;
};

export type RankedWorker = WorkerCandidate & {
  score: number;
  /** Jobs completed in the last 30 days — used for fair allocation */
  recentJobs: number;
  /** Fair allocation score after applying workload penalty (0–100) */
  fairScore: number;
  /** Human-readable workload label */
  workloadLabel: "Underutilised" | "Active" | "Busy" | "High Load";
};

export function calculateWorkerScore(candidate: WorkerCandidate) {
  const skill = candidate.skillMatch ? 30 : 0;
  const distance = candidate.distanceKm === null ? 0 : Math.max(0, 20 - Math.min(candidate.distanceKm, 20));
  const availability = candidate.isAvailable ? 20 : 0;
  const rating = (Math.min(candidate.averageRating, 5) / 5) * 15;
  const experience = (Math.min(candidate.yearsExperience, 10) / 10) * 10;
  const serviceRequirement = candidate.serviceRequirementMatch ? 5 : 0;

  return Math.round((skill + distance + availability + rating + experience + serviceRequirement) * 100) / 100;
}

export function rankWorkers(candidates: WorkerCandidate[]): RankedWorker[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: calculateWorkerScore(candidate),
      recentJobs: 0,
      fairScore: calculateWorkerScore(candidate),
      workloadLabel: "Active" as const,
    }))
    .sort((a, b) => b.score - a.score || b.averageRating - a.averageRating || b.completedJobs - a.completedJobs);
}
