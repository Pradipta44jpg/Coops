"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { AdminDashboard } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><AdminDashboard /></DashboardProvider>;
}
