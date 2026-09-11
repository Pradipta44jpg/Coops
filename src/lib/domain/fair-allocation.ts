/**
 * Cooperative Fair-Work Allocation Engine
 *
 * The goal: prevent a small number of high-rated workers from receiving all
 * jobs, ensuring equitable income distribution across all cooperative members.
 *
 * Algorithm:
 *  1. Start with the existing match score (skill, distance, availability,
 *     rating, experience).
 *  2. Apply a WORKLOAD PENALTY based on how many jobs the worker completed
 *     in the last 30 days relative to the busiest worker in the candidate pool.
 *  3. The penalty is soft — a top-rated worker still wins if the difference
 *     is large, but a similarly-scored idle worker gets a meaningful boost.
 *
 * Fair Allocation Score =
 *   Match Score × (1 - WORKLOAD_WEIGHT) + IdleBonus × WORKLOAD_WEIGHT
 *
 * Where:
 *   WORKLOAD_WEIGHT = 0.25  (25% of final score is fairness, 75% is merit)
 *   IdleBonus       = (1 - recentJobs / maxRecentJobs) × 100
 *
 * This means:
 *   - A worker with 0 recent jobs gets full IdleBonus (100 points).
 *   - The busiest worker gets 0 IdleBonus.
 *   - The merit score still dominates (75%).
 */

export const WORKLOAD_WEIGHT = 0.25;

export type WorkloadInfo = {
  workerId: string;
  /** Number of completed bookings in the last 30 days */
  recentJobs: number;
};

export type FairAllocationInput = {
  workerId: string;
  matchScore: number;
  recentJobs: number;
};

export type FairAllocationResult = {
  workerId: string;
  matchScore: number;
  recentJobs: number;
  idleBonus: number;
  fairScore: number;
  /** Human-readable workload label */
  workloadLabel: "Underutilised" | "Active" | "Busy" | "High Load";
};

function workloadLabel(recentJobs: number): FairAllocationResult["workloadLabel"] {
  if (recentJobs === 0) return "Underutilised";
  if (recentJobs <= 3)  return "Active";
  if (recentJobs <= 8)  return "Busy";
  return "High Load";
}

/**
 * Takes the full candidate pool, calculates fair allocation scores,
 * and returns results sorted by fairScore descending.
 */
export function applyFairAllocation(candidates: FairAllocationInput[]): FairAllocationResult[] {
  if (candidates.length === 0) return [];

  const maxRecentJobs = Math.max(...candidates.map((c) => c.recentJobs), 1);

  return candidates
    .map((c) => {
      const idleBonus = ((1 - c.recentJobs / maxRecentJobs) * 100);
      const fairScore = Math.round(
        c.matchScore * (1 - WORKLOAD_WEIGHT) + idleBonus * WORKLOAD_WEIGHT
      );

      return {
        workerId: c.workerId,
        matchScore: c.matchScore,
        recentJobs: c.recentJobs,
        idleBonus: Math.round(idleBonus),
        fairScore,
        workloadLabel: workloadLabel(c.recentJobs),
      };
    })
    .sort((a, b) => b.fairScore - a.fairScore);
}
