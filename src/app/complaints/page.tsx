"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { ComplaintsPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><ComplaintsPage /></DashboardProvider>;
}
