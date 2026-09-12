"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { AdminWorkersPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><AdminWorkersPage /></DashboardProvider>;
}
