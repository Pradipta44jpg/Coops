"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { CustomerDashboard } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><CustomerDashboard /></DashboardProvider>;
}
