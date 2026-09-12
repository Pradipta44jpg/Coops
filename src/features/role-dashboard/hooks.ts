"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CWRole = "customer" | "worker" | "cooperative_admin";

export type Booking = {
  id: string;
  service: string;
  workerName: string;
  customerName: string;
  address: string;
  date: string;
  time: string;
  status: "requested" | "accepted" | "confirmed" | "worker_en_route" | "in_progress" | "completed" | "cancelled" | "rejected" | "disputed";
  amount: number;
};

export type Worker = {
  id: string;
  name: string;
  skill: string;
  location: string;
  rating: number;
  completedJobs: number;
  status: "available" | "busy" | "unavailable";
  verified: boolean;
};

export type Complaint = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_review" | "resolved";
  date: string;
  bookingId: string;
};

export type Availability = {
  monday: boolean; tuesday: boolean; wednesday: boolean;
  thursday: boolean; friday: boolean; saturday: boolean; sunday: boolean;
  startTime: string; endTime: string;
};

export type SessionInfo = {
  id: string;
  name: string;
  email: string;
  role: CWRole;
  cooperativeId: string | null;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

export type DashboardSummary = {
  metrics: Metric[];
  recentBookings: Booking[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(ts: string | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function toTime(ts: string | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toTimeString().slice(0, 5);
}

// ─── useSession ───────────────────────────────────────────────────────────────

export function useSession() {
  return useQuery<SessionInfo | null>({
    queryKey: ["cw-session"],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return null;
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return null;
      const { data: profile } = await sb.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle();
      const { data: roles } = await sb.from("profile_roles").select("role").eq("profile_id", auth.user.id);
      const roleList = roles?.map((r) => r.role) ?? [];
      let cwRole: CWRole = "customer";
      if (roleList.includes("platform_admin") || roleList.includes("cooperative_admin")) cwRole = "cooperative_admin";
      else if (roleList.includes("worker")) cwRole = "worker";
      const { data: coop } = cwRole === "worker"
        ? await sb.from("workers").select("cooperative_id").eq("profile_id", auth.user.id).maybeSingle()
        : { data: null };
      return {
        id: auth.user.id,
        name: (profile as any)?.full_name ?? auth.user.email?.split("@")[0] ?? "User",
        email: auth.user.email ?? "",
        role: cwRole,
        cooperativeId: (coop as any)?.cooperative_id ?? null,
      };
    },
    staleTime: 60_000,
  });
}

// ─── useDashboardSummary ──────────────────────────────────────────────────────

export function useDashboardSummary(role: CWRole) {
  return useQuery<DashboardSummary>({
    queryKey: ["cw-dashboard-summary", role],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return { metrics: [], recentBookings: [] };
      const { data: auth } = await sb.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { metrics: [], recentBookings: [] };

      if (role === "customer") {
        const [bookingsRes, complaintsRes, paymentsRes] = await Promise.all([
          sb.from("bookings").select("id,status,created_at,scheduled_start,service_id,worker_id,address_id,requirement").eq("customer_id", uid),
          sb.from("complaints").select("id,status").eq("submitted_by", uid),
          sb.from("payments").select("amount_cents").eq("status", "paid"),
        ]);
        const bookings = bookingsRes.data ?? [];
        const active = bookings.filter((b) => ["requested","accepted","confirmed","worker_en_route","in_progress"].includes(b.status)).length;
        const spent = (paymentsRes.data ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);
        const metrics: Metric[] = [
          { label: "Active bookings", value: String(active), detail: `${bookings.length} total`, tone: "primary" },
          { label: "Services used", value: String(bookings.filter(b=>b.status==="completed").length), detail: "completed", tone: "secondary" },
          { label: "Complaints", value: String((complaintsRes.data??[]).length), detail: "filed", tone: "muted" },
          { label: "Total spent", value: `₹${(spent/100).toFixed(0)}`, detail: "all time", tone: "accent" },
        ];
        const recentBookings = await resolveBookings(sb, bookings.slice(0,5), "customer");
        return { metrics, recentBookings };
      }

      if (role === "worker") {
        const [bookingsRes, paymentsRes, reviewsRes] = await Promise.all([
          sb.from("bookings").select("id,status,created_at,scheduled_start,service_id,customer_id,address_id").eq("worker_id", uid),
          sb.from("payments").select("amount_cents,booking_id,status"),
          sb.from("reviews").select("rating").eq("worker_id", uid),
        ]);
        const bookings = bookingsRes.data ?? [];
        const pending = bookings.filter(b=>b.status==="requested").length;
        const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = bookings.filter(b=>new Date(b.created_at)>=monthStart).length;
        const earned = (paymentsRes.data??[]).filter(p=>p.status==="paid").reduce((s,p)=>s+(p.amount_cents??0),0);
        const reviews = reviewsRes.data??[];
        const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : "—";
        const metrics: Metric[] = [
          { label: "Pending requests", value: String(pending), detail: "awaiting response", tone: "primary" },
          { label: "Jobs this month", value: String(thisMonth), detail: "bookings", tone: "secondary" },
          { label: "Earnings (MTD)", value: `₹${(earned/100).toFixed(0)}`, detail: "paid out", tone: "accent" },
          { label: "Avg rating", value: String(avgRating), detail: `${reviews.length} reviews`, tone: "muted" },
        ];
        const recentBookings = await resolveBookings(sb, bookings.slice(0,5), "worker");
        return { metrics, recentBookings };
      }

      // cooperative_admin
      const [workersRes, bookingsRes, complaintsRes, paymentsRes] = await Promise.all([
        sb.from("workers").select("profile_id,active").eq("active", true),
        sb.from("bookings").select("id,status,created_at,scheduled_start,service_id,customer_id,worker_id,address_id").in("status",["requested","accepted","in_progress"]),
        sb.from("complaints").select("id,status").in("status",["open","under_review","escalated"]),
        sb.from("payments").select("amount_cents,status").eq("status","paid"),
      ]);
      const revenue = (paymentsRes.data??[]).reduce((s,p)=>s+(p.amount_cents??0),0);
      const metrics: Metric[] = [
        { label: "Total workers", value: String((workersRes.data??[]).length), detail: "active & verified", tone: "primary" },
        { label: "Active bookings", value: String((bookingsRes.data??[]).length), detail: "in progress", tone: "secondary" },
        { label: "Open complaints", value: String((complaintsRes.data??[]).length), detail: "need review", tone: "destructive" },
        { label: "Revenue (MTD)", value: `₹${(revenue/100).toFixed(0)}`, detail: "paid this month", tone: "accent" },
      ];
      const recentBookings = await resolveBookings(sb, (bookingsRes.data??[]).slice(0,5), "admin");
      return { metrics, recentBookings };
    },
    staleTime: 30_000,
  });
}

async function resolveBookings(sb: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>, rows: any[], viewAs: "customer"|"worker"|"admin"): Promise<Booking[]> {
  if (!sb || !rows.length) return [];
  const serviceIds = [...new Set(rows.map(r=>r.service_id).filter(Boolean))];
  const workerIds = [...new Set(rows.map(r=>r.worker_id).filter(Boolean))];
  const customerIds = [...new Set(rows.map(r=>r.customer_id).filter(Boolean))];
  const addressIds = [...new Set(rows.map(r=>r.address_id).filter(Boolean))];
  const [servicesRes, workersRes, customersRes, addressesRes] = await Promise.all([
    serviceIds.length ? sb.from("services").select("id,name").in("id", serviceIds) : Promise.resolve({data:[]}),
    workerIds.length ? sb.from("profiles").select("id,full_name").in("id", workerIds) : Promise.resolve({data:[]}),
    customerIds.length ? sb.from("profiles").select("id,full_name").in("id", customerIds) : Promise.resolve({data:[]}),
    addressIds.length ? sb.from("addresses").select("id,line1,city").in("id", addressIds) : Promise.resolve({data:[]}),
  ]);
  const svcMap = new Map((servicesRes.data??[]).map((s:any)=>[s.id, s.name]));
  const wMap = new Map((workersRes.data??[]).map((p:any)=>[p.id, p.full_name]));
  const cMap = new Map((customersRes.data??[]).map((p:any)=>[p.id, p.full_name]));
  const aMap = new Map((addressesRes.data??[]).map((a:any)=>[a.id, `${a.line1}, ${a.city}`]));
  return rows.map((b:any) => ({
    id: b.id,
    service: svcMap.get(b.service_id) ?? "Service",
    workerName: wMap.get(b.worker_id) ?? "Worker",
    customerName: cMap.get(b.customer_id) ?? "Customer",
    address: aMap.get(b.address_id) ?? "Address",
    date: toDate(b.scheduled_start),
    time: toTime(b.scheduled_start),
    status: b.status as Booking["status"],
    amount: 0,
  }));
}

// ─── useBookings ──────────────────────────────────────────────────────────────

export function useBookings(role: CWRole, filter?: string) {
  return useQuery<Booking[]>({
    queryKey: ["cw-bookings", role, filter],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return [];
      const { data: auth } = await sb.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      let q = sb.from("bookings").select("id,status,created_at,scheduled_start,service_id,worker_id,customer_id,address_id");
      if (role === "customer") q = q.eq("customer_id", uid);
      else if (role === "worker") q = q.eq("worker_id", uid);
      if (filter && filter !== "all") q = (q as any).eq("status", filter);
      const { data } = await q.order("created_at", { ascending: false }).limit(50);
      return resolveBookings(sb, data ?? [], role === "worker" ? "worker" : role === "cooperative_admin" ? "admin" : "customer");
    },
    staleTime: 20_000,
  });
}

// ─── useWorkers ───────────────────────────────────────────────────────────────

export function useWorkers(search?: string) {
  return useQuery<Worker[]>({
    queryKey: ["cw-workers", search],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return [];
      const { data } = await sb.from("workers").select("profile_id,completed_jobs,verification_status,active,years_experience,profiles(full_name),worker_services(services(name)),addresses(city)").eq("active", true).eq("verification_status", "verified").limit(30);
      return (data ?? []).map((w: any) => ({
        id: w.profile_id,
        name: w.profiles?.full_name ?? "Worker",
        skill: w.worker_services?.[0]?.services?.name ?? "General",
        location: w.addresses?.[0]?.city ?? "—",
        rating: 4.5,
        completedJobs: w.completed_jobs ?? 0,
        status: "available" as const,
        verified: w.verification_status === "verified",
      })).filter((w: Worker) => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.skill.toLowerCase().includes(search.toLowerCase()));
    },
    staleTime: 30_000,
  });
}

