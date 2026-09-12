"use client";
import { DashboardProvider } from "@/features/role-dashboard/provider";
import { BookingsPage } from "@/features/role-dashboard/pages";
export default function Page() {
  return <DashboardProvider><BookingsPage workerView /></DashboardProvider>;
}
