"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Role = "customer" | "worker" | "admin";

const ROLES: Array<{ key: Role; label: string; detail: string; icon: typeof UserRound }> = [
  { key: "customer",  label: "I need a service",   detail: "Find and book trusted local workers.",              icon: UserRound   },
  { key: "worker",    label: "I provide services",  detail: "Manage jobs, availability and earnings.",           icon: Wrench      },
  { key: "admin",     label: "Admin",               detail: "Oversee workers, bookings and the cooperative.",    icon: ShieldCheck },
];

const DEST: Record<Role, string> = {
  customer: "/dashboard",
  worker:   "/worker/dashboard",
  admin:    "/admin/dashboard",
};

const CW_ROLE: Record<Role, string> = {
  customer: "customer",
  worker:   "worker",
  admin:    "cooperative_admin",
};

export function RoleAuthForm() {
  const [step, setStep]       = useState<"pick" | "creds">("pick");
  const [role, setRole]       = useState<Role>("customer");
  const [mode, setMode]       = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setName]   = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = ROLES.find(r => r.key === role)!;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);

    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setMessage("Connect Supabase in .env.local before using authentication.");
      setPending(false);
      return;
    }

    const result = mode === "sign-in"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { data: { full_name: fullName, account_intent: role === "worker" ? "worker" : "customer" } } });

    if (result.error) {
      setMessage(result.error.message);
      setPending(false);
      return;
    }

    if (mode === "sign-up") {
      setMessage("Account created! Check your email then sign in.");
      setMode("sign-in");
      setPending(false);
      return;
    }

    // Store CoopWork role in localStorage so the dashboard sidebar renders correctly
    if (typeof window !== "undefined") {
      window.localStorage.setItem("coopwork-role", CW_ROLE[role]);
    }

    // Verify worker profile exists before sending to worker dashboard
    if (role === "worker") {
      const { data: auth } = await sb.auth.getUser();
      if (auth.user) {
        const { data: worker } = await sb.from("workers").select("id").eq("profile_id", auth.user.id).maybeSingle();
        if (!worker) {
          window.location.assign("/onboarding/worker");
          return;
        }
      }
    }

    window.location.assign(DEST[role]);
  }

  /* ── Step 1: role picker ──────────────────────────────────────────── */
  if (step === "pick") {
    return (
      <div className="w-full max-w-lg">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4d23]">Welcome to Coops</p>
        <h1 className="mt-3 text-center text-4xl font-medium tracking-tight text-neutral-900">How are you joining?</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-neutral-500">
          Choose your role to get the right dashboard after signing in.
        </p>

        <div className="mt-8 grid gap-3">
          {ROLES.map(({ key, label, detail, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                role === key
                  ? "border-[#ef4d23] bg-white shadow-sm"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role === key ? "bg-[#ef4d23] text-white" : "bg-neutral-100 text-neutral-500"}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${role === key ? "text-neutral-900" : "text-neutral-700"}`}>{label}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{detail}</p>
              </div>
              {role === key && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ef4d23] text-white">
                  <Check size={14} />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setStep("creds")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b0f1a] py-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Continue as {selected.label} <ArrowRight size={16} />
        </button>

        <Link href="/" className="mt-5 block text-center text-xs text-neutral-400 underline underline-offset-4">
          Back to home
        </Link>
      </div>
    );
  }

  /* ── Step 2: email + password ─────────────────────────────────────── */
  return (
    <div className="w-full max-w-md">
      {/* Role chip */}
      <button
        type="button"
        onClick={() => setStep("pick")}
        className="mb-6 flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 shadow-sm hover:border-[#ef4d23] hover:text-[#ef4d23] transition"
      >
        ← Change role &nbsp;·&nbsp;
        <span className="font-semibold text-[#ef4d23]">{selected.label}</span>
      </button>

      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex gap-5 border-b border-neutral-200 text-sm">
          <button type="button" onClick={() => setMode("sign-in")} className={`border-b-2 pb-3 font-medium ${mode === "sign-in" ? "border-[#ef4d23] text-neutral-900" : "border-transparent text-neutral-400"}`}>Sign in</button>
          <button type="button" onClick={() => setMode("sign-up")} className={`border-b-2 pb-3 font-medium ${mode === "sign-up" ? "border-[#ef4d23] text-neutral-900" : "border-transparent text-neutral-400"}`}>Create account</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "sign-up" && (
            <label className="block text-sm text-neutral-700">
              Full name
              <input required value={fullName} onChange={e => setName(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" />
            </label>
          )}
          <label className="block text-sm text-neutral-700">
            Email
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" />
          </label>
          <label className="block text-sm text-neutral-700">
            Password
            <input required minLength={6} type="password" value={password} onChange={e => setPass(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" />
          </label>

          {message && (
            <p role="status" className="rounded-xl bg-[#f5f2ee] px-3 py-2 text-sm text-neutral-600">{message}</p>
          )}

          <button disabled={pending} type="submit" className="w-full rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-neutral-800 transition">
            {pending ? "Working…" : mode === "sign-in" ? `Sign in as ${selected.label}` : "Create account"}
          </button>
        </form>
      </div>

      <Link href="/" className="mt-5 block text-center text-xs text-neutral-400 underline underline-offset-4">Back to home</Link>
    </div>
  );
}