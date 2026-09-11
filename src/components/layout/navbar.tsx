"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Globe, Menu, User, X } from "lucide-react";
import { useEffect, useState, type PointerEvent } from "react";
import { NotificationInbox } from "@/components/layout/notification-inbox";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/context";
import { type Locale, supportedLocales } from "@/lib/i18n/messages";

const baseLinks: Array<{ labelKey: string; defaultLabel: string; href: Route }> = [
  { labelKey: "nav.home", defaultLabel: "Home", href: "/" },
  { labelKey: "nav.services", defaultLabel: "Services", href: "/services" },
  { labelKey: "nav.bookings", defaultLabel: "Bookings", href: "/bookings" },
  { labelKey: "nav.dashboard", defaultLabel: "Dashboard", href: "/dashboard" }
];

function FlowerMark() {
  const petals = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    return <circle key={index} cx={16 + Math.cos(angle) * 10} cy={16 + Math.sin(angle) * 10} r="3.5" />;
  });

  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6 sm:h-7 sm:w-7" aria-label="Coops">
      <g fill="#ef4d23">
        {petals}
        <circle cx="16" cy="16" r="3.5" />
      </g>
    </svg>
  );
}

export function Navbar({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { locale, setLocale, t } = useTranslation();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) {
        void supabase.from("profile_roles").select("role").eq("profile_id", data.user.id).then(({ data: roles }) => {
          const roleList = roles?.map((r) => r.role) ?? [];
          setIsAdmin(roleList.includes("platform_admin") || roleList.includes("cooperative_admin"));
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  function moveCursor(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCursor({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: true });
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUserEmail(null);
      window.location.href = "/";
    }
  }

  return (
    <div className="relative z-30 flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav
        className={`relative flex w-full items-center rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-1.5 shadow-sm transition-transform duration-300 ease-out md:w-fit ${cursor.active ? "md:scale-[1.01]" : ""}`}
        onPointerMove={moveCursor}
        onPointerLeave={() => setCursor((value) => ({ ...value, active: false }))}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 hidden h-5 w-5 rounded-full bg-[#ef4d23]/15 transition-[opacity,transform] duration-300 ease-out md:block ${cursor.active ? "opacity-100" : "opacity-0"}`}
          style={{ transform: `translate(${cursor.x - 10}px, ${cursor.y - 10}px) scale(${cursor.active ? 2.4 : 0.6})` }}
        />
        <Link href="/" className="shrink-0" aria-label="Coops home">
          <FlowerMark />
        </Link>
        <div className="ml-3 hidden items-center gap-3 text-[13px] md:flex">
          {baseLinks.map((link) => (
            <Link key={link.href} href={link.href as Route} className="group inline-flex items-center gap-2 text-neutral-700 transition hover:text-[#ef4d23]">
              {link.href === "/" ? <span className="h-1.5 w-1.5 rounded-full bg-[#ef4d23]" /> : null}
              {t(link.labelKey) !== link.labelKey ? t(link.labelKey) : link.defaultLabel}
            </Link>
          ))}
          {userEmail ? (
            <>
              <Link href={"/payments" as Route} className="text-neutral-700 transition hover:text-[#ef4d23]">Payments</Link>
              <Link href={"/invoices" as Route} className="text-neutral-700 transition hover:text-[#ef4d23]">Invoices</Link>
            </>
          ) : null}
          {isAdmin ? (
            <>
              <Link href={"/admin" as Route} className="text-neutral-700 font-medium transition hover:text-[#ef4d23]">Admin</Link>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-4">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Globe size={14} aria-hidden="true" />
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="bg-transparent text-xs font-medium uppercase text-neutral-600 outline-none cursor-pointer"
            >
              {supportedLocales.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <NotificationInbox />

          {userEmail ? (
            <div className="hidden items-center gap-2 text-xs text-neutral-600 sm:flex">
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700">
                <User size={12} />
                {userEmail.split("@")[0]}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2 py-1.5 text-xs text-neutral-500 transition hover:text-[#ef4d23]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href={"/auth" as Route} className="hidden px-2 py-1.5 text-[13px] text-neutral-600 transition hover:text-[#ef4d23] sm:block">
              {t("nav.signIn")}
            </Link>
          )}

          <Link href={"/auth?next=/services" as Route} className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23] py-1.5 pl-3.5 pr-1.5 text-xs font-medium text-white sm:pl-4 sm:text-[13px]">
            <span>{t("actions.tryItOut")}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><ChevronRight size={13} /></span>
          </Link>
          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-800 md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {open ? (
          <div className="absolute left-2 right-2 top-full mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:hidden">
            {baseLinks.map((link) => (
              <Link key={link.href} href={link.href as Route} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50">
                {t(link.labelKey) !== link.labelKey ? t(link.labelKey) : link.defaultLabel}
              </Link>
            ))}
            {userEmail ? (
              <>
                <Link href={"/payments" as Route} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50">Payments</Link>
                <Link href={"/invoices" as Route} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50">Invoices</Link>
                {isAdmin ? (
                  <>
                    <Link href={"/admin" as Route} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50">Admin</Link>
                  </>
                ) : null}
                <button type="button" onClick={() => { setOpen(false); void handleSignOut(); }} className="w-full text-left rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50">Sign out</button>
              </>
            ) : (
              <Link href={"/auth" as Route} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50">
                {t("nav.signIn")}
              </Link>
            )}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
