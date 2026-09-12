import { DashboardPreview } from "@/components/home/dashboard-preview";
import { Navbar } from "@/components/layout/navbar";
import { ArrowRight, Check, ChevronRight, MapPin, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import Link from "next/link";
import { getServiceCategories } from "@/features/discovery/data";

const capabilities = [
  { icon: Sparkles, title: "Smart worker matching", body: "Find the right fit using skill, location, availability, experience, ratings, and the details of the job." },
  { icon: MapPin, title: "Local service discovery", body: "Search verified cooperative workers by service and city, with a clear path from first search to profile." },
  { icon: WalletCards, title: "Bookings and payments", body: "Move from a service request to completion, payment, invoice, and review in one connected workflow." },
  { icon: ShieldCheck, title: "Trust for every side", body: "Verified profiles, transparent status updates, reviews, and cooperative oversight create accountability." }
];

const journeys = [
  { label: "Customers", steps: "Find → Match → Book → Pay → Review", body: "A simpler way to get dependable help nearby." },
  { label: "Workers", steps: "Register → Get matched → Work → Earn", body: "More visibility and a stronger digital reputation." },
  { label: "Cooperatives", steps: "Verify → Manage → Monitor → Grow", body: "The operational view to support every member." }
];

export default async function HomePage() {
  const categories = await getServiceCategories();

  return (
    <div className="min-h-screen bg-[#ededed] p-3 font-sans sm:p-4">
      <section className="relative h-[calc(100vh-24px)] min-h-[760px] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
        <video className="pointer-events-none absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="auto" disableRemotePlayback poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60" aria-hidden="true">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative z-10">
          <Navbar overlay />
          <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] shadow-sm"><span className="h-2 w-2 rounded-full bg-[#ef4d23]" />Coops</div>
            <h1 className="mt-5 max-w-4xl font-medium leading-[1.05] tracking-[-0.02em] sm:mt-6" style={{ fontSize: "clamp(36px, 8vw, 72px)" }}>
              Shaping <span className="font-serif italic font-normal">Agencies</span><br />of tomorrow
            </h1>
            <p className="mt-4 px-2 text-neutral-700 sm:mt-6" style={{ fontSize: "clamp(13px, 3.5vw, 16px)" }}>The all-in-one platform connecting customers, workers, and cooperatives</p>
            <Link href="/auth" className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pl-6 pr-2 text-sm text-white sm:mt-8 sm:py-2.5 sm:pl-7">Sign In<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 sm:h-7 sm:w-7"><ChevronRight size={16} /></span></Link>
          </div>
          <div className="px-3 sm:px-4"><DashboardPreview categories={categories.data} /></div>
        </div>
      </section>
      <main>
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4d23]">One connected platform</p><h2 className="mt-4 max-w-lg text-4xl font-medium tracking-tight sm:text-5xl">Every moving part of local service, in one place.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-3xl bg-neutral-300 sm:grid-cols-2">{capabilities.map(({ icon: Icon, title, body }) => <article key={title} className="bg-[#f5f2ee] p-6 sm:p-8"><Icon className="text-[#ef4d23]" size={22} strokeWidth={1.8} /><h3 className="mt-8 text-lg font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-neutral-600">{body}</p></article>)}</div>
          </div>
        </section>

        <section id="about" className="rounded-3xl bg-[#0b0f1a] px-4 py-20 text-white sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4d23]">Built for the ecosystem</p><h2 className="mt-4 max-w-md text-4xl font-medium tracking-tight sm:text-5xl">Trust should move as fast as the work.</h2><p className="mt-6 max-w-md text-sm leading-7 text-neutral-400">CooperativeConnect brings customers, skilled workers, and cooperative teams into the same dependable service loop.</p><Link href="/services" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#ef4d23] px-5 py-3 text-sm font-medium">Explore services <ArrowRight size={16} /></Link></div><div className="grid gap-3">{journeys.map((journey) => <div key={journey.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex sm:items-center sm:justify-between sm:p-6"><div><p className="text-sm font-medium text-[#ef4d23]">{journey.label}</p><p className="mt-2 text-lg">{journey.steps}</p></div><p className="mt-3 max-w-xs text-sm text-neutral-400 sm:mt-0">{journey.body}</p></div>)}</div></div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-28"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4d23]">Start nearby</p><h2 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Services made visible.</h2></div><Link href="/services" className="inline-flex items-center gap-2 text-sm font-medium underline decoration-[#ef4d23] underline-offset-4">Browse all services <ArrowRight size={16} /></Link></div><div className="mt-10 flex flex-wrap gap-3">{categories.data.length ? categories.data.map((category) => <Link key={category.id} href={`/services?category=${category.slug}`} className="rounded-full border border-neutral-300 bg-[#f5f2ee] px-5 py-3 text-sm transition hover:border-[#ef4d23] hover:text-[#ef4d23]">{category.name}</Link>) : <p className="text-sm text-neutral-500">Service categories will appear here once the catalog is connected.</p>}</div></section>

        <section className="mx-0 rounded-3xl bg-[#d9d9d9] px-4 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-4xl text-center"><Check className="mx-auto text-[#ef4d23]" size={24} /><h2 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">A better way to keep good work moving.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-neutral-600">Discover trusted workers, support cooperative livelihoods, and make every booking easier to follow.</p><Link href="/services" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2.5 pl-6 pr-2 text-sm text-white">Get Started <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15"><ChevronRight size={16} /></span></Link></div></section>
        <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-medium text-neutral-800">Coops / CooperativeConnect</span><span>Find. Match. Book. Grow.</span></footer>
      </main>
    </div>
  );
}
