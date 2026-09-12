"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CalendarClock, Check, CircleAlert, CircleDollarSign,
  ClipboardList, Clock3, FileWarning, MapPin, Plus, Search,
  ShieldCheck, Star, UserRound, UsersRound, Wrench, X,
} from "lucide-react";
import { AppShell, PageLoading, PageError, StatusBadge, Avatar, EmptyState } from "./app-shell";
import {
  useSession, useDashboardSummary, useBookings, useWorkers, useComplaints,
  useAvailability, useReviews, useAdminWorkers,
  useUpdateBookingStatus, useCreateComplaint, useCreateBooking,
  useUpdateAvailability, useUpdateWorkerVerification,
  type Booking, type Worker, type Complaint, type Availability, type CWRole,
} from "./hooks";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  if (!date) return "TBD";
  const d = new Date(date);
  return isNaN(d.valueOf()) ? date : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function amount(v: number) { return `₹${Number(v || 0).toFixed(2)}`; }

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string; detail: string; tone: string }> }) {
  const chartColors = ["hsl(184 38% 22%)","hsl(39 83% 63%)","hsl(174 32% 56%)","hsl(2 68% 52%)"];
  return (
    <div className="metric-grid">
      {metrics.map((m, i) => (
        <div className="panel metric-card" key={m.label} style={{ ["--metric-color" as string]: chartColors[i % 4] }}>
          <div className="metric-kicker"><span className="metric-dot" />  {m.label}</div>
          <div className="metric-value">{m.value}</div>
          <div className="metric-detail">{m.detail}</div>
        </div>
      ))}
    </div>
  );
}

