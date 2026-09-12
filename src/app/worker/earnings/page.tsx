"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { EarningsPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><EarningsPage /></DashboardProvider>;
}
