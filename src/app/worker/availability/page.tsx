"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { AvailabilityPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><AvailabilityPage /></DashboardProvider>;
}