function BookingRow({ booking, workerView = false, onCancel }: { booking: Booking; workerView?: boolean; onCancel?: (id: string) => void }) {
  const personName = workerView ? booking.customerName : booking.workerName;
  const initials = personName?.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase() || "CW";
  return (
    <div className="list-row">
      <Avatar initials={initials} />
      <div className="list-main">
        <strong>{booking.service}</strong>
        <span>{personName} · {booking.address}</span>
      </div>
      <div className="row-end">
        <strong>{formatDate(booking.date)}</strong>
        <span>{booking.time}</span>
      </div>
      <StatusBadge status={booking.status} />
      {onCancel && ["pending","accepted"].includes(booking.status) && (
        <button className="icon-btn" onClick={() => onCancel(booking.id)} aria-label="Cancel">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function RecentBookings({ bookings, workerView = false, onCancel }: { bookings?: Booking[]; workerView?: boolean; onCancel?: (id: string) => void }) {
  const safe = Array.isArray(bookings) ? bookings : [];
  return (
    <div className="panel panel-pad">
      <div className="section-head">
        <h2 className="section-title">Recent bookings</h2>
        <Link href={workerView ? "/worker/bookings" : "/bookings"} className="section-link">
          See all <ArrowRight size={12} className="inline" />
        </Link>
      </div>
      {safe.length ? safe.slice(0,5).map(b => (
        <BookingRow key={b.id} booking={b} workerView={workerView} onCancel={onCancel} />
      )) : (
        <EmptyState icon={CalendarClock} title="No bookings yet" message={workerView ? "Accepted jobs appear here." : "Book a local worker when you need a hand."} />
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ role }: { role: CWRole }) {
  const summaryQ = useDashboardSummary(role);
  const updateStatus = useUpdateBookingStatus();
  const isWorker = role === "worker";
  const isAdmin = role === "cooperative_admin";

  if (summaryQ.isLoading) return <AppShell><PageLoading /></AppShell>;
  if (summaryQ.isError) return <AppShell><PageError /></AppShell>;

  const summary = summaryQ.data;
  const bookings = Array.isArray(summary?.recentBookings) ? summary.recentBookings : [];

  const title = isAdmin ? "Network pulse" : isWorker ? "Ready when you are" : "Good morning";
  const subtitle = isAdmin ? "A clear view of the cooperative, today." : isWorker ? "Your next useful thing is right here." : "Here is what is happening with your services.";

  const cancelBooking = (id: string) => updateStatus.mutate({ bookingId: id, status: "cancelled" });

  return (
    <AppShell>
      <main className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">{isAdmin ? "Operations / today" : isWorker ? "Your workspace" : "Customer workspace"}</p>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
          {!isAdmin && (
            <Link href={isWorker ? "/worker/requests" : "/services"} className="btn btn-primary">
              {isWorker ? "Review requests" : "Book a service"} <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <MetricGrid metrics={summary?.metrics || []} />
        <div className="two-col">
          <RecentBookings bookings={bookings} workerView={isWorker} onCancel={!isWorker && !isAdmin ? cancelBooking : undefined} />
          <div className="stack">
            <div className="panel panel-pad">
              <div className="section-head">
                <h2 className="section-title">{isAdmin ? "Network note" : "Next up"}</h2>
                <CircleAlert size={16} style={{ color: "hsl(190 12% 45%)" }} />
              </div>
              <div className="callout">
                <Clock3 size={17} />
                <span>
                  {bookings[0] ? (
                    <><strong>{bookings[0].service}</strong> is {bookings[0].status.replaceAll("_"," ")} for {formatDate(bookings[0].date)}.</>
                  ) : "Nothing needs your attention right now."}
                </span>
              </div>
              <div className="stack" style={{ marginTop: 16 }}>
                <div className="list-row">
                  <div className="empty-icon" style={{ width:30, height:30, margin:0 }}><ShieldCheck size={15} /></div>
                  <div className="list-main"><strong>Trusted local network</strong><span>People-powered services, coordinated nearby.</span></div>
                </div>
                <div className="list-row">
                  <div className="empty-icon" style={{ width:30, height:30, margin:0 }}><MapPin size={15} /></div>
                  <div className="list-main"><strong>Cooperative {isAdmin ? "control" : "support"}</strong><span>Questions are handled by a real person.</span></div>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="panel panel-pad">
                <div className="section-head"><h2 className="section-title">Admin shortcuts</h2></div>
                <div className="stack">
                  <Link className="btn btn-ghost justify-between" href="/admin/workers">Review worker verification <ArrowRight size={14} /></Link>
                  <Link className="btn btn-ghost justify-between" href="/admin/bookings">View booking activity <ArrowRight size={14} /></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export function CustomerDashboard() { return <Dashboard role="customer" />; }
export function WorkerDashboard() { return <Dashboard role="worker" />; }
export function AdminDashboard() { return <Dashboard role="cooperative_admin" />; }

// ── BookingModal ──────────────────────────────────────────────────────────────

function BookingModal({ worker, close }: { worker: Worker; close: () => void }) {
  const createBooking = useCreateBooking();
  const [form, setForm] = useState({ service: worker.skill, date: "", time: "", address: "", description: "" });
  const update = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    createBooking.mutate({ workerId: worker.id, ...form }, { onSuccess: close });
  };
  return (
    <div className="cw-dialog-overlay" role="dialog" aria-modal="true">
      <div className="panel form-card w-full p-5 max-h-[90vh] overflow-auto">
        <div className="section-head">
          <div><p className="eyebrow">New booking</p><h2 className="section-title" style={{ fontSize: 20 }}>Book {worker.name}</h2></div>
          <button className="icon-btn" onClick={close} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full"><label>Service</label><input className="field-input" value={form.service} onChange={e => update("service", e.target.value)} required /></div>
            <div className="field"><label>Date</label><input className="field-input" type="date" value={form.date} onChange={e => update("date", e.target.value)} required /></div>
            <div className="field"><label>Time</label><input className="field-input" type="time" value={form.time} onChange={e => update("time", e.target.value)} required /></div>
            <div className="field full"><label>Address</label><input className="field-input" value={form.address} onChange={e => update("address", e.target.value)} required /></div>
            <div className="field full"><label>Description</label><textarea className="field-textarea" value={form.description} onChange={e => update("description", e.target.value)} rows={3} /></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createBooking.isPending}>{createBooking.isPending ? "Booking…" : "Confirm booking"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ServicesPage ──────────────────────────────────────────────────────────────

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState<Worker | null>(null);
  const workersQ = useWorkers(search);
  const workers = Array.isArray(workersQ.data) ? workersQ.data : [];
  return (
    <AppShell>
      <main className="page">
        <div className="page-head">
          <div><p className="eyebrow">Customer workspace</p><h1 className="page-title">Find a service</h1><p className="page-subtitle">Browse verified cooperative workers near you.</p></div>
        </div>
        <div className="toolbar">
          <div className="search-box"><Search size={14} /><input placeholder="Search by name or skill…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        {workersQ.isLoading ? <PageLoading /> : workers.length === 0 ? (
          <EmptyState icon={Wrench} title="No workers found" message="Try a different search term." />
        ) : (
          <div className="three-col">
            {workers.map(w => (
              <div key={w.id} className="panel panel-pad stack">
                <div className="flex items-center gap-3">
                  <Avatar initials={w.name.slice(0,2).toUpperCase()} />
                  <div className="list-main"><strong>{w.name}</strong><span>{w.skill} · {w.location}</span></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Star size={12} style={{ color: "#ca8a16" }} /> {w.rating} · {w.completedJobs} jobs
                  <StatusBadge status={w.status} />
                </div>
                <button className="btn btn-primary w-full" onClick={() => setBooking(w)}>Book now <ArrowRight size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {booking && <BookingModal worker={booking} close={() => setBooking(null)} />}
      </main>
    </AppShell>
  );
}

// ── BookingsPage ──────────────────────────────────────────────────────────────

export function BookingsPage({ workerView = false, adminView = false }: { workerView?: boolean; adminView?: boolean }) {
  const role: CWRole = adminView ? "cooperative_admin" : workerView ? "worker" : "customer";
  const [filter, setFilter] = useState("all");
  const bookingsQ = useBookings(role, filter === "all" ? undefined : filter);
  const updateStatus = useUpdateBookingStatus();
  const bookings = Array.isArray(bookingsQ.data) ? bookingsQ.data : [];
  return (
    <AppShell>
      <main className="page">
        <div className="page-head">
          <div><p className="eyebrow">{adminView ? "Admin" : workerView ? "Worker workspace" : "Customer workspace"}</p><h1 className="page-title">Bookings</h1></div>
        </div>
        <div className="toolbar">
          {(["all","requested","accepted","confirmed","in_progress","completed","cancelled"] as const).map(s => (
            <button key={s} className={`btn ${filter === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(s)} style={{ minHeight: 32, padding: "6px 12px", fontSize: 11 }}>
              {s.replaceAll("_"," ")}
            </button>
          ))}
        </div>
        {bookingsQ.isLoading ? <PageLoading /> : bookings.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No bookings" message="Bookings matching this filter will appear here." />
        ) : (
          <div className="panel panel-pad">
            {bookings.map(b => (
              <BookingRow key={b.id} booking={b} workerView={workerView || adminView}
                onCancel={!workerView && !adminView ? (id) => updateStatus.mutate({ bookingId: id, status: "cancelled" }) : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

// ── ComplaintsPage ────────────────────────────────────────────────────────────

export function ComplaintsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const complaintsQ = useComplaints("customer");
  const createComplaint = useCreateComplaint();
  const complaints = Array.isArray(complaintsQ.data) ? complaintsQ.data : [];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    createComplaint.mutate({ title: form.title, description: form.description }, { onSuccess: () => { setShowForm(false); setForm({ title:"", description:"" }); } });
  };
  return (
    <AppShell>
      <main className="page">
        <div className="page-head">
          <div><p className="eyebrow">Customer workspace</p><h1 className="page-title">Complaints</h1></div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}><Plus size={14} /> New complaint</button>
        </div>
        {showForm && (
          <div className="panel panel-pad form-card" style={{ marginBottom: 20 }}>
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field full"><label>Title</label><input className="field-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="field full"><label>Description</label><textarea className="field-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required /></div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createComplaint.isPending}>{createComplaint.isPending ? "Submitting…" : "Submit"}</button>
              </div>
            </form>
          </div>
        )}
        {complaintsQ.isLoading ? <PageLoading /> : complaints.length === 0 ? (
          <EmptyState icon={FileWarning} title="No complaints" message="Your complaints will appear here." />
        ) : (
          <div className="panel panel-pad">
            {complaints.map(c => (
              <div key={c.id} className="list-row">
                <div className="list-main"><strong>{c.title}</strong><span>{c.description?.slice(0,80)} · {formatDate(c.date)}</span></div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

// ── RequestsPage (worker job requests) ───────────────────────────────────────

export function RequestsPage() {
  const bookingsQ = useBookings("worker", "requested");
  const updateStatus = useUpdateBookingStatus();
  const requests = Array.isArray(bookingsQ.data) ? bookingsQ.data : [];
  return (
    <AppShell>
      <main className="page">
        <div className="page-head"><div><p className="eyebrow">Worker workspace</p><h1 className="page-title">Job requests</h1><p className="page-subtitle">Pending requests waiting for your response.</p></div></div>
        {bookingsQ.isLoading ? <PageLoading /> : requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No pending requests" message="New job requests will appear here." />
        ) : (
          <div className="panel panel-pad">
            {requests.map(b => (
              <div key={b.id} className="list-row">
                <Avatar initials={b.customerName.slice(0,2).toUpperCase()} />
                <div className="list-main"><strong>{b.service}</strong><span>{b.customerName} · {b.address} · {formatDate(b.date)}</span></div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-primary" style={{ minHeight:32, padding:"6px 12px", fontSize:11 }} onClick={() => updateStatus.mutate({ bookingId: b.id, status: "accepted" })}>Accept</button>
                  <button className="btn btn-danger" style={{ minHeight:32, padding:"6px 12px", fontSize:11 }} onClick={() => updateStatus.mutate({ bookingId: b.id, status: "cancelled" })}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

// ── AvailabilityPage ──────────────────────────────────────────────────────────

export function AvailabilityPage() {
  const availQ = useAvailability();
  const updateAvail = useUpdateAvailability();
  const [avail, setAvail] = useState<Availability | null>(null);
  const current = avail ?? availQ.data;
  const days: Array<keyof Availability> = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const toggle = (day: keyof Availability) => {
    if (!current) return;
    const updated = { ...current, [day]: !current[day] };
    setAvail(updated);
    updateAvail.mutate(updated);
  };
  if (availQ.isLoading || !current) return <AppShell><PageLoading /></AppShell>;
  return (
    <AppShell>
      <main className="page">
        <div className="page-head"><div><p className="eyebrow">Worker workspace</p><h1 className="page-title">Availability</h1><p className="page-subtitle">Set the days and hours you are available for work.</p></div></div>
        <div className="panel panel-pad form-card">
          <div className="calendar-grid" style={{ marginBottom: 24 }}>
            {days.map(day => (
              <button key={day} className={`day-toggle${current[day] ? " selected" : ""}`} onClick={() => toggle(day)} title={day}>
                {day.slice(0,3).toUpperCase()}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <div className="field"><label>Start time</label>
              <input className="field-input" type="time" value={current.startTime} onChange={e => { const u = {...current!, startTime: e.target.value}; setAvail(u); updateAvail.mutate(u); }} />
            </div>
            <div className="field"><label>End time</label>
              <input className="field-input" type="time" value={current.endTime} onChange={e => { const u = {...current!, endTime: e.target.value}; setAvail(u); updateAvail.mutate(u); }} />
            </div>
          </div>
          <div className="callout" style={{ marginTop: 18 }}><ShieldCheck size={15} /><span>Changes are saved automatically.</span></div>
        </div>
      </main>
    </AppShell>
  );
}

// ── EarningsPage ──────────────────────────────────────────────────────────────

export function EarningsPage() {
  const summaryQ = useDashboardSummary("worker");
  const bookingsQ = useBookings("worker", "completed");
  const bookings = Array.isArray(bookingsQ.data) ? bookingsQ.data : [];
  const metrics = summaryQ.data?.metrics ?? [];
  const earningsMetric = metrics.find(m => m.label === "Earnings (MTD)");
  return (
    <AppShell>
      <main className="page">
        <div className="page-head"><div><p className="eyebrow">Worker workspace</p><h1 className="page-title">Earnings</h1></div></div>
        <div className="panel panel-pad earnings-hero" style={{ marginBottom: 18 }}>
          <p className="eyebrow" style={{ color: "rgba(253,246,230,.6)" }}>Month to date</p>
          <div className="earnings-amount">{earningsMetric?.value ?? "₹0"}</div>
          <p style={{ color: "rgba(253,246,230,.7)", fontSize: 12, marginTop: 8 }}>from {bookings.length} completed jobs</p>
        </div>
        {summaryQ.isLoading ? <PageLoading /> : <MetricGrid metrics={metrics} />}
        <div className="panel panel-pad">
          <div className="section-head"><h2 className="section-title">Completed jobs</h2></div>
          {bookings.length === 0 ? (
            <EmptyState icon={CircleDollarSign} title="No completed jobs" message="Earnings from completed bookings appear here." />
          ) : bookings.map(b => (
            <div key={b.id} className="list-row">
              <Avatar initials={b.customerName.slice(0,2).toUpperCase()} />
              <div className="list-main"><strong>{b.service}</strong><span>{b.customerName} · {formatDate(b.date)}</span></div>
              <div className="row-end"><strong>{amount(b.amount)}</strong><StatusBadge status={b.status} /></div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

// ── AdminWorkersPage ──────────────────────────────────────────────────────────

export function AdminWorkersPage() {
  const [search, setSearch] = useState("");
  const workersQ = useAdminWorkers(search);
  const updateVerification = useUpdateWorkerVerification();
  const workers = Array.isArray(workersQ.data) ? workersQ.data : [];
  return (
    <AppShell>
      <main className="page">
        <div className="page-head"><div><p className="eyebrow">Admin</p><h1 className="page-title">Workers</h1><p className="page-subtitle">Manage and verify cooperative workers.</p></div></div>
        <div className="toolbar">
          <div className="search-box"><Search size={14} /><input placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        {workersQ.isLoading ? <PageLoading /> : workers.length === 0 ? (
          <EmptyState icon={UsersRound} title="No workers found" message="Workers will appear here once added." />
        ) : (
          <div className="panel table-wrap">
            <table className="data-table">
              <thead><tr><th>Worker</th><th>Skill</th><th>Location</th><th>Jobs</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id}>
                    <td><div className="table-person"><Avatar initials={w.name.slice(0,2).toUpperCase()} /><div><strong>{w.name}</strong></div></div></td>
                    <td>{w.skill}</td>
                    <td>{w.location}</td>
                    <td style={{ fontFamily: "var(--cw-font-mono, monospace)" }}>{w.completedJobs}</td>
                    <td><StatusBadge status={w.verified ? "accepted" : "pending"} /></td>
                    <td>
                      <button className={`btn ${w.verified ? "btn-ghost btn-danger" : "btn-primary"}`} style={{ minHeight:30, padding:"5px 11px", fontSize:11 }}
                        onClick={() => updateVerification.mutate({ workerId: w.id, verified: !w.verified })}>
                        {w.verified ? "Revoke" : "Verify"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppShell>
  );
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const sessionQ = useSession();
  const reviewsQ = useReviews();
  const session = sessionQ.data;
  const reviews = Array.isArray(reviewsQ.data) ? reviewsQ.data : [];
  if (sessionQ.isLoading) return <AppShell><PageLoading /></AppShell>;
  return (
    <AppShell>
      <main className="page">
        <div className="page-head"><div><p className="eyebrow">Shared account</p><h1 className="page-title">Profile</h1><p className="page-subtitle">The details your cooperative uses to keep work personal.</p></div></div>
        <div className="two-col">
          <div className="stack">
            <div className="panel panel-pad">
              <div className="flex items-center gap-4">
                <div className="avatar" style={{ width:58, height:58, borderRadius:16, fontSize:16 }}>{session?.name?.slice(0,2).toUpperCase()||"CW"}</div>
                <div><h2 className="font-display text-2xl tracking-tight">{session?.name||"Your profile"}</h2><p className="text-xs text-muted-foreground mt-1">{session?.email}</p></div>
              </div>
              <div className="form-grid" style={{ marginTop:25 }}>
                <div className="field"><label>Full name</label><input className="field-input" defaultValue={session?.name||""} /></div>
                <div className="field"><label>Email</label><input className="field-input" defaultValue={session?.email||""} type="email" /></div>
                <div className="field"><label>Role</label><input className="field-input" value={session?.role||"customer"} readOnly /></div>
                <div className="field"><label>Cooperative ID</label><input className="field-input font-mono-app" value={session?.cooperativeId||"—"} readOnly /></div>
              </div>
              <div className="form-actions"><button className="btn btn-primary" onClick={() => window.alert("Profile details are managed by your cooperative admin.")}>Save changes</button></div>
            </div>
            <div className="callout"><ShieldCheck size={17} /><span>Your profile is visible only to the cooperative members who need it to coordinate a service.</span></div>
          </div>
          <div className="panel panel-pad">
            <div className="section-head"><h2 className="section-title">Recent feedback</h2><Star size={16} /></div>
            {reviews.length ? reviews.map(r => (
              <div key={r.id} className="review-card border-b">
                <div className="flex justify-between"><strong className="text-xs">{(r as any).reviewer}</strong><span className="stars">{"★".repeat(r.rating)}</span></div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">&quot;{(r as any).comment}&quot;</p>
              </div>
            )) : <EmptyState icon={Star} title="No feedback yet" message="Reviews appear here after completed work." />}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
