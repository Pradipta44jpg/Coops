"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  Bell, BriefcaseBusiness, CalendarDays, ChevronRight,
  CircleDollarSign, ClipboardList, FileWarning, Home,
  LogOut, Menu, Settings2, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSession } from "./hooks";
import type { Route } from "next";

type CWRole = "customer" | "worker" | "cooperative_admin";

const customerNav = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/services", label: "Find a service", icon: Wrench },
  { href: "/bookings", label: "My bookings", icon: CalendarDays },
  { href: "/complaints", label: "Complaints", icon: FileWarning },
];
const workerNav = [
  { href: "/worker/dashboard", label: "Overview", icon: Home },
  { href: "/worker/requests", label: "Job requests", icon: ClipboardList },
  { href: "/worker/bookings", label: "My jobs", icon: CalendarDays },
  { href: "/worker/availability", label: "Availability", icon: Settings2 },
  { href: "/worker/earnings", label: "Earnings", icon: CircleDollarSign },
];
const adminNav = [
  { href: "/admin/dashboard", label: "Overview", icon: Home },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/bookings", label: "All bookings", icon: CalendarDays },
];

function roleLabel(role: CWRole) {
  return role === "cooperative_admin" ? "Cooperative admin" : role === "worker" ? "Worker" : "Customer";
}

export function PageLoading() {
  return (
    <main className="page">
      <div className="skeleton" style={{ height: 34, width: "35%", marginBottom: 28 }} />
      <div className="metric-grid">
        {[1,2,3,4].map(n => (
          <div className="panel metric-card" key={n}>
            <div className="skeleton" style={{ height: 11, width: "52%" }} />
            <div className="skeleton" style={{ height: 27, width: "42%", marginTop: 14 }} />
          </div>
        ))}
      </div>
      <div className="panel" style={{ height: 260 }} />
    </main>
  );
}

export function PageError({ message = "We could not load this workspace." }: { message?: string }) {
  return (
    <main className="page">
      <div className="error-state"><strong>{message}</strong></div>
    </main>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status}`}>{status.replaceAll("_", " ")}</span>;
}

export function Avatar({ initials, tone = "default" }: { initials: string; tone?: string }) {
  return <div className="avatar">{initials}</div>;
}

export function EmptyState({ icon: Icon = BriefcaseBusiness, title, message, action }: {
  icon?: LucideIcon; title: string; message: string; action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={21} /></div>
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sessionQuery = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (
    (typeof window !== "undefined" ? localStorage.getItem("coopwork-role") : null) ||
    sessionQuery.data?.role ||
    "customer"
  ) as CWRole;

  const nav = role === "worker" ? workerNav : role === "cooperative_admin" ? adminNav : customerNav;

  async function handleSignOut() {
    const sb = getSupabaseBrowserClient();
    if (sb) {
      await sb.auth.signOut();
      if (typeof window !== "undefined") localStorage.removeItem("coopwork-role");
    }
    router.push("/");
  }

  const initials = sessionQuery.data?.name?.slice(0,2).toUpperCase() ?? "CW";

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar${mobileOpen ? " !flex" : ""}`} style={mobileOpen ? { display: "flex", position: "fixed", zIndex: 40, height: "100dvh" } : undefined}>
        <div className="sidebar-brand">
          <div className="brand-mark">cw</div>
          <div className="brand-name">CoopWork</div>
        </div>
        <div className="sidebar-label">{roleLabel(role)} workspace</div>
        <nav className="nav-list">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href as Route} className={`nav-item${pathname === href ? " active" : ""}`} onClick={() => setMobileOpen(false)}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              {pathname === href && <ChevronRight size={13} style={{ marginLeft: "auto" }} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href={"/profile" as Route} className={`nav-item${pathname === "/profile" ? " active" : ""}`} onClick={() => setMobileOpen(false)}>
            <Users size={16} strokeWidth={1.8} /><span>Profile</span>
          </Link>
          <button className="nav-item" style={{ border: 0, background: "transparent" }} onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={1.8} /><span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 39 }} onClick={() => setMobileOpen(false)} />}

      <div className="main-wrap">
        <header className="topbar">
          <button className="icon-btn mobile-menu" style={{ display: "none" }} onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
            <Menu size={17} />
          </button>
          <div className="crumb">
            <span>COOP /</span>{" "}
            {pathname.replace("/", "").replaceAll("/", " / ") || "overview"}
          </div>
          <div className="topbar-actions">
            <span className="role-pill">{roleLabel(role)}</span>
            <button className="icon-btn" onClick={() => window.alert("You are all caught up.")} aria-label="Notifications">
              <Bell size={16} />
            </button>
            <Link href={"/profile" as Route} className="avatar">{initials}</Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