// ─── useAdminWorkers ──────────────────────────────────────────────────────────

export function useAdminWorkers(search?: string) {
  return useQuery<Worker[]>({
    queryKey: ["cw-admin-workers", search],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return [];
      const { data } = await sb.from("workers").select("profile_id,completed_jobs,verification_status,active,years_experience,profiles(full_name),worker_services(services(name)),addresses(city)").limit(50);
      return (data ?? []).map((w: any) => ({
        id: w.profile_id,
        name: w.profiles?.full_name ?? "Worker",
        skill: w.worker_services?.[0]?.services?.name ?? "General",
        location: w.addresses?.[0]?.city ?? "—",
        rating: 4.5,
        completedJobs: w.completed_jobs ?? 0,
        status: (w.active ? "available" : "unavailable") as Worker["status"],
        verified: w.verification_status === "verified",
      })).filter((w: Worker) => !search || w.name.toLowerCase().includes(search.toLowerCase()));
    },
    staleTime: 30_000,
  });
}

// ─── useComplaints ────────────────────────────────────────────────────────────

export function useComplaints(role: CWRole) {
  return useQuery<Complaint[]>({
    queryKey: ["cw-complaints", role],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return [];
      const { data: auth } = await sb.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      let q = sb.from("complaints").select("id,subject,body,status,created_at,booking_id");
      if (role === "customer") q = q.eq("submitted_by", uid);
      const { data } = await q.order("created_at", { ascending: false }).limit(30);
      return (data ?? []).map((c: any) => ({
        id: c.id,
        title: c.subject ?? "Complaint",
        description: c.body ?? "",
        status: c.status === "under_review" ? "in_review" : c.status as Complaint["status"],
        date: toDate(c.created_at),
        bookingId: c.booking_id ?? "",
      }));
    },
    staleTime: 20_000,
  });
}

