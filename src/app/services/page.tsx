"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { ServicesPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><ServicesPage /></DashboardProvider>;
}
