import { describe, expect, it } from "vitest";
import { calculateWorkerScore, rankWorkers, type WorkerCandidate } from "./matching";

const candidate: WorkerCandidate = {
  workerId: "worker-1",
  fullName: "Worker",
  serviceName: "Fan repair",
  city: "Kolkata",
  latitude: 22.5726,
  longitude: 88.3639,
  distanceKm: 0,
  yearsExperience: 10,
  averageRating: 5,
  completedJobs: 0,
  isAvailable: true,
  skillMatch: true,
  serviceRequirementMatch: true
};

describe("matching domain", () => {
  it("uses the full PRD score when every signal matches", () => {
    expect(calculateWorkerScore(candidate)).toBe(100);
  });

  it("ranks stronger candidates first without inventing ties", () => {
    expect(rankWorkers([candidate, { ...candidate, workerId: "worker-2", isAvailable: false }])[0]?.workerId).toBe("worker-1");
  });
});