// ─── useAvailability ──────────────────────────────────────────────────────────

export function useAvailability() {
  return useQuery<Availability>({
    queryKey: ["cw-availability"],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      const def: Availability = { monday:false, tuesday:false, wednesday:false, thursday:false, friday:false, saturday:false, sunday:false, startTime:"09:00", endTime:"17:00" };
      if (!sb) return def;
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return def;
      const { data } = await sb.from("worker_availability").select("day_of_week,is_active,starts_at,ends_at").eq("worker_id", auth.user.id);
      if (!data?.length) return def;
      const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
      const result = { ...def };
      for (const row of data) {
        const day = days[row.day_of_week] as keyof Availability;
        if (day && typeof result[day] === "boolean") (result as any)[day] = row.is_active;
        if (row.starts_at) result.startTime = row.starts_at.slice(0,5);
        if (row.ends_at) result.endTime = row.ends_at.slice(0,5);
      }
      return result;
    },
    staleTime: 60_000,
  });
}

// ─── useReviews ───────────────────────────────────────────────────────────────

export function useReviews() {
  return useQuery({
    queryKey: ["cw-reviews"],
    queryFn: async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return [];
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return [];
      const { data } = await sb.from("reviews").select("id,rating,body,created_at,worker_id").eq("worker_id", auth.user.id).order("created_at", { ascending: false }).limit(5);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.body ?? "",
        reviewer: "Customer",
        subject: "Service",
        date: toDate(r.created_at),
      }));
    },
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("Not configured");
      await sb.from("bookings").update({ status } as any).eq("id", bookingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cw-bookings"] });
      qc.invalidateQueries({ queryKey: ["cw-dashboard-summary"] });
    },
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, bookingId }: { title: string; description: string; bookingId?: string }) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("Not configured");
      const { data: auth } = await sb.auth.getUser();
      await sb.from("complaints").insert({ subject: title, body: description, booking_id: bookingId ?? null, submitted_by: auth.user?.id, status: "open" } as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cw-complaints"] }),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, service, date, time, address, description }: { workerId: string; service: string; date: string; time: string; address: string; description: string }) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("Not configured");
      const { data: auth } = await sb.auth.getUser();
      const scheduledStart = new Date(`${date}T${time || "09:00"}:00`).toISOString();
      const scheduledEnd = new Date(new Date(scheduledStart).getTime() + 60 * 60 * 1000).toISOString();
      const { data: svc } = await sb.from("services").select("id").ilike("name", `%${service}%`).limit(1).maybeSingle();
      const { data: addr } = await sb.from("addresses").insert({ profile_id: auth.user?.id, line1: address, city: "—", state: "—" } as any).select("id").single();
      if (svc && addr) {
        await sb.rpc("create_booking_request", {
          target_worker_id: workerId,
          target_service_id: svc.id,
          target_scheduled_start: scheduledStart,
          target_scheduled_end: scheduledEnd,
          target_line1: address,
          target_city: "—",
          target_state: "—",
          target_requirement: description,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cw-bookings"] }),
  });
}

export function useUpdateWorkerVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, verified }: { workerId: string; verified: boolean }) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("Not configured");
      await sb.from("workers").update({ verification_status: verified ? "verified" : "pending" } as any).eq("profile_id", workerId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cw-admin-workers"] }),
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (availability: Availability) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) throw new Error("Not configured");
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return;
      const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const rows = days.map((day, idx) => ({
        worker_id: auth.user!.id,
        day_of_week: idx,
        is_active: (availability as any)[day] ?? false,
        starts_at: availability.startTime + ":00",
        ends_at: availability.endTime + ":00",
      }));
      await sb.from("worker_availability").upsert(rows as any, { onConflict: "worker_id,day_of_week" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cw-availability"] }),
  });
}
