"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { WorkerDashboard } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><WorkerDashboard /></DashboardProvider>;
}
