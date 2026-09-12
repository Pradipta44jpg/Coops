"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { ProfilePage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><ProfilePage /></DashboardProvider>;
}
